// Server entry point: validates env with a CLEAR error when DATABASE_URL is
// missing, then starts listening (PORT, default 3000).
const { config, assertDatabaseUrl } = require('./config/env');

try {
  assertDatabaseUrl();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`\n[arabic-step-for-life] Cannot start the server:\n${err.message}\n`);
  process.exit(1);
}

const app = require('./app');
const { prisma } = require('./config/db');

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[arabic-step-for-life] Listening on ${config.appUrl} (NODE_ENV=${config.nodeEnv}, Stripe test mode: ${config.stripeTestMode})`
  );
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[arabic-step-for-life] ${signal} received — shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
