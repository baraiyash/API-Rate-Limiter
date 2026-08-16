# Business Requirements — API Rate Limiter

## 1. Overview

The company exposes APIs consumed by various applications and customers. To protect these APIs from excessive usage, accidental traffic spikes, and potential misuse, a **Rate Limiting System** is required. This system will control how frequently API requests can be made, based on configurable rules tied to different time periods and request identities.

## 2. Business Objectives

1. **API Protection** — Prevent API abuse, denial-of-service scenarios, and unintentional overload from misbehaving clients.
2. **Fair Usage** — Ensure equitable access to API resources across all consumers.
3. **Visibility** — Provide administrators with real-time insight into rate-limit breaches and usage patterns.
4. **Proactive Alerting** — Notify IT administrators when rate limits are breached so corrective action can be taken promptly.
5. **Configurability** — Allow administrators to define, modify, and deactivate rate-limit rules without code changes.

## 3. Functional Requirements

### 3.1 Rate Limit Configuration

| Requirement | Description |
|---|---|
| **FR-1** | Administrators must be able to create rate-limit rules specifying an identity type, time period, and maximum allowed requests. |
| **FR-2** | Supported **time periods**: Per Minute, Per Hour, Per Day. |
| **FR-3** | Supported **identity types**: IP Address, Domain, Signed-in User/Customer. |
| **FR-4** | Rules can be activated or deactivated without deletion. |
| **FR-5** | Multiple rules can coexist — e.g., an IP-based per-minute rule alongside a domain-based per-hour rule. |
| **FR-6** | Rules are applied to all incoming API requests passing through the rate-limiter middleware. |

### 3.1.1 Pre-configured Default Rules Matrix (15 Rules)

The system provides 15 standard, out-of-the-box rate limiting rules (5 for each identity type across minute, hour, and day periods):

| # | Rule Name | Identity Type | Period | Max Requests | Purpose |
|---|---|---|---|---|---|
| 1 | **IP Strict Burst Limit** | IP Address (`ip`) | Per Minute | 15 | Protect against aggressive rapid-fire bursts |
| 2 | **IP Standard Rate** | IP Address (`ip`) | Per Minute | 60 | Standard browsing / API consumer limit |
| 3 | **IP Standard Hourly Quota** | IP Address (`ip`) | Per Hour | 1,000 | Hourly usage limit per IP address |
| 4 | **IP High-Volume Hourly** | IP Address (`ip`) | Per Hour | 3,000 | High-traffic IP ceiling |
| 5 | **IP Daily Maximum Cap** | IP Address (`ip`) | Per Day | 15,000 | Absolute 24h quota per IP address |
| 6 | **Domain Webhook Burst Limit** | Domain (`domain`) | Per Minute | 50 | Ingestion rate control for external domains |
| 7 | **Domain Standard Traffic** | Domain (`domain`) | Per Minute | 200 | Standard partner domain access |
| 8 | **Domain Partner Hourly Quota** | Domain (`domain`) | Per Hour | 5,000 | Regular hourly throughput allocation |
| 9 | **Domain Enterprise Hourly** | Domain (`domain`) | Per Hour | 20,000 | High-capacity enterprise integration |
| 10 | **Domain Daily Aggregation Cap**| Domain (`domain`) | Per Day | 100,000 | Daily volume boundary per domain |
| 11 | **Customer Free Tier Rate** | User / Customer (`user`) | Per Minute | 30 | Free plan minute throttling |
| 12 | **Customer Pro Tier Rate** | User / Customer (`user`) | Per Minute | 150 | Paid tier responsive rate limit |
| 13 | **Customer Basic Hourly Limit** | User / Customer (`user`) | Per Hour | 1,500 | Standard hourly allocation per user |
| 14 | **Customer Premium Hourly Limit**| User / Customer (`user`) | Per Hour | 10,000 | VIP / Premium tier hourly quota |
| 15 | **Customer Fair Use Daily Cap** | User / Customer (`user`) | Per Day | 50,000 | Fair-usage 24-hour boundary per account |

### 3.2 Rate Limit Enforcement

| Requirement | Description |
|---|---|
| **FR-7** | When a request arrives, the system evaluates all active rules applicable to the request's identity. |
| **FR-8** | If any rule's limit is exceeded, the request is rejected with HTTP **429 Too Many Requests**. |
| **FR-9** | The 429 response must include a `Retry-After` header indicating how long the client should wait. |
| **FR-10** | If no rules are breached, the request proceeds normally. |
| **FR-11** | Request counters must reset automatically at the start of each new time window. |

### 3.3 Breach Notification

| Requirement | Description |
|---|---|
| **FR-12** | When a rate limit is breached, a notification must be created for the IT administrator. |
| **FR-13** | Notifications include: rule name, identity value (IP/domain/user), time of breach, and the limit that was exceeded. |
| **FR-14** | Notifications are accessible through an in-app notification panel. |
| **FR-15** | Email notifications are sent if SMTP is configured. |
| **FR-16** | Duplicate notifications for the same breach within a cooldown window (5 minutes) must be suppressed to avoid alert fatigue. |

### 3.4 Admin Dashboard

| Requirement | Description |
|---|---|
| **FR-17** | A web-based dashboard for administrators to manage rate-limit rules (CRUD operations). |
| **FR-18** | Dashboard displays breach logs with filtering capability. |
| **FR-19** | Dashboard shows overview statistics: active rules, total requests processed, breaches today. |
| **FR-20** | Dashboard provides a test interface to fire API requests and observe rate limiting in real time. |
| **FR-21** | Notification bell indicator showing unread breach notifications. |

## 4. Non-Functional Requirements

| Requirement | Description |
|---|---|
| **NFR-1** | **Performance** — Rate-limit checks must add minimal latency (< 50ms) to each API request. |
| **NFR-2** | **Accuracy** — Counters must be atomically incremented to prevent race conditions under concurrent load. |
| **NFR-3** | **Data Cleanup** — Expired counter records must be automatically purged (via TTL indexes). |
| **NFR-4** | **Reliability** — If the rate-limit store is unavailable, requests should fail open (allow through) with a warning log. |
| **NFR-5** | **Configurability** — All operational parameters (MongoDB URI, port, SMTP settings) are externalized via environment variables. |
| **NFR-6** | **Testability** — The system must have comprehensive automated unit and integration tests. |

## 5. Assumptions

1. **Single-instance deployment** — The system is designed for a single server instance. Distributed rate limiting (across multiple server nodes) is not in scope but could be achieved since MongoDB is centralized.
2. **Identity extraction**:
   - **IP Address** is extracted from `req.ip` (supports proxied requests via `trust proxy`).
   - **Domain** is extracted from the `Origin` or `X-Domain` request header.
   - **Signed-in User / Customer** is extracted from **JSON Web Tokens (JWT)** via `Authorization: Bearer <token>` headers (decoding `userId`, `id`, `sub`, or `email`), `req.user`, or the `X-User-Id` custom header.
3. **Authentication Support**:
   - Full JWT token verification and decoding supported.
   - Endpoints provided at `POST /api/auth/token` and `POST /api/auth/verify` for token generation and verification.
   - Test workbench includes a 1-click JWT generator to simulate authenticated customer sessions.
4. **Notification cooldown** — A 5-minute cooldown between repeated breach notifications for the same rule + identity combination to avoid alert flooding.
5. **MongoDB availability** — A running MongoDB instance is required. The application provides a `.env` file for connection configuration.
6. **Email is optional** — The system functions fully without SMTP configuration; email notifications are an enhancement.
7. **No rate-limit bypass/allowlisting** — Allowlisting specific IPs or users is not in scope but could be added as a future enhancement.
8. **Dashboard access** — The admin dashboard does not require authentication for this exercise. In production, it would be protected.

## 6. Out of Scope

- Distributed rate limiting across multiple application instances
- API key-based identity and management
- Webhook-based notifications
- Rate limit response customization per rule
- Historical analytics and trend reporting
- Multi-tenancy / organization-level rules

## 7. Success Criteria

1. Rate-limit rules can be created, read, updated, and deleted via the dashboard.
2. Incoming API requests are correctly rate-limited based on configured rules.
3. Breached requests receive HTTP 429 with appropriate headers.
4. Admin notifications are created and visible on breach.
5. Automated tests pass covering positive, negative, and boundary scenarios.
