// Central environment configuration. Loads .env once; every module reads
// config from here instead of touching process.env directly.
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
  corsOrigin: process.env.CORS_ORIGIN || true, // same-origin serving; reflect origin otherwise

  databaseUrl: process.env.DATABASE_URL || '',
  // In production a real SESSION_SECRET is mandatory; in development we warn
  // loudly and fall back so `npm run dev` works out of the box.
  sessionSecret: process.env.SESSION_SECRET || '',

  // Stripe — TEST MODE ONLY. Never put a live (sk_live_) key in .env.
  stripeTestMode: process.env.STRIPE_TEST_MODE !== 'false',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // SMTP (optional). When unset, email.js logs and reports { sent: false }.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.org',
  },
  contactNotificationEmail: process.env.CONTACT_NOTIFICATION_EMAIL || '',

  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
};

function assertDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error(
      'Missing DATABASE_URL. Copy .env.example to .env and set DATABASE_URL to your PostgreSQL connection string, e.g.\n' +
        '  DATABASE_URL=postgresql://user:password@localhost:5432/arabic_step_for_life?schema=public\n' +
        'Then run: npx prisma migrate deploy && npm run db:seed'
    );
  }
}

function assertSessionSecret() {
  if (!config.sessionSecret) {
    if (isProduction) {
      throw new Error(
        'Missing SESSION_SECRET. Set a long random SESSION_SECRET in .env before running in production.'
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[warn] SESSION_SECRET is not set — using an insecure development-only fallback. ' +
        'Set SESSION_SECRET in .env for any real deployment.'
    );
    config.sessionSecret = 'dev-only-insecure-session-secret-change-me';
  }
}

module.exports = { config, assertDatabaseUrl, assertSessionSecret };
