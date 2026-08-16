/**
 * Unit tests for utility helper functions.
 */

const {
  getWindowStart,
  getWindowDuration,
  extractIdentity,
  formatPeriod,
  formatIdentityType,
  WINDOW_DURATIONS,
} = require('../src/utils/helpers');

describe('getWindowStart', () => {
  test('minute — returns start of current minute', () => {
    const now = new Date('2026-08-16T10:35:42.123Z');
    const result = getWindowStart('minute', now);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getMinutes()).toBe(now.getMinutes());
  });

  test('hour — returns start of current hour', () => {
    const now = new Date('2026-08-16T10:35:42.123Z');
    const result = getWindowStart('hour', now);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getHours()).toBe(now.getHours());
  });

  test('day — returns start of current day', () => {
    const now = new Date('2026-08-16T10:35:42.123Z');
    const result = getWindowStart('day', now);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('defaults to current time when no date is provided', () => {
    const before = new Date();
    const result = getWindowStart('minute');
    const after = new Date();
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime() - 60000);
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('throws error for invalid period', () => {
    expect(() => getWindowStart('week')).toThrow('Invalid period: week');
  });
});

describe('getWindowDuration', () => {
  test('minute — returns 60000 ms', () => {
    expect(getWindowDuration('minute')).toBe(60 * 1000);
  });

  test('hour — returns 3600000 ms', () => {
    expect(getWindowDuration('hour')).toBe(60 * 60 * 1000);
  });

  test('day — returns 86400000 ms', () => {
    expect(getWindowDuration('day')).toBe(24 * 60 * 60 * 1000);
  });

  test('throws error for invalid period', () => {
    expect(() => getWindowDuration('week')).toThrow('Invalid period: week');
  });
});

describe('extractIdentity', () => {
  test('ip — extracts from req.ip', () => {
    const req = { ip: '192.168.1.1', headers: {}, connection: {} };
    expect(extractIdentity(req, 'ip')).toBe('192.168.1.1');
  });

  test('ip — extracts from x-custom-ip simulation header', () => {
    const req = { ip: '127.0.0.1', headers: { 'x-custom-ip': '203.0.113.45' } };
    expect(extractIdentity(req, 'ip')).toBe('203.0.113.45');
  });

  test('ip — extracts first IP from x-forwarded-for header', () => {
    const req = { ip: '127.0.0.1', headers: { 'x-forwarded-for': '198.51.100.12, 10.0.0.1' } };
    expect(extractIdentity(req, 'ip')).toBe('198.51.100.12');
  });

  test('ip — falls back to connection.remoteAddress', () => {
    const req = {
      ip: undefined,
      headers: {},
      connection: { remoteAddress: '10.0.0.1' },
    };
    expect(extractIdentity(req, 'ip')).toBe('10.0.0.1');
  });

  test('domain — extracts from x-domain header', () => {
    const req = { headers: { 'x-domain': 'example.com' } };
    expect(extractIdentity(req, 'domain')).toBe('example.com');
  });

  test('domain — falls back to origin header', () => {
    const req = { headers: { origin: 'https://example.com' } };
    expect(extractIdentity(req, 'domain')).toBe('https://example.com');
  });

  test('domain — falls back to hostname', () => {
    const req = { headers: {}, hostname: 'api.example.com' };
    expect(extractIdentity(req, 'domain')).toBe('api.example.com');
  });

  test('user — extracts from x-user-id header', () => {
    const req = { headers: { 'x-user-id': 'user-123' } };
    expect(extractIdentity(req, 'user')).toBe('user-123');
  });

  test('user — extracts userId from valid JWT Bearer token in Authorization header', () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'jwt_customer_789' }, 'rate-limiter-default-jwt-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    expect(extractIdentity(req, 'user')).toBe('jwt_customer_789');
  });

  test('user — extracts id from decoded JWT payload', () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 'user_uuid_555' }, 'rate-limiter-default-jwt-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    expect(extractIdentity(req, 'user')).toBe('user_uuid_555');
  });

  test('user — extracts from req.user if pre-attached', () => {
    const req = { headers: {}, user: { id: 'attached_user_99' } };
    expect(extractIdentity(req, 'user')).toBe('attached_user_99');
  });

  test('user — returns null when header missing', () => {
    const req = { headers: {} };
    expect(extractIdentity(req, 'user')).toBeNull();
  });

  test('unknown type — returns null', () => {
    const req = { headers: {} };
    expect(extractIdentity(req, 'unknown')).toBeNull();
  });
});

describe('formatPeriod', () => {
  test('minute → Per Minute', () => {
    expect(formatPeriod('minute')).toBe('Per Minute');
  });

  test('hour → Per Hour', () => {
    expect(formatPeriod('hour')).toBe('Per Hour');
  });

  test('day → Per Day', () => {
    expect(formatPeriod('day')).toBe('Per Day');
  });

  test('unknown → returns as-is', () => {
    expect(formatPeriod('week')).toBe('week');
  });
});

describe('formatIdentityType', () => {
  test('ip → IP Address', () => {
    expect(formatIdentityType('ip')).toBe('IP Address');
  });

  test('domain → Domain', () => {
    expect(formatIdentityType('domain')).toBe('Domain');
  });

  test('user → User / Customer', () => {
    expect(formatIdentityType('user')).toBe('User / Customer');
  });
});

describe('WINDOW_DURATIONS', () => {
  test('contains all expected periods', () => {
    expect(WINDOW_DURATIONS).toHaveProperty('minute');
    expect(WINDOW_DURATIONS).toHaveProperty('hour');
    expect(WINDOW_DURATIONS).toHaveProperty('day');
  });
});
