# Stripe Donations — Configuration Guide (Test Mode)

## Important

- **This website ships in Stripe TEST MODE ONLY.** The server rejects live secret keys.
- **Real donations are NOT enabled** until the organization configures its own Stripe account, keys, webhook, and banking details — and deliberately switches to live mode (a separate step, see §5).
- Until Stripe is configured, the Donate page shows: *"Online donations are not yet enabled. The organization is setting up its Stripe account."*

## 1. Create the Stripe account

1. Go to https://stripe.com and create an account for **Arabic Step for Life Organization, Inc.**
2. Complete Stripe's business verification (legal entity details, EIN, bank account for payouts, authorized representative). This is the organization's responsibility — no account details are included in this delivery.
3. In the Stripe Dashboard, confirm you are in **Test mode** (toggle in the top-right / sidebar).

## 2. Get the test API keys

1. Dashboard → **Developers → API keys** (test mode).
2. Copy the **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).

## 3. Create the webhook

Donations are only recorded in the database when Stripe confirms payment via webhook.

1. Dashboard → **Developers → Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/webhooks/stripe`
3. Select the event `checkout.session.completed` (the app also tolerates `payment_intent.succeeded` if you add it — see `src/services/donationService.js`).
4. Copy the **Signing secret** (`whsec_…`).

For local testing, use the Stripe CLI instead:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed whsec_... secret into .env as STRIPE_WEBHOOK_SECRET
```

## 4. Configure the app

Add to `.env` and restart the server:

```env
STRIPE_TEST_MODE=true
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 5. Test a donation (test mode)

1. Open `/donate.html`, choose an amount, and continue to checkout.
2. Pay with Stripe's test card: **4242 4242 4242 4242**, any future expiry, any CVC.
3. You should return to the Donate page with a thank-you confirmation.
4. In the admin dashboard (**Donations** tab), the donation appears once the webhook fires.
5. In the Stripe Dashboard (test mode → Payments), the payment appears as a test payment.

## 6. Going live (real donations) — deliberate step, not part of this delivery

1. Complete Stripe live-mode verification and banking setup.
2. Switch the Dashboard to **live mode**; create a live webhook endpoint for the same URL/events.
3. Update the server configuration to use live keys (`sk_live_…`, `pk_live_…`, live `whsec_…`) and set `STRIPE_TEST_MODE=false` — and remove/adjust the live-key rejection in `src/services/donationService.js` (search for `live`).
4. Test with a small real donation, verify it in the admin dashboard, then refund it from the Stripe Dashboard.
5. Update the Donate page copy (remove any test-mode wording) and confirm tax-deductibility wording with the organization's advisor — **never claim tax-deductible status that has not been verified**.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Donate page shows "not yet enabled" | `STRIPE_SECRET_KEY` missing/unset, or server not restarted after adding it |
| Checkout starts but donation never appears in admin | Webhook not configured, wrong URL, or wrong `STRIPE_WEBHOOK_SECRET` — check Stripe Dashboard → Webhooks → delivery attempts |
| `400` from `/api/webhooks/stripe` | Signature verification failed — the webhook secret in `.env` does not match the endpoint's secret |
| Server refuses to start / checkout errors mentioning live keys | A live key was used while `STRIPE_TEST_MODE=true` — use test keys |
