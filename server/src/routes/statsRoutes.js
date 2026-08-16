/**
 * Stats Routes — Dashboard statistics.
 */

const express = require('express');
const Rule = require('../models/Rule');
const BreachLog = require('../models/BreachLog');
const RequestLog = require('../models/RequestLog');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * GET /api/stats
 * Returns dashboard statistics.
 */
router.get('/', async (req, res) => {
  try {
    // Get start of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalRules,
      activeRules,
      totalBreaches,
      breachesToday,
      unreadNotifications,
      totalRequestLogs,
    ] = await Promise.all([
      Rule.countDocuments(),
      Rule.countDocuments({ active: true }),
      BreachLog.countDocuments(),
      BreachLog.countDocuments({ timestamp: { $gte: todayStart } }),
      Notification.countDocuments({ read: false }),
      RequestLog.countDocuments(),
    ]);

    // Recent breaches (last 24 hours, grouped by hour)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBreaches = await BreachLog.aggregate([
      { $match: { timestamp: { $gte: last24h } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalRules,
      activeRules,
      totalBreaches,
      breachesToday,
      unreadNotifications,
      totalRequestLogs,
      recentBreaches,
    });
  } catch (error) {
    console.error('[STATS] GET error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
