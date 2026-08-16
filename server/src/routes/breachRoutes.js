/**
 * Breach Log Routes — Query breach history.
 */

const express = require('express');
const BreachLog = require('../models/BreachLog');

const router = express.Router();

/**
 * GET /api/breaches
 * List breach logs with optional filters.
 * Query params: identityType, identityValue, ruleId, limit (default 50)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.identityType) {
      filter.identityType = req.query.identityType;
    }
    if (req.query.identityValue) {
      filter.identityValue = req.query.identityValue;
    }
    if (req.query.ruleId) {
      filter.ruleId = req.query.ruleId;
    }

    const limit = parseInt(req.query.limit, 10) || 50;

    const breaches = await BreachLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json(breaches);
  } catch (error) {
    console.error('[BREACHES] GET error:', error.message);
    res.status(500).json({ error: 'Failed to fetch breach logs' });
  }
});

/**
 * DELETE /api/breaches
 * Clear all breach logs.
 */
router.delete('/', async (req, res) => {
  try {
    await BreachLog.deleteMany({});
    res.json({ message: 'All breach logs cleared' });
  } catch (error) {
    console.error('[BREACHES] DELETE error:', error.message);
    res.status(500).json({ error: 'Failed to clear breach logs' });
  }
});

module.exports = router;
