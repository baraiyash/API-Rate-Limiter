/**
 * Integration tests for Rule CRUD API endpoints.
 * Uses mongodb-memory-server for isolated testing.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');

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

const validRule = {
  name: 'IP Per Minute Limit',
  identityType: 'ip',
  period: 'minute',
  maxRequests: 100,
};

describe('POST /api/rules/seed', () => {
  test('RC-P7: seeds 15 default rules with 5 IP, 5 Domain, 5 User rules across minute, hour, day', async () => {
    const res = await request(app).post('/api/rules/seed').send({});

    expect(res.status).toBe(201);
    expect(res.body.rules).toHaveLength(15);

    const ipRules = res.body.rules.filter((r) => r.identityType === 'ip');
    const domainRules = res.body.rules.filter((r) => r.identityType === 'domain');
    const userRules = res.body.rules.filter((r) => r.identityType === 'user');

    expect(ipRules).toHaveLength(5);
    expect(domainRules).toHaveLength(5);
    expect(userRules).toHaveLength(5);

    // Verify all periods are represented
    for (const ruleset of [ipRules, domainRules, userRules]) {
      const periods = ruleset.map((r) => r.period);
      expect(periods).toContain('minute');
      expect(periods).toContain('hour');
      expect(periods).toContain('day');
    }
  });

  test('overwrites existing rules when overwrite: true', async () => {
    await request(app).post('/api/rules').send(validRule);
    const res = await request(app).post('/api/rules/seed').send({ overwrite: true });

    expect(res.status).toBe(201);
    expect(res.body.rules).toHaveLength(15);

    const allRules = await request(app).get('/api/rules');
    expect(allRules.body).toHaveLength(15);
  });
});

describe('POST /api/rules', () => {
  test('RC-P1: creates a rule with valid data', async () => {
    const res = await request(app).post('/api/rules').send(validRule);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(validRule.name);
    expect(res.body.identityType).toBe(validRule.identityType);
    expect(res.body.period).toBe(validRule.period);
    expect(res.body.maxRequests).toBe(validRule.maxRequests);
    expect(res.body.active).toBe(true);
    expect(res.body._id).toBeDefined();
  });

  test('RC-N1: rejects when required fields are missing', async () => {
    const res = await request(app).post('/api/rules').send({ name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
  });

  test('RC-N2: rejects invalid identityType', async () => {
    const res = await request(app)
      .post('/api/rules')
      .send({ ...validRule, identityType: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Identity type must be one of'),
      ])
    );
  });

  test('RC-N3: rejects invalid period', async () => {
    const res = await request(app)
      .post('/api/rules')
      .send({ ...validRule, period: 'week' });

    expect(res.status).toBe(400);
  });

  test('RC-N4: rejects negative maxRequests', async () => {
    const res = await request(app)
      .post('/api/rules')
      .send({ ...validRule, maxRequests: -5 });

    expect(res.status).toBe(400);
  });

  test('RC-B1: allows maxRequests of 0', async () => {
    const res = await request(app)
      .post('/api/rules')
      .send({ ...validRule, maxRequests: 0 });

    expect(res.status).toBe(201);
    expect(res.body.maxRequests).toBe(0);
  });

  test('RC-B2: allows very large maxRequests', async () => {
    const res = await request(app)
      .post('/api/rules')
      .send({ ...validRule, maxRequests: 999999 });

    expect(res.status).toBe(201);
    expect(res.body.maxRequests).toBe(999999);
  });
});

describe('GET /api/rules', () => {
  test('RC-P2: returns all rules', async () => {
    await request(app).post('/api/rules').send(validRule);
    await request(app)
      .post('/api/rules')
      .send({ ...validRule, name: 'Domain Per Hour', identityType: 'domain', period: 'hour' });

    const res = await request(app).get('/api/rules');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('returns empty array when no rules exist', async () => {
    const res = await request(app).get('/api/rules');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('filters by identityType', async () => {
    await request(app).post('/api/rules').send(validRule);
    await request(app)
      .post('/api/rules')
      .send({ ...validRule, name: 'Domain', identityType: 'domain' });

    const res = await request(app).get('/api/rules?identityType=ip');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].identityType).toBe('ip');
  });
});

describe('GET /api/rules/:id', () => {
  test('RC-P3: returns a single rule', async () => {
    const created = await request(app).post('/api/rules').send(validRule);
    const res = await request(app).get(`/api/rules/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(validRule.name);
  });

  test('RC-N7: returns 404 for non-existent rule', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/rules/${fakeId}`);

    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid ObjectId', async () => {
    const res = await request(app).get('/api/rules/invalid-id');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/rules/:id', () => {
  test('RC-P4: updates a rule', async () => {
    const created = await request(app).post('/api/rules').send(validRule);
    const res = await request(app)
      .put(`/api/rules/${created.body._id}`)
      .send({ ...validRule, maxRequests: 200 });

    expect(res.status).toBe(200);
    expect(res.body.maxRequests).toBe(200);
  });

  test('RC-P6: toggles active status', async () => {
    const created = await request(app).post('/api/rules').send(validRule);
    const res = await request(app)
      .put(`/api/rules/${created.body._id}`)
      .send({ ...validRule, active: false });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  test('RC-N5: returns 404 for non-existent rule', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/rules/${fakeId}`)
      .send(validRule);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/rules/:id', () => {
  test('RC-P5: deletes a rule', async () => {
    const created = await request(app).post('/api/rules').send(validRule);
    const res = await request(app).delete(`/api/rules/${created.body._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Rule deleted successfully');

    // Verify it's gone
    const verify = await request(app).get(`/api/rules/${created.body._id}`);
    expect(verify.status).toBe(404);
  });

  test('RC-N6: returns 404 for non-existent rule', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/rules/${fakeId}`);

    expect(res.status).toBe(404);
  });
});
