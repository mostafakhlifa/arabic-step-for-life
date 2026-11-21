# API Documentation — Arabic Step for Life Organization, Inc.

Backend: Node.js + Express + PostgreSQL + Prisma. The server serves the static
frontend from `public/` and the JSON API under `/api`.

- **Base URL:** `http://localhost:3000` (or `APP_URL` in production)
- **Auth:** session cookie (`express-session`, PostgreSQL-backed store).
  Frontend requests must use `fetch(url, { credentials: 'same-origin' })`.
- **Envelope:** every response is `{ "success": true, "data": ... }` or
  `{ "success": false, "error": "message" }`.
- **Roles:** `USER`, `ADMIN`, `SUPER_ADMIN`. Inactive users cannot log in and
  their existing sessions are rejected.
- **Rate limiting:** strict limiters on login / register / forgot-password /
  reset-password (10–20 attempts per 15 minutes per IP); a general limiter
  (1000 / 15 min) guards `/api`.

> **Stripe is test mode only.** Donations return
> `503 { "success": false, "error": "...", "setupRequired": true }` until
> `STRIPE_SECRET_KEY` (test key) is configured.

> **No invented data.** Impact stats start at 0 and are edited by admins from
> real figures. No EIN, registration number, tax status, address, phone,
> testimonials, or statistics are invented anywhere in this API.

---

## Auth — `/api/auth`

### POST `/api/auth/register`
Create an account (also logs the user in via session).

```jsonc
// Request
{ "firstName": "Layla", "lastName": "Haddad", "email": "layla@example.org",
  "phone": "+1 555 0100", "password": "at-least-8-chars" }
// Response 201
{ "success": true, "data": { "user": {
  "id": "cm...", "firstName": "Layla", "lastName": "Haddad",
  "email": "layla@example.org", "phone": "+1 555 0100", "role": "USER",
  "isActive": true, "emailVerified": false, "createdAt": "2026-11-18T..." } } }
```
409 if the email is already registered. A verification email is sent only when
SMTP is configured.

### POST `/api/auth/login`
```jsonc
// Request
{ "email": "layla@example.org", "password": "at-least-8-chars" }
// Response 200 — same { user } shape as register. 401 on bad credentials.
```

### POST `/api/auth/logout`
Destroys the session. → `200 { "success": true, "data": { "message": "Logged out." } }`

### GET `/api/auth/me`
Current user (`401` when not logged in). → `200 { user }`

### GET `/api/auth/verify?token=XXX`
Marks the email verified. → `200 { user, "message": "Email verified." }`
(400 if the token is invalid/expired.)

### POST `/api/auth/forgot-password`
```jsonc
// Request
{ "email": "layla@example.org" }
// Response 200 — ALWAYS the same generic message (no account enumeration):
{ "success": true, "data": { "message": "If an account exists for that email, a reset link has been sent." } }
```

### POST `/api/auth/reset-password`
```jsonc
// Request
{ "token": "hex-token-from-email", "newPassword": "new-password-8+" }
// Response 200
{ "success": true, "data": { "message": "Password has been reset. You can now log in." } }
```

### GET `/api/auth/profile` · PUT `/api/auth/profile` (auth)
```jsonc
// PUT request
{ "firstName": "Layla", "lastName": "Haddad", "phone": "+1 555 0100" }
// Response 200 — { user }
```

---

## Programs (public) — `/api/programs`

Categories: `BURN_SUPPORT`, `NEWCOMER`, `ARABIC`, `COMMUNITY`.

### GET `/api/programs`
Active programs only.
```jsonc
{ "success": true, "data": [ {
  "id": "cm...", "slug": "arabic-language-learning", "title": "Arabic Language Learning",
  "category": "ARABIC", "shortDescription": "...", "description": "...",
  "imageUrl": "https://images.unsplash.com/...", "isActive": true } ] }
```

### GET `/api/programs/:slug`
One active program (`404` if missing/inactive). Admins use
`GET /api/admin/programs/:id` for any program.

---

## Applications — `/api/applications`

Statuses (enum + human label): `PENDING`/`Pending`, `UNDER_REVIEW`/`Under Review`,
`APPROVED`/`Approved`, `REJECTED`/`Rejected`, `COMPLETED`/`Completed`.

### POST `/api/applications` (auth)
```jsonc
// Request
{ "programId": "cm...", "applicantFirstName": "Layla", "applicantLastName": "Haddad",
  "applicantEmail": "layla@example.org", "applicantPhone": "+1 555 0100",
  "details": "I would like to join...", "needs": "Evening classes if possible" }
// Response 201
{ "success": true, "data": { "application": {
  "id": "cm...", "trackingCode": "ASL-2026-A1B2C3", "userId": "cm...", "programId": "cm...",
  "programTitle": "Arabic Language Learning", "applicantFirstName": "Layla",
  "status": "PENDING", "statusLabel": "Pending", "createdAt": "...", "updatedAt": "..." } } }
```

### GET `/api/applications/mine` (auth)
Own applications, newest first. → `200 [application, ...]`

### GET `/api/applications/track/:code?email=xxx` (public)
Returns `{ trackingCode, status, statusLabel, programTitle, submittedAt }`
**only if** the `email` query matches the applicant email (`403` otherwise,
`404` for an unknown code).

### GET `/api/applications/:id` (auth)
Own application only (`403` for someone else's; admins may read any).

---

## Messages — `/api/messages` (auth)

### GET `/api/messages`
Own messages (sent + received), newest first. Admins also see messages
addressed to the organization.
```jsonc
{ "success": true, "data": [ {
  "id": "cm...", "senderId": "cm...", "senderName": "Layla Haddad", "senderRole": "USER",
  "recipientId": null, "applicationId": "cm...", "subject": "Question",
  "body": "...", "isRead": false, "createdAt": "..." } ] }
```

### POST `/api/messages` (auth)
```jsonc
// Request — omit recipientId to write to the admins; include applicationId
// or recipientId when replying.
{ "recipientId": "cm...", "applicationId": "cm...", "subject": "Hello", "body": "..." }
// Response 201 — the created message. The other side is notified.
```

### PATCH `/api/messages/:id/read` (auth)
Mark read (recipient only; any admin may mark admin-addressed messages read).

---

## Notifications — `/api/notifications` (auth)

### GET `/api/notifications`
Own notifications, newest first.
```jsonc
{ "success": true, "data": [ {
  "id": "cm...", "userId": "cm...", "type": "APPLICATION_STATUS",
  "title": "Application Approved", "body": "...", "link": "/dashboard.html",
  "isRead": false, "createdAt": "..." } ] }
```

### GET `/api/notifications/unread-count`
→ `200 { "count": 3 }`

### PATCH `/api/notifications/:id/read` · PATCH `/api/notifications/read-all`
Mark one / all own notifications as read.

---

## Stats (public) — `/api/stats`

### GET `/api/stats`
```jsonc
{ "success": true, "data": {
  "peopleSupported": 0, "volunteers": 0, "statesReached": 0, "corePrograms": 6 } }
```
`corePrograms` is computed (count of active programs). The other values come
from the `impact_stats` table only.

---

## Donations — `/api/donations`

### POST `/api/donations/checkout`
One-time donation via Stripe Checkout (**test mode only**).
```jsonc
// Request — amount in USD dollars, min 1, max 100000
{ "amount": 50, "donorName": "Layla Haddad", "donorEmail": "layla@example.org",
  "message": "With love" }
// Response 200
{ "success": true, "data": { "url": "https://checkout.stripe.com/c/pay/..." } }
// Response 503 when Stripe is not configured
{ "success": false, "error": "Online donations are not configured yet...",
  "setupRequired": true }
```

### GET `/api/donations/verify?session_id=XXX`
After the success redirect. Confirms the session with Stripe and returns the
completed donation.
```jsonc
{ "success": true, "data": { "donation": {
  "id": "cm...", "amount": 50, "amountCents": 5000, "currency": "usd",
  "status": "COMPLETED", "donorName": "Layla Haddad",
  "donorEmail": "layla@example.org", "createdAt": "..." } } }
```

### POST `/api/webhooks/stripe`
Stripe webhook (raw body, signature verified with `STRIPE_WEBHOOK_SECRET`).
`checkout.session.completed` inserts/updates the donation as `COMPLETED`;
`checkout.session.expired` marks pending donations `FAILED`. → `200 { "received": true }`

---

## Contact — `/api/contact`

### POST `/api/contact`
```jsonc
// Request
{ "name": "Layla", "email": "layla@example.org", "phone": "+1 555 0100",
  "subject": "Volunteering", "message": "I would like to help..." }
// Response 201
{ "success": true, "data": { "id": "cm...", "message": "Thank you for contacting us..." } }
```
Always stored in Postgres. An email notification is sent only when SMTP is
configured and `CONTACT_NOTIFICATION_EMAIL` is set.

---

## Admin — `/api/admin` (role `ADMIN` or `SUPER_ADMIN` unless noted)

### GET `/api/admin/overview`
```jsonc
{ "success": true, "data": {
  "totalUsers": 12, "totalApplications": 8, "pendingApplications": 3,
  "activePrograms": 6, "donationsTotal": 250, "donationsCount": 5,
  "recentApplications": [ { "id": "...", "trackingCode": "ASL-2026-...",
    "applicantFirstName": "...", "status": "PENDING", "programTitle": "...",
    "createdAt": "..." } ] } }
```

### Applications
- `GET /api/admin/applications?search=&status=&programId=&page=&limit=`
  → `200 { "items": [application...], "total": 8, "page": 1, "pages": 1 }`
- `PATCH /api/admin/applications/:id/status` `{ "status": "APPROVED" }`
  → updates, notifies the applicant, and writes an audit log.

### Programs
- `GET /api/admin/programs` — all programs, including inactive.
- `POST /api/admin/programs`
  `{ "title", "slug?" (auto-generated from title if omitted), "category",
    "shortDescription", "description", "imageUrl?", "isActive?" }` → `201`
- `PUT /api/admin/programs/:id` — partial update.
- `DELETE /api/admin/programs/:id` — refused (409) if the program has applications.
- `PATCH /api/admin/programs/:id/toggle` — flips `isActive`.

### Stats
- `GET /api/admin/stats` → `{ peopleSupported, volunteers, statesReached }`
- `PUT /api/admin/stats` `{ "peopleSupported": 120, "volunteers": 25, "statesReached": 4 }`

### Users
- `GET /api/admin/users?search=&page=` → `{ "items": [user...], "total": 12, "page": 1, "pages": 1 }`
- `PATCH /api/admin/users/:id/role` `{ "role": "ADMIN" }` — **SUPER_ADMIN only**
- `PATCH /api/admin/users/:id/status` `{ "isActive": false }` — **SUPER_ADMIN only**.
  Cannot deactivate your own account or the last active super admin.

### Messages
- `GET /api/admin/messages?userId=&applicationId=` — all messages.
- `POST /api/admin/messages`
  `{ "recipientId", "applicationId?", "subject", "body" }` → `201` (recipient notified).

### Donations
- `GET /api/admin/donations?page=` → `{ "items": [donation...], "total": 5, "page": 1, "pages": 1 }`

### Global search
- `GET /api/admin/search?q=layla`
  → `200 { "users": [...], "applications": [...] }` (max 10 each)

### Audit logs
- `GET /api/admin/audit-logs?page=`
  → `200 { "items": [ { "id", "actorId", "actorName", "actorEmail", "action",
  "targetType", "targetId", "details", "createdAt" } ], "total", "page", "pages" }`

### Contact messages
- `GET /api/admin/contact-messages` → paginated `{ items, total, page, pages }`
- `PATCH /api/admin/contact-messages/:id/read`

---

## Health check

### GET `/api/health`
→ `200 { "success": true, "data": { "status": "ok" } }` (no database access).

---

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL, SESSION_SECRET, Stripe test keys
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev (development)
npm run db:seed             # requires SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev                 # nodemon on http://localhost:3000
```

Without a live database, run `psql "$DATABASE_URL" -f scripts/schema.sql` as a
plain-SQL fallback, then `npm run db:seed`. Create extra admins any time with
`npm run create-admin`.
