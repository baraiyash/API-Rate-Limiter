/**
 * Database Seed Script
 * Pre-populates the database with 15 rate-limiting rules:
 * 5 for IP Address, 5 for Domain, and 5 for Signed-in User/Customer,
 * covering Per Minute, Per Hour, and Per Day time periods.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Rule = require('./models/Rule');

const seedRules = [
  // ─── 1. IP Address Rules (5 rules) ──────────────────────────────────
  {
    name: 'IP Strict Burst Limit',
    identityType: 'ip',
    period: 'minute',
    maxRequests: 15,
    active: true,
  },
  {
    name: 'IP Standard Rate',
    identityType: 'ip',
    period: 'minute',
    maxRequests: 60,
    active: true,
  },
  {
    name: 'IP Standard Hourly Quota',
    identityType: 'ip',
    period: 'hour',
    maxRequests: 1000,
    active: true,
  },
  {
    name: 'IP High-Volume Hourly',
    identityType: 'ip',
    period: 'hour',
    maxRequests: 3000,
    active: true,
  },
  {
    name: 'IP Daily Maximum Cap',
    identityType: 'ip',
    period: 'day',
    maxRequests: 15000,
    active: true,
  },

  // ─── 2. Domain Rules (5 rules) ──────────────────────────────────────
  {
    name: 'Domain Webhook Burst Limit',
    identityType: 'domain',
    period: 'minute',
    maxRequests: 50,
    active: true,
  },
  {
    name: 'Domain Standard Traffic',
    identityType: 'domain',
    period: 'minute',
    maxRequests: 200,
    active: true,
  },
  {
    name: 'Domain Partner Hourly Quota',
    identityType: 'domain',
    period: 'hour',
    maxRequests: 5000,
    active: true,
  },
  {
    name: 'Domain Enterprise Hourly',
    identityType: 'domain',
    period: 'hour',
    maxRequests: 20000,
    active: true,
  },
  {
    name: 'Domain Daily Aggregation Cap',
    identityType: 'domain',
    period: 'day',
    maxRequests: 100000,
    active: true,
  },

  // ─── 3. Signed-in User / Customer Rules (5 rules) ───────────────────
  {
    name: 'Customer Free Tier Rate',
    identityType: 'user',
    period: 'minute',
    maxRequests: 30,
    active: true,
  },
  {
    name: 'Customer Pro Tier Rate',
    identityType: 'user',
    period: 'minute',
    maxRequests: 150,
    active: true,
  },
  {
    name: 'Customer Basic Hourly Limit',
    identityType: 'user',
    period: 'hour',
    maxRequests: 1500,
    active: true,
  },
  {
    name: 'Customer Premium Hourly Limit',
    identityType: 'user',
    period: 'hour',
    maxRequests: 10000,
    active: true,
  },
  {
    name: 'Customer Fair Use Daily Cap',
    identityType: 'user',
    period: 'day',
    maxRequests: 50000,
    active: true,
  },
];

async function seedDatabase() {
  const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/rateLimiter';

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log(`Connected to MongoDB: ${MONGODB_URI}`);
    }

    const count = await Rule.countDocuments();
    if (count === 0) {
      await Rule.insertMany(seedRules);
      console.log(`✅ Seeded ${seedRules.length} rate limit rules (5 IP, 5 Domain, 5 User across minute, hour, day).`);
    } else {
      console.log(`ℹ️ Database already contains ${count} rules. Skipping default seed.`);
    }
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  }
}

// Export for use during server startup or as standalone script
module.exports = { seedDatabase, seedRules };

if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}
