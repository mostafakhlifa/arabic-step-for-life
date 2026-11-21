// Express app factory — middleware, sessions, static frontend, /api routes.
//
// ORDER MATTERS:
//   1. helmet / cors / logging
//   2. Stripe webhook route (raw body — MUST come before express.json())
//   3. JSON + URL-encoded parsers
//   4. Session (PostgreSQL-backed) + loadUser for /api
//   5. Static frontend from public/ + /api routers
//   6. 404 + central error handler
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const { config, assertDatabaseUrl, assertSessionSecret } = require('./config/env');

assertDatabaseUrl();
assertSessionSecret();

const { loadUser } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const programRoutes = require('./routes/programs');
const applicationRoutes = require('./routes/applications');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');
const donationRoutes = require('./routes/donations');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = express();

if (config.isProduction) {
  // Behind a reverse proxy (required for secure cookies to work).
  app.set('trust proxy', 1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(cookieParser());

// --- Stripe webhook BEFORE the JSON parser (needs the raw body) ---
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Session auth (PostgreSQL-backed store) ---
app.use(
  session({
    store: new PgSession({
      conString: config.databaseUrl,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction, // secure cookies in production only
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Resolve the session user (and reject inactive users) on every /api request.
app.use('/api', loadUser);
app.use('/api', apiLimiter);

// --- Static frontend (owned by the frontend agent) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check (no DB access).
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

// --- 404 ---
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  }
  return res.status(404).send('Not found');
});

// --- Central error handler ---
app.use(errorHandler);

module.exports = app;
