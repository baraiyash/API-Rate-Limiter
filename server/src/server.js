/**
 * Server Entry Point
 *
 * Connects to MongoDB and starts the Express server.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { seedDatabase } = require('./seed');

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/rateLimiter';

async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${MONGODB_URI}`);

    // Auto-seed default rules if database has no rules
    await seedDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 API Rate Limiter server running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Rules:  http://localhost:${PORT}/api/rules`);
      console.log(`   Test:   http://localhost:${PORT}/api/test`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
