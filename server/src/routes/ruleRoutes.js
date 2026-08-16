const express = require('express');
const mongoose = require('mongoose');
const Rule = require('../models/Rule');
const { seedRules } = require('../seed');

const router = express.Router();

/**
 * POST /api/rules/seed
 * Seed the 15 default rules (5 IP, 5 Domain, 5 User across minute, hour, day).
 */
router.post('/seed', async (req, res) => {
  try {
    const { overwrite } = req.body;
    if (overwrite) {
      await Rule.deleteMany({});
    }
    const inserted = await Rule.insertMany(seedRules);
    res.status(201).json({
      message: `Successfully seeded ${inserted.length} default rate limit rules`,
      rules: inserted,
    });
  } catch (error) {
    console.error('[RULES] SEED error:', error.message);
    res.status(500).json({ error: 'Failed to seed rules' });
  }
});

/**
 * GET /api/rules
 * List all rate-limit rules, optionally filtered by identityType or active status.
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.identityType) {
      filter.identityType = req.query.identityType;
    }
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    const rules = await Rule.find(filter).sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    console.error('[RULES] GET error:', error.message);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

/**
 * GET /api/rules/:id
 * Get a single rule by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    console.error('[RULES] GET/:id error:', error.message);
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

/**
 * POST /api/rules
 * Create a new rate-limit rule.
 */
router.post('/', async (req, res) => {
  try {
    const { name, identityType, period, maxRequests, active } = req.body;

    const rule = await Rule.create({
      name,
      identityType,
      period,
      maxRequests,
      active: active !== undefined ? active : true,
    });

    res.status(201).json(rule);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    console.error('[RULES] POST error:', error.message);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * PUT /api/rules/:id
 * Update an existing rate-limit rule.
 */
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const { name, identityType, period, maxRequests, active } = req.body;

    const rule = await Rule.findByIdAndUpdate(
      req.params.id,
      { name, identityType, period, maxRequests, active },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    console.error('[RULES] PUT error:', error.message);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/rules/:id
 * Delete a rate-limit rule.
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }

    const rule = await Rule.findByIdAndDelete(req.params.id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully', rule });
  } catch (error) {
    console.error('[RULES] DELETE error:', error.message);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

module.exports = router;
