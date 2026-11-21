// Donation controller — Stripe Checkout (test mode only).
const donationService = require('../services/donationService');
const { ok, fail } = require('../utils/respond');
const { toDonationJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

const checkout = asyncHandler(async (req, res) => {
  try {
    const result = await donationService.createCheckoutSession(req.body);
    return ok(res, { url: result.url });
  } catch (err) {
    if (err.setupRequired) {
      return res.status(503).json({ success: false, error: err.message, setupRequired: true });
    }
    throw err;
  }
});

const verify = asyncHandler(async (req, res) => {
  try {
    const donation = await donationService.verifyCheckoutSession(req.query.session_id);
    return ok(res, { donation: toDonationJson(donation) });
  } catch (err) {
    if (err.setupRequired) {
      return res.status(503).json({ success: false, error: err.message, setupRequired: true });
    }
    throw err;
  }
});

// Keep `fail` referenced for future use and lint-clean imports.
void fail;

module.exports = { checkout, verify };
