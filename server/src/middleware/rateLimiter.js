/**
 * Rate Limiter Middleware
 *
 * Core middleware that enforces rate-limit rules using a sliding window
 * counter algorithm backed by MongoDB.
 *
 * For each incoming request:
 * 1. Extract identity values (IP, domain, user)
 * 2. Query active rules
 * 3. For each applicable rule, check/increment counter atomically
 * 4. If any rule is breached, reject with 429
 * 5. Otherwise, allow the request through
 */

const Rule = require('../models/Rule');
const RequestLog = require('../models/RequestLog');
const { notifyBreach } = require('../services/notificationService');
const {
  getWindowStart,
  getWindowDuration,
  extractIdentity,
} = require('../utils/helpers');

/**
 * Creates the rate limiter middleware function.
 *
 * @returns {Function} Express middleware
 */
function rateLimiter() {
  return async (req, res, next) => {
    try {
      // 1. Fetch active rules (or target specific rule if requested via header)
      const targetRuleId = req.headers['x-target-rule-id'];
      const query = { active: true };
      if (targetRuleId) {
        query._id = targetRuleId;
      }

      const rules = await Rule.find(query).lean();

      if (!rules || rules.length === 0) {
        return next(); // No rules configured/matched, allow through
      }

      // 2. Check each rule
      for (const rule of rules) {
        const identityValue = extractIdentity(req, rule.identityType);

        // Skip rule if identity cannot be determined
        if (!identityValue) {
          continue;
        }

        const now = new Date();
        const currentWindowStart = getWindowStart(rule.period, now);
        const windowDuration = getWindowDuration(rule.period);
        const previousWindowStart = new Date(
          currentWindowStart.getTime() - windowDuration
        );

        // 3. Get or create the current window counter (atomic upsert + increment)
        const currentCounter = await RequestLog.findOneAndUpdate(
          {
            ruleId: rule._id,
            identityValue,
            windowStart: currentWindowStart,
          },
          {
            $inc: { count: 1 },
            $setOnInsert: {
              expiresAt: new Date(
                currentWindowStart.getTime() + windowDuration * 2
              ),
            },
          },
          { upsert: true, new: true }
        );

        // 4. Get the previous window counter (for sliding window calculation)
        const previousCounter = await RequestLog.findOne({
          ruleId: rule._id,
          identityValue,
          windowStart: previousWindowStart,
        }).lean();

        // 5. Calculate sliding window count
        const elapsedInCurrentWindow =
          now.getTime() - currentWindowStart.getTime();
        const overlapRatio = 1 - elapsedInCurrentWindow / windowDuration;
        const previousCount = previousCounter ? previousCounter.count : 0;
        const slidingWindowCount =
          Math.floor(previousCount * overlapRatio) + currentCounter.count;

        // 6. Check if limit is exceeded
        if (slidingWindowCount > rule.maxRequests) {
          // Calculate retry-after in seconds
          const retryAfter = Math.ceil(
            (windowDuration - elapsedInCurrentWindow) / 1000
          );

          // Trigger notification (async, don't await to avoid blocking response)
          notifyBreach({
            ruleId: rule._id,
            ruleName: rule.name,
            identityType: rule.identityType,
            identityValue,
            period: rule.period,
            maxRequests: rule.maxRequests,
            actualCount: slidingWindowCount,
          }).catch((err) =>
            console.error('[RATE_LIMITER] Notification error:', err.message)
          );

          res.set('Retry-After', String(retryAfter));
          res.set('X-RateLimit-Limit', String(rule.maxRequests));
          res.set('X-RateLimit-Remaining', '0');
          res.set(
            'X-RateLimit-Reset',
            new Date(
              currentWindowStart.getTime() + windowDuration
            ).toISOString()
          );

          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded for rule: ${rule.name}`,
            rule: {
              name: rule.name,
              identityType: rule.identityType,
              period: rule.period,
              maxRequests: rule.maxRequests,
            },
            retryAfter,
          });
        }

        // Set rate-limit headers for successful requests
        res.set('X-RateLimit-Limit', String(rule.maxRequests));
        res.set(
          'X-RateLimit-Remaining',
          String(Math.max(0, rule.maxRequests - slidingWindowCount))
        );
        res.set(
          'X-RateLimit-Reset',
          new Date(
            currentWindowStart.getTime() + windowDuration
          ).toISOString()
        );

        // Attach rateLimit info to request object for downstream route handlers
        req.rateLimit = {
          ruleName: rule.name,
          identityType: rule.identityType,
          period: rule.period,
          limit: rule.maxRequests,
          remaining: Math.max(0, rule.maxRequests - slidingWindowCount),
          currentCount: slidingWindowCount,
          reset: new Date(
            currentWindowStart.getTime() + windowDuration
          ).toISOString(),
        };
      }

      next();
    } catch (error) {
      // Fail open — if rate limiter encounters an error, allow the request
      console.error('[RATE_LIMITER] Error:', error.message);
      next();
    }
  };
}

module.exports = rateLimiter;
