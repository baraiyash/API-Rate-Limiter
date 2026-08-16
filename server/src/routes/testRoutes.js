/**
 * Test Routes — Endpoints protected by the rate limiter for testing.
 */

const express = require('express');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Apply rate limiter middleware to all test routes
router.use(rateLimiter());

/**
 * GET /api/test
 * Simple test endpoint that is rate-limited.
 */
router.get('/', (req, res) => {
  const customIp = req.headers['x-custom-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.ip;
  res.json({
    success: true,
    message: 'Request successful — you are within the rate limit.',
    timestamp: new Date().toISOString(),
    rateLimit: req.rateLimit || null,
    identity: {
      ip: customIp,
      domain: req.headers['x-domain'] || req.headers['origin'] || req.hostname,
      user: req.headers['authorization'] || req.headers['x-user-id'] || null,
    },
  });
});

/**
 * POST /api/test
 * Test endpoint that accepts custom identity headers for simulation.
 * Body can include: { count: number } to specify how many requests to simulate info about.
 */
router.post('/', (req, res) => {
  const customIp = req.headers['x-custom-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.ip;
  res.json({
    success: true,
    message: 'POST request successful — you are within the rate limit.',
    timestamp: new Date().toISOString(),
    rateLimit: req.rateLimit || null,
    identity: {
      ip: customIp,
      domain: req.headers['x-domain'] || req.headers['origin'] || req.hostname,
      user: req.headers['authorization'] || req.headers['x-user-id'] || null,
    },
    body: req.body,
  });
});

module.exports = router;
