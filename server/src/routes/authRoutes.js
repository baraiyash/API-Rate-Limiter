/**
 * Authentication Routes
 * Provides JWT token generation and verification for testing authenticated user rate limits.
 */

const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rate-limiter-default-jwt-secret';

/**
 * POST /api/auth/token
 * Generate a JWT token for a given user/customer.
 * Body: { userId: string, name?: string, role?: string, expiresIn?: string }
 */
router.post('/token', (req, res) => {
  try {
    const { userId = 'cust_vip_42', name = 'Jane Doe', plan = 'pro', expiresIn = '24h' } =
      req.body;

    const payload = {
      userId,
      name,
      plan,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

    res.json({
      success: true,
      token,
      user: payload,
      headerFormat: `Bearer ${token}`,
      message: `JWT token generated for user "${userId}". Pass in "Authorization: Bearer <token>" header.`,
    });
  } catch (error) {
    console.error('[AUTH] Token error:', error.message);
    res.status(500).json({ error: 'Failed to generate JWT token' });
  }
});

/**
 * POST /api/auth/verify
 * Verify and decode an existing JWT token.
 */
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
});

module.exports = router;
