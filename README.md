# API Rate Limiter

A full-stack **MERN** (MongoDB, Express.js, React, Node.js) application that provides configurable API rate limiting with an admin dashboard, breach notifications, and comprehensive testing.

## Features

- **Configurable Rate Limit Rules** — Create rules by identity type (IP, Domain, User) and time period (Minute, Hour, Day)
- **Sliding Window Counter Algorithm** — Accurate rate limiting without boundary-burst issues
- **Admin Dashboard** — Real-time stats, breach activity chart, rule management
- **Breach Notifications** — In-app notifications + optional email alerts via SMTP
- **Interactive API Tester** — Fire test requests and observe rate limiting in action
- **Comprehensive Tests** — 65 automated tests (unit + integration) with Jest & Supertest

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Testing | Jest, Supertest, mongodb-memory-server |
| Email | Nodemailer (optional SMTP) |

## Prerequisites

- **Node.js** v18+ (v24 recommended)
- **MongoDB** running locally on `mongodb://localhost:27017`

## Quick Start

### 1. Install Dependencies

```bash
# From project root — installs server + client + root deps
npm run install:all
```

Or install each individually:

```bash
cd server && npm install
cd ../client && npm install
cd .. && npm install
```

### 2. Configure Environment

The server uses a `.env` file in the `server/` directory. A default one is provided:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rateLimiter

# Optional — Email notifications
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ADMIN_EMAIL=admin@example.com
```

### 3. Start the Application

```bash
# From project root — starts both server (port 5000) and client (port 3000)
npm run dev
```

Or start individually:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 4. Open the Dashboard

Navigate to **http://localhost:3000** in your browser.

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
cd server && npx jest tests/rateLimiter.test.js
```

### Test Results

All **65 tests** pass across 4 test suites:

| Suite | Tests | Coverage |
|---|---|---|
| `helpers.test.js` | 17 | Utility functions |
| `rules.test.js` | 16 | Rule CRUD API |
| `rateLimiter.test.js` | 21 | Rate limiter middleware |
| `notification.test.js` | 11 | Notification service |

## API Endpoints

### Rate Limit Rules
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rules` | List all rules |
| `POST` | `/api/rules` | Create a new rule |
| `PUT` | `/api/rules/:id` | Update a rule |
| `DELETE` | `/api/rules/:id` | Delete a rule |

### Test Endpoint (Rate Limited)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/test` | Test endpoint protected by rate limiter |

### Breach Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/breaches` | List breach logs |
| `DELETE` | `/api/breaches` | Clear all breach logs |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | List notifications + unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |

### Dashboard Stats
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Dashboard statistics |

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health status |

## How to Use

1. **Create a Rule** — Go to "Rate Limit Rules" → click "Add Rule"
   - Example: Name: "IP Per Minute", Identity: IP Address, Period: Per Minute, Max: 10
2. **Test It** — Go to "Test API" → set number of requests > your limit → click "Send Requests"
3. **Observe** — Watch successful requests turn to 429 errors when the limit is hit
4. **Check Notifications** — The bell icon will show a badge; click to see breach details
5. **Review Logs** — Go to "Breach Logs" to see the full breach history

## Project Structure

```
APIRateLimiter/
├── BusinessRequirements.md     # Business requirements document
├── TechnicalApproach.md        # Technical design document
├── UnitTestCases.md            # Test case documentation
├── README.md                   # This file
├── package.json                # Root — concurrent dev scripts
├── server/
│   ├── package.json
│   ├── .env                    # Environment config
│   ├── src/
│   │   ├── app.js              # Express app setup
│   │   ├── server.js           # Entry point + MongoDB connection
│   │   ├── middleware/
│   │   │   └── rateLimiter.js  # Core rate limiting logic
│   │   ├── models/
│   │   │   ├── Rule.js         # Rate limit rule schema
│   │   │   ├── RequestLog.js   # Counter schema (with TTL)
│   │   │   ├── BreachLog.js    # Breach record schema
│   │   │   └── Notification.js # Admin notification schema
│   │   ├── routes/
│   │   │   ├── ruleRoutes.js
│   │   │   ├── breachRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── statsRoutes.js
│   │   │   └── testRoutes.js
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   └── utils/
│   │       └── helpers.js
│   └── tests/
│       ├── helpers.test.js
│       ├── rules.test.js
│       ├── rateLimiter.test.js
│       └── notification.test.js
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css           # Design system
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   └── RuleForm.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── Rules.jsx
        │   ├── BreachLogs.jsx
        │   ├── Notifications.jsx
        │   └── TestAPI.jsx
        └── services/
            └── api.js
```

## Design Decisions

1. **Sliding Window Counter** — Chosen over fixed-window (boundary bursts) and token-bucket (complexity). Provides good accuracy with low storage overhead.
2. **MongoDB TTL Indexes** — Counter documents auto-expire without cron jobs.
3. **Atomic Operations** — `findOneAndUpdate` with `$inc` ensures race-condition-free counter increments.
4. **Fail Open** — If MongoDB is unavailable during a rate check, requests are allowed through (with warning logs) rather than blocking all traffic.
5. **Notification Deduplication** — 5-minute cooldown prevents alert flooding during sustained breaches.

## AI Tools Used

This project was developed with AI-assisted coding (Google Antigravity / Claude). AI was used for:

- Requirement analysis and documentation
- Architecture design and algorithm selection
- Code generation (backend, frontend, tests)
- Test case design and generation
- Code review and troubleshooting

All AI-generated code was reviewed, validated, and tested. The developer is responsible for and can explain all implementation details.
