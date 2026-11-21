# Troubleshooting Guide — Arabic Step for Life Website

## Server won't start

**`DATABASE_URL is not set` / database connection errors**
- Copy `.env.example` to `.env` and set `DATABASE_URL`. The server exits with a clear error if it is missing.
- Verify PostgreSQL is running and the credentials work: `psql "$DATABASE_URL" -c "SELECT 1;"`.
- If PostgreSQL runs on another host, check the firewall and `pg_hba.conf`.

**`Port 3000 is already in use`**
- Another instance is running. Stop it, or set a different `PORT` in `.env`.

**Prisma errors (`@prisma/client did not initialize` / engine errors)**
- Run `npx prisma generate` again. If the Prisma engine download fails behind a proxy, install with `npm install --ignore-scripts`, then run `npx prisma generate` separately (see README §4 note).

## Database / migrations

**`Migration failed to apply`**
- Check the database is empty (or already migrated) and the user has CREATE TABLE rights.
- For a first-time setup on a fresh database, `npx prisma migrate deploy` should apply `20261118200000_init` cleanly. If the database is in a half-migrated state, drop and recreate it (development only — never on production data), then re-run.

**`relation "users" does not exist`**
- Migrations were not applied. Run `npx prisma migrate deploy`.

**Plain-SQL fallback:** `scripts/schema.sql` contains the same schema and can be applied directly with `psql "$DATABASE_URL" < scripts/schema.sql` (it includes the session table used by `connect-pg-simple`).

## Login / sessions

**Login succeeds but the dashboard redirects back to login**
- Cookies are not being stored: check the site is served over the same origin (the app serves frontend + API together — do not host them on different origins without setting `CORS_ORIGIN` and cookie settings).
- In production, the site must be HTTPS; secure cookies are rejected over plain HTTP.

**`401 Unauthorized` on `/api/auth/me` right after login**
- The session store table may be missing (it is created automatically on first session write). Check the `session` table exists in the database.

**Admin link missing after login**
- Only `ADMIN` / `SUPER_ADMIN` accounts see the Admin link. Check the role with `npm run create-admin` (promote) or in the admin dashboard (SUPER_ADMIN only).

**Forgot-password says "sent" but no email arrives**
- Expected when SMTP is not configured — the response is intentionally generic (it never reveals whether an account exists). Configure SMTP per `docs/EMAIL.md`.

## Seed / admin setup

**`SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD must be set`**
- The seed script refuses to create an admin without credentials in the environment. Set them in `.env` or inline: `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed`.

**Seed fails: admin already exists**
- Re-running the seed after the admin was created is safe for stats/programs, but the admin insert fails on the duplicate email. Use `npm run create-admin` for additional accounts.

## Donations

See `docs/STRIPE.md` § Troubleshooting. The most common issue is a missing or mismatched `STRIPE_WEBHOOK_SECRET`.

## Email

See `docs/EMAIL.md` § Troubleshooting. The most common issues are wrong SMTP credentials and `APP_URL` still pointing at localhost.

## Frontend

**Pages load but show no programs / stats**
- The API may be down or the database empty. Check `/api/health`, `/api/programs`, `/api/stats` directly in the browser. Run `npm run db:seed` if the database has no programs.

**Styles look broken**
- Hard-refresh (Ctrl+Shift+R) to clear cached CSS, and confirm `/css/style.css` returns 200.

## Still stuck?

1. Check the server log — errors are logged with context.
2. Run `npm test` to confirm the codebase and live checks still pass.
3. Check `docs/API.md` for the expected request/response shapes when debugging API calls.
