# Unit Test Cases — API Rate Limiter

## 1. Overview

This document describes the unit and integration test scenarios for the API Rate Limiter system. Tests are organized by component and cover positive, negative, boundary, and failure scenarios.

**Testing Framework**: Jest + Supertest (backend), React Testing Library (frontend)

---

## 2. Rate Limiter Middleware Tests

### 2.1 Positive Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RL-P1 | Allow request under limit | Send requests below the configured limit | HTTP 200, request passes through |
| RL-P2 | Multiple rules, all pass | Request matches multiple rules, none exceeded | HTTP 200 |
| RL-P3 | Counter resets after window | Exceed limit, wait for new window, send request | HTTP 200 (counter reset) |
| RL-P4 | Different identities independent | Two different IPs each send requests | Each has independent counter |
| RL-P5 | Inactive rule ignored | Rule exists but `active: false` | Requests not rate-limited by inactive rule |

### 2.2 Negative Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RL-N1 | Reject when limit exceeded | Send requests exceeding configured limit | HTTP 429 Too Many Requests |
| RL-N2 | 429 includes Retry-After | Request rejected due to rate limit | Response includes `Retry-After` header |
| RL-N3 | 429 response body | Request rejected due to rate limit | Response body includes error message, rule details |
| RL-N4 | Multiple rules, one breached | Request passes Rule A but breaches Rule B | HTTP 429 |
| RL-N5 | Breach creates notification | Limit exceeded for a rule | BreachLog and Notification created in DB |

### 2.3 Boundary Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RL-B1 | Exact limit (last allowed) | Send exactly `maxRequests` requests | All return HTTP 200 |
| RL-B2 | One over limit | Send `maxRequests + 1` requests | First N pass, last returns 429 |
| RL-B3 | Limit of 1 | Rule with `maxRequests: 1` | First request passes, second returns 429 |
| RL-B4 | Limit of 0 | Rule with `maxRequests: 0` | All requests return 429 |
| RL-B5 | Window boundary crossing | Requests spanning two time windows | Counters for each window are independent |

### 2.4 Failure Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RL-F1 | DB connection failure | MongoDB unavailable during rate check | Fail open — request allowed with warning log |
| RL-F2 | No rules configured | No rate-limit rules in database | All requests pass through |
| RL-F3 | Invalid identity extraction | Missing X-User-Id header for user-type rule | Rule skipped (identity cannot be determined) |

---

## 3. Rule CRUD API Tests

### 3.1 Positive Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RC-P1 | Create rule | POST valid rule data | HTTP 201, rule created in DB |
| RC-P2 | Get all rules | GET /api/rules | HTTP 200, array of rules returned |
| RC-P3 | Get single rule | GET /api/rules/:id | HTTP 200, rule object returned |
| RC-P4 | Update rule | PUT /api/rules/:id with valid data | HTTP 200, rule updated |
| RC-P5 | Delete rule | DELETE /api/rules/:id | HTTP 200, rule removed from DB |
| RC-P6 | Toggle rule active status | PUT rule with `active: false` | Rule becomes inactive |
| RC-P7 | Seed 15 default rules | POST /api/rules/seed | HTTP 201, 15 rules created (5 IP, 5 Domain, 5 User across minute, hour, day) |

### 3.2 Negative Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RC-N1 | Create with missing fields | POST without required fields | HTTP 400, validation error |
| RC-N2 | Create with invalid identityType | POST with `identityType: 'invalid'` | HTTP 400, validation error |
| RC-N3 | Create with invalid period | POST with `period: 'week'` | HTTP 400, validation error |
| RC-N4 | Create with negative maxRequests | POST with `maxRequests: -5` | HTTP 400, validation error |
| RC-N5 | Update non-existent rule | PUT /api/rules/:nonExistentId | HTTP 404 |
| RC-N6 | Delete non-existent rule | DELETE /api/rules/:nonExistentId | HTTP 404 |
| RC-N7 | Get non-existent rule | GET /api/rules/:nonExistentId | HTTP 404 |

### 3.3 Boundary Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| RC-B1 | Create with maxRequests = 0 | Edge case for zero limit | HTTP 201, rule created |
| RC-B2 | Create with very large maxRequests | maxRequests = 999999 | HTTP 201, rule created |
| RC-B3 | Name with special characters | Rule name with symbols | HTTP 201, properly stored |

---

## 4. Notification Service Tests

### 4.1 Positive Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| NS-P1 | In-app notification created | Breach triggers notification | Notification document created in DB |
| NS-P2 | Notification contains breach details | Check notification content | Includes rule name, identity, timestamp |
| NS-P3 | Get notifications | GET /api/notifications | HTTP 200, array of notifications |
| NS-P4 | Mark notification read | PATCH /api/notifications/:id/read | Notification `read: true` |
| NS-P5 | Mark all read | PATCH /api/notifications/read-all | All notifications `read: true` |
| NS-P6 | Unread count | GET /api/notifications with unread filter | Correct count of unread notifications |

### 4.2 Negative Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| NS-N1 | Duplicate suppression | Two breaches within 5-min cooldown | Only one notification created |
| NS-N2 | Email failure graceful | SMTP misconfigured | In-app notification still created, error logged |

### 4.3 Boundary Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| NS-B1 | Notification after cooldown | Breach 6 minutes after previous | New notification created |
| NS-B2 | Many notifications | 100+ notifications in DB | All retrievable, properly paginated |

---

## 5. Utility / Helper Function Tests

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| UH-1 | getWindowStart('minute') | Get window start for current minute | Returns start of current minute |
| UH-2 | getWindowStart('hour') | Get window start for current hour | Returns start of current hour |
| UH-3 | getWindowStart('day') | Get window start for current day | Returns start of current day |
| UH-4 | getWindowDuration('minute') | Duration for minute window | Returns 60000 ms |
| UH-5 | getWindowDuration('hour') | Duration for hour window | Returns 3600000 ms |
| UH-6 | getWindowDuration('day') | Duration for day window | Returns 86400000 ms |
| UH-7 | extractIdentity — IP | Extract IP from request | Returns `req.ip` value |
| UH-8 | extractIdentity — Domain | Extract domain from request header | Returns `X-Domain` or `Origin` header |
| UH-9 | extractIdentity — User | Extract user from request header | Returns `X-User-Id` header |
| UH-10 | extractIdentity — Missing | No identity available | Returns `null` |

---

## 6. Dashboard Stats API Tests

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| DS-1 | Stats with no data | Fresh database | Returns zeroes for all stats |
| DS-2 | Stats with data | Rules and breaches exist | Returns correct counts |
| DS-3 | Breaches today count | Breaches from today vs. yesterday | Only today's breaches counted |

---

## 7. Integration Test Scenarios

| ID | Test Case | Description | Expected Result |
|---|---|---|---|
| IT-1 | End-to-end: create rule → hit limit | Create IP/minute rule, send requests | First N pass, then 429, breach logged |
| IT-2 | End-to-end: deactivate rule | Create rule, deactivate, send requests | All requests pass after deactivation |
| IT-3 | End-to-end: modify limit | Create rule, increase limit, verify | New limit takes effect |
| IT-4 | Concurrent requests | Parallel requests from same IP | Counter is accurate (no race conditions) |

---

## 8. Test Configuration

```javascript
// Test setup
- Use in-memory MongoDB (mongodb-memory-server) for isolated tests
- Clear database between test suites
- Mock Nodemailer transport for email tests
- Set short time windows for faster boundary tests
```

## 9. Test Commands

```bash
# Run all backend tests
cd server && npm test

# Run with coverage
cd server && npm run test:coverage

# Run specific test file
cd server && npx jest tests/rateLimiter.test.js
```
