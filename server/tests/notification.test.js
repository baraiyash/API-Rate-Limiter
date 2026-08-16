/**
 * Tests for the Notification Service.
 * Uses mongodb-memory-server for isolated testing.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { notifyBreach, isDuplicate } = require('../src/services/notificationService');
const Notification = require('../src/models/Notification');
const BreachLog = require('../src/models/BreachLog');

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

const sampleBreach = {
  ruleId: new mongoose.Types.ObjectId(),
  ruleName: 'IP Per Minute Limit',
  identityType: 'ip',
  identityValue: '192.168.1.100',
  period: 'minute',
  maxRequests: 10,
  actualCount: 11,
};

describe('Notification Service', () => {
  describe('notifyBreach', () => {
    test('NS-P1: creates in-app notification on breach', async () => {
      await notifyBreach(sampleBreach);

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('breach');
      expect(notifications[0].title).toContain('IP Per Minute Limit');
      expect(notifications[0].read).toBe(false);
    });

    test('NS-P2: notification contains breach details', async () => {
      await notifyBreach(sampleBreach);

      const notification = await Notification.findOne({});
      expect(notification.message).toContain('192.168.1.100');
      expect(notification.message).toContain('10');
      expect(notification.message).toContain('11');
      expect(notification.ruleId.toString()).toBe(sampleBreach.ruleId.toString());
      expect(notification.identityValue).toBe('192.168.1.100');
    });

    test('always creates a breach log entry', async () => {
      await notifyBreach(sampleBreach);

      const breaches = await BreachLog.find({});
      expect(breaches).toHaveLength(1);
      expect(breaches[0].ruleName).toBe('IP Per Minute Limit');
      expect(breaches[0].identityValue).toBe('192.168.1.100');
      expect(breaches[0].actualCount).toBe(11);
    });
  });

  describe('Deduplication', () => {
    test('NS-N1: suppresses duplicate notification within cooldown', async () => {
      // First breach — should create notification
      await notifyBreach(sampleBreach);

      // Second breach (same rule + identity) — notification should be suppressed
      await notifyBreach({ ...sampleBreach, actualCount: 12 });

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1); // Only first notification

      // But breach log should still have both
      const breaches = await BreachLog.find({});
      expect(breaches).toHaveLength(2);
    });

    test('NS-B1: creates new notification for different identity', async () => {
      await notifyBreach(sampleBreach);
      await notifyBreach({
        ...sampleBreach,
        identityValue: '10.0.0.1',
      });

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(2);
    });

    test('NS-B1: creates new notification for different rule', async () => {
      await notifyBreach(sampleBreach);
      await notifyBreach({
        ...sampleBreach,
        ruleId: new mongoose.Types.ObjectId(),
        ruleName: 'Different Rule',
      });

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(2);
    });
  });

  describe('isDuplicate', () => {
    test('returns false when no previous notification exists', async () => {
      const result = await isDuplicate(
        sampleBreach.ruleId,
        sampleBreach.identityValue
      );
      expect(result).toBe(false);
    });

    test('returns true when recent notification exists', async () => {
      await Notification.create({
        title: 'Test',
        message: 'Test notification',
        type: 'breach',
        ruleId: sampleBreach.ruleId,
        identityValue: sampleBreach.identityValue,
      });

      const result = await isDuplicate(
        sampleBreach.ruleId,
        sampleBreach.identityValue
      );
      expect(result).toBe(true);
    });
  });
});
