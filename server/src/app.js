/**
 * Express Application Setup
 *
 * Configures middleware, mounts routes, and sets up error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Route imports
const ruleRoutes = require('./routes/ruleRoutes');
const breachRoutes = require('./routes/breachRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ─── Security & Parsing Middleware ─────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Trust proxy (for correct req.ip behind reverse proxies) ───────────
app.set('trust proxy', true);

// ─── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/breaches', breachRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/test', testRoutes);

// ─── Health Check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 Handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
