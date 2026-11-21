// Stripe webhook controller — verifies the signature with
// STRIPE_WEBHOOK_SECRET before trusting anything in the payload.
// NOTE: this route receives a RAW body (see src/app.js); never parse it as JSON first.
const { config } = require('../config/env');
const donationService = require('../services/donationService');
const { asyncHandler } = require('../utils/asyncHandler');

const stripeWebhook = asyncHandler(async (req, res) => {
  const stripe = donationService.getStripe();
  if (!stripe || !config.stripeWebhookSecret) {
    return res.status(503).json({ success: false, error: 'Stripe webhook is not configured.' });
  }
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, error: 'Missing stripe-signature header.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
  }

  await donationService.handleStripeWebhookEvent(event);
  return res.status(200).json({ received: true });
});

module.exports = { stripeWebhook };
