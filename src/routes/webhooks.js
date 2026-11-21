// Stripe webhook route — raw body required for signature verification.
// Mounted BEFORE the JSON parser in app.js.
const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.stripeWebhook);

module.exports = router;
