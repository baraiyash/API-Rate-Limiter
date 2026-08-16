# 🛡️ API Rate Limiter

A full-stack **MERN-based API Rate Limiting System** designed to protect APIs from excessive traffic, accidental traffic spikes, and misuse.

The system provides configurable rate-limit rules based on **IP address, domain, and authenticated user**, using a **Sliding Window Counter** algorithm backed by MongoDB. It includes an admin dashboard for managing rules, monitoring breaches, viewing notifications, and testing API traffic in real time.

---

## 🚀 Features

* 🔐 **JWT-Based User Identification**

  * Supports `Authorization: Bearer <JWT>`
  * JWT verification and decoding
  * Extracts identity from `userId`, `id`, `sub`, or `email` claims
  * `X-User-Id` supported as a fallback/testing mechanism
  * Built-in JWT token generation and verification endpoints

* ⚡ **Sliding Window Counter**

  * More accurate than a fixed-window approach
  * Reduces burst problems around time-window boundaries
  * Uses weighted previous/current window counts
  * Low storage overhead

* 🎯 **Multiple Identity Types**

  * IP Address
  * Domain
  * Signed-in User / Customer

* ⏱️ **Flexible Time Periods**

  * Per Minute
  * Per Hour
  * Per Day

* ⚙️ **Configurable Rules**

  * Create, read, update, and delete rules
  * Activate/deactivate rules without deleting them
  * Multiple rules can apply simultaneously

* 🚫 **HTTP 429 Enforcement**

  * Requests exceeding a configured limit receive `429 Too Many Requests`
  * Includes a `Retry-After` header

* 🔔 **Breach Notifications**

  * In-app notifications
  * Optional email notifications using SMTP/Nodemailer
  * 5-minute duplicate notification cooldown

* 📊 **Admin Dashboard**

  * Active rule statistics
  * Request statistics
  * Breach activity
  * Rule management
  * Breach logs
  * Notification center

* 🧪 **Interactive API Tester**

  * Send configurable request volumes
  * Configure concurrency
  * Test IP, domain, and user-based rules
  * Generate JWTs directly from the dashboard
  * Observe successful and rate-limited requests in real time

* 🧵 **Concurrency-Safe Counters**

  * Atomic MongoDB updates using `findOneAndUpdate` and `$inc`

* 🗑️ **Automatic Counter Cleanup**

  * MongoDB TTL indexes automatically remove expired counter documents

* 🧪 **Automated Testing**

  * Unit and integration tests using Jest and Supertest
  * 65 automated backend tests across four test suites

---

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │       Client         │
                         │   React Dashboard    │
                         └──────────┬───────────┘
                                    │
                                    │ REST API
                                    ▼
                     ┌─────────────────────────────┐
                     │       Express.js Server     │
                     │                             │
                     │  CORS / Helmet / JSON       │
                     │            │                │
                     │            ▼                │
                     │     Rate Limiter            │
                     │      Middleware             │
                     │            │                │
                     └────────────┼────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             ┌──────────────┐         ┌──────────────────┐
             │   MongoDB    │         │ Notification     │
             │              │         │ Service          │
             │ Rules        │         │                  │
             │ Counters     │         │ In-App + Email   │
             │ Breaches     │         └──────────────────┘
             │ Notifications│
             └──────────────┘
```

### Request Flow

```text
Incoming Request
       │
       ▼
Express Middleware
       │
       ▼
Extract Identity
       │
       ├── IP → req.ip
       ├── Domain → X-Domain / Origin
       └── User → JWT / req.user / X-User-Id
       │
       ▼
Find Active Rules
       │
       ▼
Calculate Sliding Window Count
       │
       ▼
Atomic MongoDB Counter Update
       │
       ├─────────────── Under Limit ──────────────► Route Handler
       │
       └─────────────── Over Limit ───────────────► HTTP 429
                                                       │
                                                       ▼
                                                Breach Log
                                                       │
                                                       ▼
                                                 Notification
```

---

## 🔐 JWT Authentication Flow

Authenticated user rate limiting uses JWTs to identify customers.

```text
Client
  │
  │ Authorization: Bearer <JWT>
  ▼
Express Server
  │
  ▼
JWT Verification
  │
  ▼
Decode JWT Claims
  │
  ▼
Extract User Identity
  │
  ▼
Rate Limiter
  │
  ▼
MongoDB Counter
```

For example, a JWT can contain:

```json
{
  "userId": "cust_vip_42"
}
```

The rate limiter uses:

```text
identityType  = user
identityValue = cust_vip_42
```

The counter is therefore maintained separately for that authenticated user.

### Supported User Identity Sources

| Source      | Example                         |
| ----------- | ------------------------------- |
| JWT         | `Authorization: Bearer <token>` |
| `req.user`  | Authenticated user object       |
| `X-User-Id` | `X-User-Id: cust_vip_42`        |

JWT claims supported by the implementation include:

```text
userId
id
sub
email
```

### Authentication Endpoints

| Method | Endpoint           | Description                           |
| ------ | ------------------ | ------------------------------------- |
| `POST` | `/api/auth/token`  | Generate a signed JWT for testing     |
| `POST` | `/api/auth/verify` | Verify a JWT and inspect its identity |

The Test API page also provides a **Generate JWT** button so different user identities can be simulated without implementing a complete login system.

> **Note:** The JWT generator is intended for testing/demo authentication. In a production application, token issuance would normally be connected to a proper authentication and user-management system.

---

## ⚡ Rate Limiting Algorithm

This project uses a **Sliding Window Counter** algorithm.

### Why Sliding Window Counter?

| Algorithm                  | Advantage                   | Limitation                     | Decision |
| -------------------------- | --------------------------- | ------------------------------ | -------- |
| Fixed Window               | Simple                      | Burst at window boundaries     | ❌        |
| Sliding Window Log         | Very accurate               | Stores every request timestamp | ❌        |
| Token Bucket               | Smooth traffic control      | More complex state management  | ❌        |
| **Sliding Window Counter** | Good accuracy + low storage | Slight approximation           | ✅        |

The algorithm combines the previous window's counter with the current window's counter using an overlap ratio.

```text
weightedCount =
    (previousCount × overlapRatio)
    + currentCount
```

Where:

```text
overlapRatio =
    1 - (elapsedTimeInCurrentWindow / windowDuration)
```

This allows the system to approximate a true sliding window without storing every individual request timestamp.

---

## 🗄️ MongoDB Counter Design

A rate-limit counter contains information similar to:

```json
{
  "ruleId": "ObjectId",
  "identityValue": "192.168.1.1",
  "windowStart": "2026-08-16T15:30:00Z",
  "count": 42,
  "expiresAt": "2026-08-16T15:32:00Z"
}
```

### Database Optimizations

* **Compound index**

  * `ruleId`
  * `identityValue`
  * `windowStart`

* **TTL index**

  * Automatically removes expired counter documents

* **Atomic increment**

  * Uses `findOneAndUpdate`
  * Uses `$inc`
  * Prevents race conditions during concurrent requests

---

## 🎯 Supported Rate-Limit Rules

The system supports three identity types:

```text
IP Address
Domain
Signed-in User / Customer
```

and three time periods:

```text
Per Minute
Per Hour
Per Day
```

### Default Rules

The application provides 15 predefined rules:

| Rule                          | Identity | Period |   Limit |
| ----------------------------- | -------- | -----: | ------: |
| IP Strict Burst Limit         | IP       | Minute |      15 |
| IP Standard Rate              | IP       | Minute |      60 |
| IP Standard Hourly Quota      | IP       |   Hour |   1,000 |
| IP High-Volume Hourly         | IP       |   Hour |   3,000 |
| IP Daily Maximum Cap          | IP       |    Day |  15,000 |
| Domain Webhook Burst Limit    | Domain   | Minute |      50 |
| Domain Standard Traffic       | Domain   | Minute |     200 |
| Domain Partner Hourly Quota   | Domain   |   Hour |   5,000 |
| Domain Enterprise Hourly      | Domain   |   Hour |  20,000 |
| Domain Daily Aggregation Cap  | Domain   |    Day | 100,000 |
| Customer Free Tier Rate       | User     | Minute |      30 |
| Customer Pro Tier Rate        | User     | Minute |     150 |
| Customer Basic Hourly Limit   | User     |   Hour |   1,500 |
| Customer Premium Hourly Limit | User     |   Hour |  10,000 |
| Customer Fair Use Daily Cap   | User     |    Day |  50,000 |

These rules are configurable through the admin dashboard.

---

## 🚫 Rate Limit Enforcement

When an incoming request is processed:

1. The system extracts the request identity.
2. Active rules applicable to that identity are retrieved.
3. The relevant MongoDB counters are updated atomically.
4. The sliding-window count is evaluated.
5. If all limits are satisfied, the request continues.
6. If any limit is exceeded, the request is rejected.

Example:

```text
Limit = 5 requests/minute

Request 1 → 200 OK
Request 2 → 200 OK
Request 3 → 200 OK
Request 4 → 200 OK
Request 5 → 200 OK
Request 6 → 429 Too Many Requests
```

The rejected response includes:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
```

---

## 🔔 Breach Notifications

When a rate limit is breached, the system creates a breach record and notification.

A notification contains information such as:

```text
Rule Name
Identity Type
Identity Value
Maximum Requests
Actual Count
Timestamp
```

### In-App Notifications

Notifications are stored in MongoDB and displayed through the dashboard.

The header contains a notification indicator showing unread notifications.

### Email Notifications

Email notifications can be enabled through SMTP configuration using Nodemailer.

If SMTP is not configured, the system continues operating with in-app notifications.

### Notification Deduplication

Repeated breaches for the same:

```text
Rule + Identity
```

within a **5-minute cooldown period** do not generate duplicate notifications.

---

## 📊 Admin Dashboard

The dashboard provides:

### Dashboard

* Active rules
* Total requests processed
* Breaches today
* Breach activity visualization

### Rate Limit Rules

* Create rules
* Edit rules
* Delete rules
* Activate/deactivate rules
* View configured limits

### Breach Logs

* View rate-limit breaches
* Review identity information
* Review exceeded limits
* Filter breach records

### Notifications

* View breach notifications
* Unread notification count
* Mark individual notifications as read
* Mark all notifications as read

### Test API

* Configure request volume
* Configure concurrency
* Configure batch delay
* Test domain identities
* Test user identities
* Generate JWTs
* Send traffic
* Observe `200` and `429` responses

---

## 🧪 Testing

The project includes **65 automated tests** covering rate-limiter behavior, rule CRUD operations, notifications, and helper functions.

| Test Suite             |  Tests |
| ---------------------- | -----: |
| `helpers.test.js`      |     17 |
| `rules.test.js`        |     16 |
| `rateLimiter.test.js`  |     21 |
| `notification.test.js` |     11 |
| **Total**              | **65** |

### Test Coverage Areas

* Requests under the limit
* Requests exceeding the limit
* Exact-limit boundaries
* Multiple simultaneous rules
* Different identities
* Inactive rules
* Window transitions
* HTTP 429 responses
* `Retry-After` headers
* Breach notifications
* Notification deduplication
* Email failure handling
* Rule CRUD operations
* Invalid rule configurations
* Concurrent requests
* Database failure / fail-open behavior
* Dashboard statistics

The test plan covers positive, negative, boundary, failure, and integration scenarios.

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run rate limiter tests
cd server
npx jest tests/rateLimiter.test.js
```

---

## 🛠️ Tech Stack

| Layer               | Technology                       |
| ------------------- | -------------------------------- |
| Frontend            | React 18                         |
| Build Tool          | Vite                             |
| Routing             | React Router                     |
| HTTP Client         | Axios                            |
| Backend             | Node.js                          |
| Framework           | Express.js                       |
| Database            | MongoDB                          |
| ODM                 | Mongoose                         |
| Authentication      | JSON Web Token                   |
| Email               | Nodemailer                       |
| Testing             | Jest                             |
| API Testing         | Supertest                        |
| Test Database       | mongodb-memory-server            |
| Security Middleware | Helmet                           |
| Development         | Concurrent server/client scripts |

The documented technical stack is Node.js 24, Express.js, MongoDB/Mongoose, React 18/Vite, Nodemailer, Jest, and Supertest.

---

## 📋 Prerequisites

Make sure the following are installed:

* Node.js 18+
* MongoDB
* npm

Node.js 24 is recommended for this project.

MongoDB should be available locally:

```text
mongodb://localhost:27017
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd APIRateLimiter
```

### 2. Install Dependencies

From the project root:

```bash
npm run install:all
```

Or install manually:

```bash
cd server
npm install

cd ../client
npm install

cd ..
npm install
```

### 3. Configure Environment Variables

Create:

```text
server/.env
```

Example:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rateLimiter

# JWT
JWT_SECRET=your_secret_key

# Optional SMTP configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ADMIN_EMAIL=admin@example.com
```

> Never commit your real `.env` file or JWT secret to GitHub. Use `.env.example` for public configuration templates.

### 4. Start the Application

Run both frontend and backend:

```bash
npm run dev
```

Or start them separately.

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

### 5. Open the Dashboard

```text
http://localhost:3000
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| `POST` | `/api/auth/token`  | Generate JWT token |
| `POST` | `/api/auth/verify` | Verify JWT token   |

### Rate Limit Rules

| Method   | Endpoint         | Description   |
| -------- | ---------------- | ------------- |
| `GET`    | `/api/rules`     | Get all rules |
| `POST`   | `/api/rules`     | Create a rule |
| `PUT`    | `/api/rules/:id` | Update a rule |
| `DELETE` | `/api/rules/:id` | Delete a rule |

### Test API

| Method | Endpoint    | Description                                |
| ------ | ----------- | ------------------------------------------ |
| `GET`  | `/api/test` | Rate-limited test endpoint                 |
| `POST` | `/api/test` | Test endpoint with custom identity headers |

### Breach Logs

| Method   | Endpoint        | Description       |
| -------- | --------------- | ----------------- |
| `GET`    | `/api/breaches` | Get breach logs   |
| `DELETE` | `/api/breaches` | Clear breach logs |

### Notifications

| Method  | Endpoint                      | Description                        |
| ------- | ----------------------------- | ---------------------------------- |
| `GET`   | `/api/notifications`          | Get notifications and unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read          |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read     |

### Dashboard Statistics

| Method | Endpoint     | Description              |
| ------ | ------------ | ------------------------ |
| `GET`  | `/api/stats` | Get dashboard statistics |

### Health Check

| Method | Endpoint      | Description         |
| ------ | ------------- | ------------------- |
| `GET`  | `/api/health` | Check server health |

---

## 🧪 Example: Testing a User Rate Limit

Create a rule:

```text
Name: User Test Limit
Identity: User
Period: Minute
Maximum Requests: 5
```

Enter:

```text
X-User-Id:
cust_vip_42
```

Click:

```text
Generate JWT
```

The Test API generates a JWT for:

```text
cust_vip_42
```

Then send 10 requests.

Expected result:

```text
Request 1 → 200
Request 2 → 200
Request 3 → 200
Request 4 → 200
Request 5 → 200
Request 6 → 429
Request 7 → 429
Request 8 → 429
Request 9 → 429
Request 10 → 429
```

The breach is recorded and the notification system is triggered.

You can then inspect:

```text
Notifications
      ↓
Breach Logs
```

---

## 📁 Project Structure

```text
APIRateLimiter/
│
├── BusinessRequirements.md
├── TechnicalApproach.md
├── UnitTestCases.md
├── README.md
├── package.json
│
├── server/
│   ├── package.json
│   ├── .env.example
│   │
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   │
│   │   ├── middleware/
│   │   │   └── rateLimiter.js
│   │   │
│   │   ├── models/
│   │   │   ├── Rule.js
│   │   │   ├── RequestLog.js
│   │   │   ├── BreachLog.js
│   │   │   └── Notification.js
│   │   │
│   │   ├── routes/
│   │   │   ├── ruleRoutes.js
│   │   │   ├── breachRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── statsRoutes.js
│   │   │   └── testRoutes.js
│   │   │
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   │
│   │   └── utils/
│   │       └── helpers.js
│   │
│   └── tests/
│       ├── helpers.test.js
│       ├── rules.test.js
│       ├── rateLimiter.test.js
│       └── notification.test.js
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    │
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        │
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── RuleForm.jsx
        │   └── StatsCard.jsx
        │
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Rules.jsx
        │   ├── BreachLogs.jsx
        │   ├── Notifications.jsx
        │   └── TestAPI.jsx
        │
        └── services/
            └── api.js
```

---

## 🧠 Key Design Decisions

### Sliding Window Counter

Chosen instead of fixed-window rate limiting because fixed windows can allow bursts around window boundaries.

### Atomic MongoDB Operations

Counters are incremented using atomic MongoDB operations to prevent race conditions when multiple requests arrive concurrently.

### MongoDB TTL Indexes

Expired counters are automatically removed by MongoDB instead of requiring a separate cleanup process.

### Fail Open

If MongoDB becomes unavailable during a rate-limit check, the system allows the request through and logs a warning rather than potentially blocking all API traffic.

### Notification Deduplication

A 5-minute cooldown prevents sustained traffic breaches from generating excessive duplicate notifications.

## These design decisions are documented in the technical approach.

## 🔒 Security Considerations

This project is primarily designed as a rate-limiting system and demonstration application.

Current scope includes:

* JWT-based user identity verification
* Helmet security headers
* Configurable environment variables
* MongoDB-backed counters
* Optional SMTP notifications

However, some production concerns are intentionally outside the current scope:

* Admin dashboard authentication
* Distributed rate limiting
* API key management
* Multi-tenancy
* Allowlisting/bypass rules
* Historical analytics

The current application is designed for a **single-instance deployment**, while MongoDB's centralized counters provide a path toward multi-instance deployments in the future.

---

## 📈 Future Improvements

Potential improvements include:

* Redis-based counter storage
* Distributed rate limiting across multiple server instances
* Admin authentication and role-based access control
* API key-based rate limiting
* Organization/multi-tenant support
* Rate-limit allowlists
* Historical analytics
* Advanced traffic visualization
* Message queues for asynchronous notifications
* More granular rate-limit policies
* Production authentication and user management

---

## 🤖 AI-Assisted Development

AI tools were used during development for:

* Requirement analysis
* Architecture design
* Algorithm selection
* Code generation
* Test case design
* Code review
* Troubleshooting

All generated code was reviewed, validated, and tested by the developer.

---

## 📄 Documentation

Additional project documentation:

* [`BusinessRequirements.md`](./BusinessRequirements.md) — Business and functional requirements
* [`TechnicalApproach.md`](./TechnicalApproach.md) — Architecture and technical design
* [`UnitTestCases.md`](./UnitTestCases.md) — Unit and integration test scenarios

---

## 📌 Project Status

**Status: Completed**

The system currently supports:

* ✅ Configurable rate-limit rules
* ✅ IP-based rate limiting
* ✅ Domain-based rate limiting
* ✅ JWT-based user rate limiting
* ✅ Sliding Window Counter
* ✅ MongoDB atomic counters
* ✅ TTL-based cleanup
* ✅ HTTP 429 enforcement
* ✅ `Retry-After` responses
* ✅ Breach logging
* ✅ In-app notifications
* ✅ Optional email notifications
* ✅ JWT token generation and verification
* ✅ Interactive API testing
* ✅ Admin dashboard
* ✅ Automated testing
* ✅ 65 passing backend tests

---

## 👨‍💻 Author

**Yash Barai**

MCA Student | Full Stack Developer

Built as a full-stack backend-focused project to explore **API protection, rate-limiting algorithms, authentication, concurrency, MongoDB atomic operations, and system design**.
