// Donation routes — Stripe Checkout (test mode only).
const express = require('express');
const { body, query } = require('express-validator');
const donationController = require('../controllers/donationController');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/checkout',
  [
    body('amount').isFloat({ min: 1, max: 100000 }).withMessage('Amount must be between $1 and $100,000.'),
    body('donorName').optional({ nullable: true }).trim().isLength({ max: 200 }),
    body('donorEmail').optional({ nullable: true }).trim().isEmail().withMessage('A valid donor email is required.'),
    body('message').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  handleValidationErrors,
  donationController.checkout
);

router.get(
  '/verify',
  [query('session_id').notEmpty().withMessage('session_id is required.')],
  handleValidationErrors,
  donationController.verify
);

module.exports = router;
