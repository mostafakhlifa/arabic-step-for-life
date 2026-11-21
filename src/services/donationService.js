// Donations via Stripe Checkout — TEST MODE ONLY.
// Checkout Sessions are created server-side, only when STRIPE_SECRET_KEY is
// set; otherwise callers get a 503 with setupRequired: true. Keys are never
// exposed to the frontend (only the publishable key belongs in the browser,
// and even that is not served by this API).
const { prisma } = require('../config/db');
const { config } = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

function isStripeConfigured() {
  return Boolean(config.stripeSecretKey);
}

function getStripe() {
  if (!isStripeConfigured()) return null;
  if (config.stripeTestMode && config.stripeSecretKey.startsWith('sk_live_')) {
    throw ApiError.unavailable('Live Stripe keys are not allowed — this integration is test mode only.');
  }
  // Lazy require so the module loads even without Stripe configured.
  // eslint-disable-next-line global-require
  return require('stripe')(config.stripeSecretKey);
}

function setupRequiredError() {
  const err = ApiError.unavailable('Online donations are not configured yet. Please contact the organization to donate.');
  err.setupRequired = true;
  return err;
}

/** Create a one-time Checkout Session. Amount is in USD dollars. */
async function createCheckoutSession({ amount, donorName, donorEmail, message }) {
  const stripe = getStripe();
  if (!stripe) throw setupRequiredError();

  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 10000000) {
    throw ApiError.badRequest('Amount must be between $1 and $100,000.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Donation — Arabic Step for Life Organization, Inc.' },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${config.appUrl}/donate.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/donate.html?cancelled=true`,
    customer_email: donorEmail || undefined,
    metadata: {
      donorName: donorName || '',
      donorEmail: donorEmail || '',
      message: (message || '').slice(0, 500),
    },
  });

  // Record the pending donation now; the webhook (or verify) completes it.
  await prisma.donation.upsert({
    where: { stripeSessionId: session.id },
    update: {},
    create: {
      stripeSessionId: session.id,
      amountCents,
      currency: 'usd',
      status: 'PENDING',
      donorName: donorName || null,
      donorEmail: donorEmail || null,
      message: message || null,
    },
  });

  return { url: session.url, sessionId: session.id };
}

/** After the success redirect: confirm the session with Stripe and complete
 * the local donation record. Used as a fallback if the webhook is delayed. */
async function verifyCheckoutSession(sessionId) {
  const stripe = getStripe();
  if (!stripe) throw setupRequiredError();
  if (!sessionId) throw ApiError.badRequest('session_id is required.');

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    const donation = await prisma.donation.findUnique({ where: { stripeSessionId: sessionId } });
    if (!donation) throw ApiError.notFound('Donation not found.');
    return donation;
  }
  return prisma.donation.upsert({
    where: { stripeSessionId: session.id },
    update: { status: 'COMPLETED', stripePaymentIntentId: session.payment_intent || undefined },
    create: {
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amountCents: session.amount_total || 0,
      currency: session.currency || 'usd',
      status: 'COMPLETED',
      donorName: session.metadata?.donorName || null,
      donorEmail: session.customer_details?.email || session.metadata?.donorEmail || null,
      message: session.metadata?.message || null,
    },
  });
}

/** Handle a verified Stripe webhook event (signature already checked). */
async function handleStripeWebhookEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amountCents = session.amount_total || 0;
    await prisma.donation.upsert({
      where: { stripeSessionId: session.id },
      update: {
        status: 'COMPLETED',
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      },
      create: {
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        amountCents,
        currency: session.currency || 'usd',
        status: 'COMPLETED',
        donorName: session.metadata?.donorName || null,
        donorEmail: session.customer_details?.email || session.metadata?.donorEmail || null,
        message: session.metadata?.message || null,
      },
    });
    return { handled: true };
  }
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    await prisma.donation.updateMany({
      where: { stripeSessionId: session.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    return { handled: true };
  }
  return { handled: false, ignored: event.type };
}

async function adminListDonations({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.donation.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.donation.count(),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = {
  isStripeConfigured,
  getStripe,
  setupRequiredError,
  createCheckoutSession,
  verifyCheckoutSession,
  handleStripeWebhookEvent,
  adminListDonations,
};
