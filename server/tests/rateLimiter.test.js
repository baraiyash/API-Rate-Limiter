/**
 * Integration tests for the Rate Limiter Middleware.
 * Uses mongodb-memory-server for isolated testing.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const Rule = require('../src/models/Rule');
const RequestLog = require('../src/models/RequestLog');
const BreachLog = require('../src/models/BreachLog');
const Notification = require('../src/models/Notification');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Rate Limiter Middleware', () => {
  describe('Positive Scenarios', () => {
    test('RL-P1: allows requests under the limit', async () => {
      await Rule.create({
        name: 'IP Per Minute',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 10,
        active: true,
      });

      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('RL-P4: different identities have independent counters', async () => {
      await Rule.create({
        name: 'User Per Minute',
        identityType: 'user',
        period: 'minute',
        maxRequests: 2,
        active: true,
      });

      // User A sends 2 requests (at limit)
      await request(app).get('/api/test').set('X-User-Id', 'user-A');
      await request(app).get('/api/test').set('X-User-Id', 'user-A');

      // User B should still be allowed
      const res = await request(app)
        .get('/api/test')
        .set('X-User-Id', 'user-B');
      expect(res.status).toBe(200);
    });

    test('RL-P6: rate limits signed-in users authenticated via JWT Bearer token', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 'jwt_vip_customer' }, 'rate-limiter-default-jwt-secret');

      await Rule.create({
        name: 'JWT User Minute Limit',
        identityType: 'user',
        period: 'minute',
        maxRequests: 1,
        active: true,
      });

      // 1st request with JWT Bearer token should pass (200)
      const res1 = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(200);

      // 2nd request with same JWT Bearer token should be rate-limited (429)
      const res2 = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(429);
      expect(res2.body.error).toBe('Too Many Requests');
    });

    test('RL-P5: inactive rules are not enforced', async () => {
      await Rule.create({
        name: 'Inactive Rule',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 0, // Would block everything if active
        active: false,
      });

      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
    });
  });

  describe('Negative Scenarios', () => {
    test('RL-N1: rejects requests when limit is exceeded', async () => {
      await Rule.create({
        name: 'Strict IP Limit',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 2,
        active: true,
      });

      // First 2 requests should pass
      await request(app).get('/api/test');
      await request(app).get('/api/test');

      // 3rd request should be rejected
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Too Many Requests');
    });

    test('RL-N2: 429 response includes Retry-After header', async () => {
      await Rule.create({
        name: 'IP Limit',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 1,
        active: true,
      });

      await request(app).get('/api/test');
      const res = await request(app).get('/api/test');

      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      expect(parseInt(res.headers['retry-after'], 10)).toBeGreaterThan(0);
    });

    test('RL-N3: 429 response body includes rule details', async () => {
      await Rule.create({
        name: 'IP Limit Detail',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 1,
        active: true,
      });

      await request(app).get('/api/test');
      const res = await request(app).get('/api/test');

      expect(res.status).toBe(429);
      expect(res.body.rule).toBeDefined();
      expect(res.body.rule.name).toBe('IP Limit Detail');
      expect(res.body.rule.maxRequests).toBe(1);
      expect(res.body.retryAfter).toBeDefined();
    });

    test('RL-N5: breach creates a breach log and notification', async () => {
      await Rule.create({
        name: 'Breach Test Rule',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 1,
        active: true,
      });

      await request(app).get('/api/test');
      await request(app).get('/api/test'); // Triggers breach

      // Wait briefly for async notification
      await new Promise((r) => setTimeout(r, 200));

      const breaches = await BreachLog.find({});
      expect(breaches.length).toBeGreaterThanOrEqual(1);
      expect(breaches[0].ruleName).toBe('Breach Test Rule');

      const notifications = await Notification.find({});
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].type).toBe('breach');
    });
  });

  describe('Boundary Scenarios', () => {
    test('RL-B1: allows exactly maxRequests requests', async () => {
      const maxReqs = 3;
      await Rule.create({
        name: 'Exact Limit',
        identityType: 'user',
        period: 'minute',
        maxRequests: maxReqs,
        active: true,
      });

      for (let i = 0; i < maxReqs; i++) {
        const res = await request(app)
          .get('/api/test')
          .set('X-User-Id', 'test-user-exact');
        expect(res.status).toBe(200);
      }
    });

    test('RL-B2: rejects the (maxRequests + 1)th request', async () => {
      const maxReqs = 3;
      await Rule.create({
        name: 'One Over Limit',
        identityType: 'user',
        period: 'minute',
        maxRequests: maxReqs,
        active: true,
      });

      for (let i = 0; i < maxReqs; i++) {
        await request(app)
          .get('/api/test')
          .set('X-User-Id', 'test-user-over');
      }

      const res = await request(app)
        .get('/api/test')
        .set('X-User-Id', 'test-user-over');
      expect(res.status).toBe(429);
    });

    test('RL-B3: limit of 1 — first passes, second rejects', async () => {
      await Rule.create({
        name: 'Single Request',
        identityType: 'user',
        period: 'minute',
        maxRequests: 1,
        active: true,
      });

      const first = await request(app)
        .get('/api/test')
        .set('X-User-Id', 'single-user');
      expect(first.status).toBe(200);

      const second = await request(app)
        .get('/api/test')
        .set('X-User-Id', 'single-user');
      expect(second.status).toBe(429);
    });

    test('RL-B4: limit of 0 — all requests rejected', async () => {
      await Rule.create({
        name: 'Zero Limit',
        identityType: 'user',
        period: 'minute',
        maxRequests: 0,
        active: true,
      });

      const res = await request(app)
        .get('/api/test')
        .set('X-User-Id', 'zero-user');
      expect(res.status).toBe(429);
    });
  });

  describe('Failure Scenarios', () => {
    test('RL-F2: no rules configured — all requests pass', async () => {
      // No rules created
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
    });

    test('RL-F3: missing identity header — rule skipped', async () => {
      await Rule.create({
        name: 'User Rule',
        identityType: 'user',
        period: 'minute',
        maxRequests: 0,
        active: true,
      });

      // No X-User-Id header — user identity can't be extracted, rule should be skipped
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
    });
  });

  describe('Rate Limit Headers', () => {
    test('sets X-RateLimit-* headers on successful requests', async () => {
      await Rule.create({
        name: 'Header Test',
        identityType: 'ip',
        period: 'minute',
        maxRequests: 10,
        active: true,
      });

      const res = await request(app).get('/api/test');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('10');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});
