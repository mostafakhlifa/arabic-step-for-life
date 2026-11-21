# Arabic Step for Life Organization, Inc. — Website

> **"Healing, Belonging & Hope"**

A complete, production-ready website for Arabic Step for Life Organization, Inc., a US-based nonprofit supporting burn survivors, immigrants and newcomers, Arabic language learners, and the wider community.

This package contains the **full working application** — frontend, backend, database schema and migrations, authentication, user and admin dashboards, program applications, messaging, notifications, impact statistics, contact handling, and Stripe Checkout donation integration (test mode).

> **v2 restyle (2026-11-19):** the frontend was restyled with the warm illustrated design system from the organization's alternate "mouse" build — cream background, deep teal, terracotta calls-to-action, Manrope + Inter typography, illustrated heroes, dropdown navigation, and site search. The backend, database schema, and API are **unchanged** from v1. If you are upgrading an already-running v1 copy, replace the project files (keep your existing `.env` and database — no migration or re-seed is needed) and restart the server.

---

## Table of contents

1. [Features](#1-features)
2. [Technology stack](#2-technology-stack)
3. [Project structure](#3-project-structure)
4. [Quick start (local development)](#4-quick-start-local-development)
5. [Admin account setup](#5-admin-account-setup)
6. [Configuration reference](#6-configuration-reference)
7. [Production deployment](#7-production-deployment)
8. [Database backup & restore](#8-database-backup--restore)
9. [Stripe donations setup](#9-stripe-donations-setup)
10. [Email setup](#10-email-setup)
11. [Testing](#11-testing)
12. [What is implemented / needs credentials / incomplete](#12-what-is-implemented--needs-credentials--incomplete)
13. [Placeholders — information the organization must provide](#13-placeholders--information-the-organization-must-provide)
14. [Security notes](#14-security-notes)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Features

### Public website (13 pages + supporting pages)

| Page | File | Notes |
|---|---|---|
| Home | `public/index.html` | Hero, mission/vision, featured programs and impact stats loaded live from the API |
| About Us | `public/about.html` | Story, values, what we do |
| Our Programs | `public/programs.html` | Dynamic list of active programs from the database, filterable by category |
| Program detail + application | `public/program.html` | Per-program page (`?slug=…`) with its own application form |
| Burn Survivor Support | `public/burn-support.html` | |
| Newcomer Support | `public/newcomer-support.html` | |
| Arabic Learning | `public/arabic-learning.html` | |
| Get Involved | `public/get-involved.html` | Volunteer, partner, and donate calls to action |
| Donate | `public/donate.html` | Suggested + custom amounts, Stripe Checkout, success/cancel handling |
| Contact Us | `public/contact.html` | Form stored in the database and visible to admins |
| Account Registration | `public/register.html` | |
| Login | `public/login.html` | |
| User Dashboard | `public/dashboard.html` | Profile, applications, tracking, notifications, messages |
| Admin Dashboard | `public/admin.html` | Overview, applications, programs, stats, users, donations, messages, search, audit log |
| Email verification | `public/verify.html` | Landing page for verification links |
| Forgot / reset password | `public/forgot-password.html`, `public/reset-password.html` | |

Design: teal / navy / orange / green brand palette, responsive layouts (desktop, tablet, mobile), accessible forms and navigation, subtle animations.

### Programs

- Programs live in PostgreSQL and are managed by admins (create, edit, activate/hide, delete with confirmation).
- The public Programs page and homepage automatically show only **active** programs.
- Each program has its own application flow.

### Users & authentication

- Registration, login/logout, bcrypt password hashing (cost 12), session-based auth (PostgreSQL-backed sessions).
- Email verification, forgot-password / password-reset flows.
- Roles: `USER`, `ADMIN`, `SUPER_ADMIN`. Role-based authorization on every protected route and API endpoint.
- Inactive users cannot log in, and their existing sessions are rejected.

### Applications

- Unique tracking code per application (e.g. `ASL-2026-6HU2K4`).
- Statuses: Pending → Under Review → Approved / Rejected → Completed.
- Public tracking by code + applicant email (email must match).
- Users see only their own applications; admins can search (tracking code, name, email, phone), filter by status/program, update status, and message applicants.

### Messaging & notifications

- Admin-to-user messaging with persistent history and user replies.
- In-app notifications for application status changes and new messages, with unread counts and mark-read.

### Admin dashboard

- Overview: total users, total/pending applications, active programs, donations summary, recent applications.
- Program CRUD, impact-statistics editor (People Supported, Volunteers, States Reached; **Core Programs is calculated automatically** from active programs and updates the homepage live).
- User management: view, activate/deactivate, change roles — **only SUPER_ADMIN** may change roles or deactivate accounts; self-deactivation is blocked; the last active SUPER_ADMIN cannot be deactivated or demoted.
- Global search across users and applications; audit log for sensitive operations; donation history; contact-form inbox.

### Donations (Stripe test mode)

- One-time donations with suggested amounts ($25/$50/$100/$250) and custom amounts.
- Server-side Stripe Checkout session creation; webhook verification; confirmed donations stored in the database and listed for admins.
- **Test mode only.** Live keys are rejected by the server. Real donations are NOT enabled until the organization configures its own Stripe account — see [Section 9](#9-stripe-donations-setup).

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 (tested on Node 24) |
| Backend | Express.js 4 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | express-session + connect-pg-simple, bcrypt |
| Security | helmet, express-rate-limit, express-validator, cors |
| Payments | Stripe SDK (Checkout + webhooks, test mode) |
| Email | nodemailer (SMTP, optional) |
| Frontend | HTML, CSS, vanilla JavaScript served by Express (no build step) |
| Tests | Node's built-in test runner (`node --test`) |

---

## 3. Project structure

```
arabic-step-for-life/
├── package.json / package-lock.json
├── .env.example            # Placeholder env vars — copy to .env and fill in
├── .gitignore
├── API_CONTRACT.md         # API design reference (endpoints, JSON shapes)
├── README.md               # This file
├── prisma/
│   ├── schema.prisma       # Data model (10 tables, enums, relations)
│   └── migrations/         # SQL migrations (apply with prisma migrate deploy)
├── scripts/
│   ├── seed.js             # Seeds stats, 6 programs, SUPER_ADMIN (from env)
│   ├── create-admin.js     # Create/promote an admin (env/flags/interactive)
│   ├── schema.sql          # Plain-SQL fallback for the same schema
│   └── smoke-test.js       # Test suite (static + live HTTP checks)
├── src/
│   ├── server.js           # Entry point (PORT, default 3000)
│   ├── app.js              # Express app: security, sessions, routes, static files
│   ├── config/             # env.js, db.js (Prisma singleton)
│   ├── middleware/         # auth, validation, rate limiting, error handling
│   ├── routes/             # auth, programs, applications, messages,
│   │                       # notifications, stats, donations, contact, admin, webhooks
│   ├── controllers/        # Thin HTTP layer (10 controllers)
│   ├── services/           # Business logic (9 services)
│   └── utils/              # password, tokens, tracking codes, email, audit,
│                           # notifications, serializers, response helpers
├── public/                 # Frontend (HTML/CSS/JS, served by Express)
│   ├── *.html              # 18 pages (see feature table above)
│   ├── css/style.css       # Single design system
│   └── js/                 # api.js, layout.js, main.js, auth.js,
│                           # dashboard.js, admin.js
└── docs/
    ├── API.md              # Full API documentation with examples
    ├── DEPLOYMENT.md       # Production deployment guide
    ├── STRIPE.md           # Stripe test-mode configuration guide
    ├── EMAIL.md            # Email (SMTP) configuration guide
    └── TROUBLESHOOTING.md  # Common problems and fixes
```

---

## 4. Quick start (local development)

**Prerequisites:** Node.js ≥ 18, PostgreSQL 16 (server running locally or remotely), npm.

```bash
# 1. Unzip and enter the project
unzip Arabic-Step-for-Life-Website.zip
cd arabic-step-for-life

# 2. Install dependencies
npm install

# 3. Create the database (example: local PostgreSQL)
createdb arabic_step_for_life

# 4. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/arabic_step_for_life
#   SESSION_SECRET=<a long random string>
#   SEED_ADMIN_EMAIL=<admin email>  (for the seed script)
#   SEED_ADMIN_PASSWORD=<a strong password>

# 5. Generate the Prisma client and apply migrations
npx prisma generate
npx prisma migrate deploy

# 6. Seed initial data (impact stats, 6 sample programs, SUPER_ADMIN)
npm run db:seed

# 7. Start the server
npm run dev        # development (auto-restart)
# or
npm start          # production mode

# 8. Open http://localhost:3000
```

> **Note:** On a normal machine, plain `npm install` works. If a restrictive network proxy interrupts Prisma's engine download during install, install with `npm install --ignore-scripts` and then run `npx prisma generate` (see `docs/TROUBLESHOOTING.md`).

---

## 5. Admin account setup

The seed script creates the first `SUPER_ADMIN` **only from environment variables** — credentials are never hardcoded:

```bash
SEED_ADMIN_EMAIL=admin@your-org.org SEED_ADMIN_PASSWORD='<strong password>' npm run db:seed
```

To create additional admins later (or if you skipped seeding):

```bash
# Interactive prompts:
npm run create-admin

# Or with flags:
node scripts/create-admin.js --email admin@your-org.org --password '<strong>' --role SUPER_ADMIN
```

- Sign in at `/login.html` with the admin account, then open **Admin** in the header.
- Only a `SUPER_ADMIN` can change other users' roles or deactivate accounts.
- Change the seed password immediately after first login if it was shared with anyone.

---

## 6. Configuration reference

All settings come from environment variables (see `.env.example` — placeholders only, never real secrets):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Long random string for session signing |
| `PORT` | No | Server port (default `3000`) |
| `NODE_ENV` | No | `development` / `production` (secure cookies in production) |
| `APP_URL` | No | Public base URL, used in email links and Stripe redirects (default `http://localhost:3000`) |
| `CORS_ORIGIN` | No | Restrict CORS origin (defaults to reflecting the request origin) |
| `STRIPE_TEST_MODE` | No | Must be `true`; live keys are rejected |
| `STRIPE_SECRET_KEY` | For donations | Test secret key (`sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | For donations | Test publishable key (`pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | For donations | Webhook signing secret (`whsec_…`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | SMTP server for auth/contact emails (see `docs/EMAIL.md`) |
| `CONTACT_NOTIFICATION_EMAIL` | No | Address notified about new contact-form messages |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | For seeding | Initial SUPER_ADMIN credentials (env only) |

---

## 7. Production deployment

Full step-by-step instructions are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Summary:

1. Provision a server (or platform such as Render, Railway, Fly.io, or a VPS) and a managed PostgreSQL database.
2. Set `NODE_ENV=production`, a strong `SESSION_SECRET`, `DATABASE_URL`, and `APP_URL` (your real `https://` domain).
3. `npm install --omit=dev`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run db:seed` (once), then run `npm start` behind a process manager (e.g. `pm2` or `systemd`) and a reverse proxy (e.g. Nginx) with HTTPS.
4. Configure Stripe (test mode first) and SMTP.
5. Replace all `[Placeholder …]` content with the organization's real information.

---

## 8. Database backup & restore

```bash
# Backup (run regularly, e.g. nightly cron)
pg_dump "$DATABASE_URL" -F c -f backup-$(date +%F).dump

# Restore to an empty database
createdb arabic_step_for_life_restored
pg_restore -d arabic_step_for_life_restored backup-YYYY-MM-DD.dump

# Plain-SQL alternative
pg_dump "$DATABASE_URL" > backup.sql
psql "$DATABASE_URL" < backup.sql
```

Keep backups encrypted and off-server. Test restores periodically — an untested backup is not a backup.

---

## 9. Stripe donations setup

See [`docs/STRIPE.md`](docs/STRIPE.md) for the full guide. Summary:

1. The organization creates its **own** Stripe account and completes Stripe's verification and banking setup.
2. In the Stripe Dashboard, switch to **test mode**, copy the test publishable + secret keys and create a webhook endpoint pointing at `https://<your-domain>/api/webhooks/stripe` for `checkout.session.completed`, then copy the webhook signing secret.
3. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env` and restart.
4. Until then, the Donate page shows: *"Online donations are not yet enabled. The organization is setting up its Stripe account."* — the site never pretends real donations work.
5. **Going live with real donations is a separate, deliberate step**: it requires switching the code/config to live mode, live keys, a live webhook, and real banking details. This delivery ships test mode only.

---

## 10. Email setup

See [`docs/EMAIL.md`](docs/EMAIL.md). Summary:

- Set the `SMTP_*` variables to any SMTP provider (e.g. the organization's mail host, SendGrid, Amazon SES).
- Emails covered: verification, password reset, application confirmation, status updates, new-message notifications, contact-form notifications.
- **If SMTP is not configured, the app logs the email and continues** — it never claims an email was delivered. Users can still register, log in, and use the site; verification links can be re-sent once SMTP is configured (or an admin can verify users manually via the database).

---

## 11. Testing

```bash
npm test     # 59 checks: every source file parses + live HTTP checks
```

Before delivery the application was tested end-to-end against a live PostgreSQL 16 database, including: registration → email verification → login → application submission → tracking code lookup (correct/wrong email) → admin status update → notifications → admin/user messaging → program CRUD → impact-stats update reflected on the homepage → role/deactivation protections → unauthorized API access (401/403) → password-reset flow → contact form → donation checkout returning `503 {setupRequired}` without Stripe keys. All checks passed. See [Section 12](#12-what-is-implemented--needs-credentials--incomplete) for the honest limits of that testing.

---

## 12. What is implemented / needs credentials / incomplete

### Fully implemented and tested

- All 13 required pages plus verify / forgot-password / reset-password / program-detail pages.
- Dynamic programs system with full admin CRUD, activation toggle, delete confirmation.
- Registration, login/logout, bcrypt hashing, email verification, session auth, forgot/reset password, roles (`USER` / `ADMIN` / `SUPER_ADMIN`), protected routes and APIs.
- User dashboard: profile edit, applications, tracking codes, public tracking, notifications, messages + replies.
- Applications with all five statuses, admin search/filter/status updates, audit logs.
- Admin dashboard: overview, applications, programs, impact stats (homepage updates live), user management with SUPER_ADMIN protections, messaging, donations history, global search, audit log, contact inbox.
- Stripe Checkout integration structure (test mode): server-side sessions, webhook verification, donation records.
- Email integration structure (nodemailer/SMTP) for all transactional emails.
- Security: helmet headers, rate limiting on auth endpoints, input validation, secure cookies in production, authorization checks on protected APIs, audit logging.
- Database schema, Prisma migration, plain-SQL fallback, seed + create-admin scripts, API docs, this handover documentation.

### Requires the organization's own credentials / accounts (structure ready, not active)

- **Stripe** — test keys + webhook secret (test mode), or a deliberate live-mode switch later. No real donations until the organization configures this.
- **SMTP email** — host/credentials for sending verification, reset, and notification emails. Without it, emails are logged, not sent.
- **Production hosting + domain + PostgreSQL** — deployment target of the organization's choice.
- **Real organizational content** — see Section 13.

### Incomplete / known limitations

- **No live Stripe payment was processed during testing** (no Stripe keys were available) — the checkout/webhook code paths are implemented and the "not configured" path was verified, but a test-mode card payment has not been run. Run one test card payment after configuring test keys (see `docs/STRIPE.md`).
- **No real email was delivered during testing** (no SMTP credentials) — the email code paths log correctly without credentials, but delivery must be verified after SMTP is configured.
- **File uploads are not implemented** — programs use image URLs (no upload endpoint); applications are text-based (no document attachments). This was not explicitly required by the brief; add an upload feature later if the organization needs it.
- **Responsive layouts were verified by code inspection** (11 CSS breakpoints, mobile navigation) and **not** by visual browser testing on physical devices. Check the site on a real phone/tablet before launch.
- **No automated browser (E2E UI) tests** — testing was API-level (`curl`/`node --test`) plus static frontend checks. Manual click-through of the dashboards is recommended before launch.
- The frontend uses vanilla JS with `fetch`; there is no separate frontend build step or framework.

---

## 13. Placeholders — information the organization must provide

No official data was invented. The following appear as clearly labeled `[Placeholder — …]` text in the site and must be replaced with real information before launch:

- EIN / registration numbers, nonprofit / tax-exempt status and tax-deductibility details
- Physical address, phone number, email addresses
- Testimonials and impact statistics (stats start at 0 and are editable in the admin dashboard)
- Social media links (if desired)

Search the codebase for `Placeholder` to find every spot.

---

## 14. Security notes

- Never commit `.env`. Rotate `SESSION_SECRET` and all keys if they are ever exposed.
- The seed/admin scripts take credentials from environment variables only — never hardcode them.
- In production, always serve over HTTPS (secure cookies are enabled when `NODE_ENV=production`).
- Keep dependencies updated (`npm audit` / `npm update`) and review Stripe webhook logs after going live.
- Database backups contain personal data — encrypt them and restrict access.

---

## 15. Troubleshooting

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for common issues (database connection errors, Prisma engine downloads, port conflicts, session problems, Stripe webhook failures, email not sending, seed failures).
