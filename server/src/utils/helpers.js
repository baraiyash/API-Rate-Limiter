/**
 * Utility helpers for the rate limiter system.
 */

/**
 * Window duration in milliseconds for each period type.
 */
const WINDOW_DURATIONS = {
  minute: 60 * 1000,        // 60,000 ms
  hour: 60 * 60 * 1000,     // 3,600,000 ms
  day: 24 * 60 * 60 * 1000, // 86,400,000 ms
};

/**
 * Get the start of the current time window for a given period.
 * Windows are aligned to natural boundaries (start of minute, hour, day).
 *
 * @param {string} period - 'minute', 'hour', or 'day'
 * @param {Date} [now] - Optional reference time (defaults to current time)
 * @returns {Date} Start of the current window
 */
function getWindowStart(period, now = new Date()) {
  const date = new Date(now);

  switch (period) {
    case 'minute':
      date.setSeconds(0, 0);
      break;
    case 'hour':
      date.setMinutes(0, 0, 0);
      break;
    case 'day':
      date.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error(`Invalid period: ${period}`);
  }

  return date;
}

/**
 * Get the window duration in milliseconds for a given period.
 *
 * @param {string} period - 'minute', 'hour', or 'day'
 * @returns {number} Duration in milliseconds
 */
function getWindowDuration(period) {
  const duration = WINDOW_DURATIONS[period];
  if (!duration) {
    throw new Error(`Invalid period: ${period}`);
  }
  return duration;
}

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rate-limiter-default-jwt-secret';

/**
 * Extract the identity value from a request based on the identity type.
 * Supports:
 * - 'ip': req.ip, x-forwarded-for, connection.remoteAddress
 * - 'domain': X-Domain header, Origin header, req.hostname
 * - 'user': JWT Authorization header (Bearer <token>), req.user, or X-User-Id header
 *
 * @param {object} req - Express request object
 * @param {string} identityType - 'ip', 'domain', or 'user'
 * @returns {string|null} The identity value, or null if not available
 */
function extractIdentity(req, identityType) {
  switch (identityType) {
    case 'ip': {
      // 1. Check custom IP simulation or proxy headers
      const customIp = req.headers['x-custom-ip'] || req.headers['x-client-ip'];
      if (customIp && typeof customIp === 'string' && customIp.trim()) {
        return customIp.trim();
      }

      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded && typeof forwarded === 'string') {
        const firstIp = forwarded.split(',')[0].trim();
        if (firstIp) return firstIp;
      }

      // 2. Fall back to socket IP
      return req.ip || req.connection?.remoteAddress || null;
    }

    case 'domain':
      return (
        req.headers['x-domain'] ||
        req.headers['origin'] ||
        req.hostname ||
        null
      );

    case 'user': {
      // 1. Check Authorization: Bearer <jwt_token>
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        try {
          // Verify or decode JWT
          const decoded = jwt.verify(token, JWT_SECRET);
          return decoded.userId || decoded.id || decoded.sub || decoded.email || null;
        } catch {
          // If signature verification fails (e.g. external token), attempt safe decode
          const decoded = jwt.decode(token);
          if (decoded && (decoded.userId || decoded.id || decoded.sub || decoded.email)) {
            return decoded.userId || decoded.id || decoded.sub || decoded.email;
          }
        }
      }

      // 2. Check if pre-attached by an authentication middleware (req.user)
      if (req.user) {
        return req.user.id || req.user._id || req.user.userId || req.user.email || null;
      }

      // 3. Check X-User-Id header fallback
      return req.headers['x-user-id'] || null;
    }

    default:
      return null;
  }
}

/**
 * Format a period string for human-readable display.
 *
 * @param {string} period - 'minute', 'hour', or 'day'
 * @returns {string} Human-readable period, e.g., "Per Minute"
 */
function formatPeriod(period) {
  const labels = {
    minute: 'Per Minute',
    hour: 'Per Hour',
    day: 'Per Day',
  };
  return labels[period] || period;
}

/**
 * Format an identity type string for human-readable display.
 *
 * @param {string} identityType - 'ip', 'domain', or 'user'
 * @returns {string} Human-readable identity type
 */
function formatIdentityType(identityType) {
  const labels = {
    ip: 'IP Address',
    domain: 'Domain',
    user: 'User / Customer',
  };
  return labels[identityType] || identityType;
}

module.exports = {
  getWindowStart,
  getWindowDuration,
  extractIdentity,
  formatPeriod,
  formatIdentityType,
  WINDOW_DURATIONS,
};
