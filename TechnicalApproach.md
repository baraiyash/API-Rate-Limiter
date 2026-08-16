# Technical Approach — API Rate Limiter

## 1. Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js v24 | JavaScript ecosystem, excellent async I/O for API servers |
| **Backend Framework** | Express.js | Industry-standard, middleware-centric architecture fits rate-limiting pattern |
| **Database** | MongoDB + Mongoose | Schema-flexible, TTL indexes for auto-expiry, atomic `findOneAndUpdate` |
| **Frontend** | React 18 + Vite | Modern SPA framework, fast dev server, component-based architecture |
| **Email** | Nodemailer | Standard Node.js email library, SMTP-configurable |
| **Testing** | Jest + Supertest | Comprehensive testing framework with HTTP assertion support |

## 2. Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │                Express.js Server                 │
                    │                                                  │
 Client Request ───►│  ┌──────────┐   ┌──────────────┐   ┌────────┐ │
                    │  │  CORS /   │──►│ Rate Limiter │──►│ Route  │ │
                    │  │  Helmet   │   │  Middleware   │   │Handler │ │
                    │  └──────────┘   └──────┬───────┘   └────────┘ │
                    │                         │                       │
                    │                    ┌────▼─────┐                │
                    │                    │ MongoDB  │                │
                    │                    │          │                │
                    │                    │ - Rules  │                │
                    │                    │ - Counters│               │
                    │                    │ - Breaches│               │
                    │                    │ - Notifs  │               │
                    │                    └────┬─────┘                │
                    │                         │                       │
                    │                 ┌───────▼────────┐             │
                    │                 │  Notification   │             │
                    │                 │  Service        │             │
                    │                 │ (In-App + Email)│             │
                    │                 └────────────────┘             │
                    └─────────────────────────────────────────────────┘

 React Dashboard ──► REST API (/api/rules, /api/breaches, /api/notifications, /api/stats)
```

### Request Processing Flow

1. **Request arrives** at Express.js server
2. **Standard middleware** processes it (CORS, Helmet security headers, JSON parsing)
3. **Rate Limiter Middleware** intercepts the request:
   a. Extracts identity values (IP, domain, user) from the request
   b. Queries MongoDB for all **active rules**
   c. For each matching rule, performs atomic `findOneAndUpdate` on the counter collection
   d. If any counter exceeds the rule's `maxRequests` → **reject with 429**
   e. Otherwise → **pass to route handler**
4. On breach: **Notification Service** creates in-app notification + optional email

## 3. Rate Limiting Algorithm — Sliding Window Counter

### Why Sliding Window Counter?

| Algorithm | Pros | Cons | Decision |
|---|---|---|---|
| **Fixed Window** | Simple | Burst at window boundaries | ❌ |
| **Sliding Window Log** | Most accurate | High memory usage (stores every request timestamp) | ❌ |
| **Token Bucket** | Smooth, allows bursts | Complex state management | ❌ |
| **Sliding Window Counter** | Good accuracy, low memory | Slight approximation | ✅ Selected |

### Implementation Detail

For each rate-limit check, we compute:
- **Current window** start time (aligned to the period boundary)
- **Previous window** start time
- A **weighted count** combining the previous window's count with the current window's count

```
weightedCount = (previousCount * overlapRatio) + currentCount

where overlapRatio = 1 - (elapsedTimeInCurrentWindow / windowDuration)
```

This provides near-accurate rate limiting without storing individual request timestamps.

### Counter Storage (MongoDB)

```javascript
// RequestLog document
{
  ruleId: ObjectId,        // Which rule this counter belongs to
  identityValue: "192.168.1.1",
  windowStart: ISODate,    // Start of the time window
  count: 42,               // Number of requests in this window
  expiresAt: ISODate       // TTL — MongoDB auto-deletes expired documents
}
```

- **TTL Index** on `expiresAt` field — MongoDB automatically removes expired counter documents
- **Compound Index** on `(ruleId, identityValue, windowStart)` for fast lookups
- **Atomic operations** via `findOneAndUpdate` with `$inc` to prevent race conditions

## 4. Data Models

### 4.1 Rule

```javascript
{
  name: String,              // Human-readable name, e.g., "IP Per Minute Limit"
  identityType: {
    type: String,
    enum: ['ip', 'domain', 'user']
  },
  period: {
    type: String,
    enum: ['minute', 'hour', 'day']
  },
  maxRequests: Number,       // Maximum allowed requests in the period
  active: Boolean,           // Enable/disable without deleting
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 RequestLog (Counter)

```javascript
{
  ruleId: ObjectId,          // Reference to Rule
  identityValue: String,     // The actual IP, domain, or user ID
  windowStart: Date,         // Aligned window start time
  count: Number,             // Requests counted in this window
  expiresAt: Date            // Set to windowStart + 2 * windowDuration
}
// Indexes: { ruleId: 1, identityValue: 1, windowStart: 1 } (compound, unique)
// TTL Index: { expiresAt: 1 }, expireAfterSeconds: 0
```

### 4.3 BreachLog

```javascript
{
  ruleId: ObjectId,
  ruleName: String,
  identityType: String,
  identityValue: String,
  period: String,
  maxRequests: Number,
  actualCount: Number,
  timestamp: Date,
  notified: Boolean
}
```

### 4.4 Notification

```javascript
{
  title: String,
  message: String,
  type: { type: String, enum: ['breach', 'warning', 'info'] },
  ruleId: ObjectId,
  identityValue: String,
  read: Boolean,
  createdAt: Date
}
```

## 5. API Design

### Rate Limit Rules
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/rules` | List all rules |
| POST | `/api/rules` | Create a new rule |
| PUT | `/api/rules/:id` | Update a rule |
| DELETE | `/api/rules/:id` | Delete a rule |

### Breach Logs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/breaches` | List breach logs (with query filters) |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |

### Dashboard Stats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Get dashboard statistics |

### Test Endpoint (Rate Limited)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/test` | Test endpoint protected by rate limiter |
| POST | `/api/test` | Test endpoint with custom headers for identity simulation |

## 6. Identity Extraction Strategy

| Identity Type | Extraction Method | Header / Token Format | Description |
|---|---|---|---|
| **IP Address** | `req.ip` / `remoteAddress` | Automatic / `X-Forwarded-For` | Extracts client IP (supports reverse proxies via `trust proxy`) |
| **Domain** | Request header | `X-Domain` or `Origin` header | Extracts consumer domain or origin |
| **Signed-in User / Customer** | **JWT Token** / Custom header | `Authorization: Bearer <jwt>` or `X-User-Id` | Decodes JWT payload (`userId`, `id`, `sub`, `email`) or uses header |

### JWT Authentication Flow:
1. Incoming request contains `Authorization: Bearer <jwt_token>`.
2. The Rate Limiter middleware verifies and decodes the token using `jsonwebtoken` with `JWT_SECRET`.
3. The unique `userId` or `id` claim is extracted as the rate-limiting identity.
4. Counter documents are isolated per authenticated user ID across their session.
5. Built-in endpoints at `/api/auth/token` allow generating valid signed tokens for testing.

## 7. Notification Mechanism

### In-App Notifications
- Stored in MongoDB `notifications` collection
- Displayed in the admin dashboard via a notification panel
- Badge count for unread notifications in the header

### Email Notifications
- Sent via **Nodemailer** with configurable SMTP transport
- Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL`
- **Graceful degradation**: If SMTP is not configured, only in-app notifications are created (no errors)

### Deduplication
- Before creating a notification, the service checks if a notification for the same rule + identity exists within the last 5 minutes
- Prevents alert flooding during sustained breach scenarios

## 8. Frontend Architecture

```
src/
├── App.jsx              # Router setup
├── index.css            # Design system
├── main.jsx             # Entry point
├── components/
│   ├── Sidebar.jsx      # Navigation
│   ├── Header.jsx       # Top bar with notification bell
│   ├── RuleForm.jsx     # Add/Edit rule modal
│   └── StatsCard.jsx    # Dashboard stat card
├── pages/
│   ├── Dashboard.jsx    # Overview + stats
│   ├── Rules.jsx        # Rule management table
│   ├── BreachLogs.jsx   # Breach history
│   ├── Notifications.jsx # Notification center
│   └── TestAPI.jsx      # Interactive API tester
└── services/
    └── api.js           # Axios instance + API functions
```

### Design Approach
- **Dark mode** with glassmorphism effects
- **Gradient accents** for visual hierarchy
- **Micro-animations** for interactive feedback
- **Responsive layout** with sidebar navigation
- **Google Fonts** (Inter) for modern typography

## 9. Error Handling

- **Rate limiter failure (MongoDB down)**: Fail open — allow request through, log warning
- **Invalid rule configuration**: Validation at API and database layer
- **Email send failure**: Log error, do not block notification creation
- **Frontend API errors**: Toast notifications with error details

## 10. Scalability Considerations

While designed for single-instance deployment, the architecture supports scaling:

1. **MongoDB is centralized** — Multiple app instances can share the same rate-limit counters
2. **Atomic operations** — `findOneAndUpdate` with `$inc` is safe under concurrency
3. **TTL indexes** — Automatic data cleanup without cron jobs
4. **Stateless middleware** — No in-memory state; all data in MongoDB

Future enhancements for scale: Redis as a faster counter store, sharded MongoDB, message queue for notifications.

## 11. Project Structure

```
APIRateLimiter/
├── BusinessRequirements.md
├── TechnicalApproach.md
├── UnitTestCases.md
├── README.md
├── package.json              # Root: concurrently runs server + client
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
│       ├── rateLimiter.test.js
│       ├── rules.test.js
│       ├── notification.test.js
│       └── helpers.test.js
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── pages/
        └── services/
```
