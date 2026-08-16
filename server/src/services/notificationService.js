/**
 * Notification Service
 *
 * Handles creating in-app notifications and sending email alerts
 * when rate-limit breaches occur. Includes deduplication logic
 * to prevent alert flooding.
 */

const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const BreachLog = require('../models/BreachLog');
const { formatPeriod, formatIdentityType } = require('../utils/helpers');

/**
 * Cooldown period in milliseconds. If a notification for the same
 * rule + identity was sent within this window, suppress the duplicate.
 */
const COOLDOWN_MS =
  (parseInt(process.env.NOTIFICATION_COOLDOWN_MINUTES, 10) || 5) * 60 * 1000;

/**
 * Create an email transporter if SMTP is configured.
 * Returns null if SMTP_HOST is not set.
 */
function createEmailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10) || 587,
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth:
      SMTP_USER && SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined,
  });
}

/**
 * Check if a recent notification already exists for this breach
 * (deduplication within cooldown window).
 *
 * @param {string} ruleId - Rule ObjectId
 * @param {string} identityValue - The identity that breached
 * @returns {boolean} True if a recent notification exists (suppress)
 */
async function isDuplicate(ruleId, identityValue) {
  const cooldownStart = new Date(Date.now() - COOLDOWN_MS);

  const existing = await Notification.findOne({
    ruleId,
    identityValue,
    createdAt: { $gte: cooldownStart },
  });

  return !!existing;
}

/**
 * Notify administrators about a rate-limit breach.
 *
 * Creates:
 * 1. A BreachLog document (always)
 * 2. An in-app Notification (if not a duplicate within cooldown)
 * 3. An email alert (if SMTP is configured and not a duplicate)
 *
 * @param {object} breach - Breach details
 * @param {string} breach.ruleId - Rule ObjectId
 * @param {string} breach.ruleName - Rule name
 * @param {string} breach.identityType - 'ip', 'domain', or 'user'
 * @param {string} breach.identityValue - The identity that breached
 * @param {string} breach.period - 'minute', 'hour', or 'day'
 * @param {number} breach.maxRequests - The configured limit
 * @param {number} breach.actualCount - The actual request count
 */
async function notifyBreach(breach) {
  try {
    // 1. Always log the breach
    await BreachLog.create({
      ruleId: breach.ruleId,
      ruleName: breach.ruleName,
      identityType: breach.identityType,
      identityValue: breach.identityValue,
      period: breach.period,
      maxRequests: breach.maxRequests,
      actualCount: breach.actualCount,
      notified: true,
    });

    // 2. Check deduplication
    const duplicate = await isDuplicate(breach.ruleId, breach.identityValue);
    if (duplicate) {
      return; // Suppress duplicate notification
    }

    // 3. Create in-app notification
    const title = `Rate Limit Breached: ${breach.ruleName}`;
    const message =
      `${formatIdentityType(breach.identityType)} "${breach.identityValue}" ` +
      `exceeded the limit of ${breach.maxRequests} requests ` +
      `${formatPeriod(breach.period).toLowerCase()}. ` +
      `Actual count: ${breach.actualCount}.`;

    await Notification.create({
      title,
      message,
      type: 'breach',
      ruleId: breach.ruleId,
      identityValue: breach.identityValue,
    });

    // 4. Send email if SMTP is configured
    await sendEmailNotification(title, message);

    console.log(`[NOTIFICATION] ${title} — ${message}`);
  } catch (error) {
    // Notification failures should not block the rate-limiter
    console.error('[NOTIFICATION ERROR]', error.message);
  }
}

/**
 * Send an email notification to the admin.
 * Fails gracefully if SMTP is not configured or email send fails.
 *
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 */
async function sendEmailNotification(subject, body) {
  try {
    const transport = createEmailTransport();
    if (!transport) {
      return; // SMTP not configured, skip silently
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    await transport.sendMail({
      from: `"API Rate Limiter" <${process.env.SMTP_USER || 'noreply@ratelimiter.local'}>`,
      to: adminEmail,
      subject: `[Rate Limiter Alert] ${subject}`,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #e74c3c;">⚠️ Rate Limit Breach Alert</h2>
          <p>${body}</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from the API Rate Limiter system.
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Alert sent to ${adminEmail}`);
  } catch (error) {
    console.error('[EMAIL ERROR]', error.message);
    // Do not throw — email failure should not break the flow
  }
}

module.exports = {
  notifyBreach,
  sendEmailNotification,
  isDuplicate,
};
