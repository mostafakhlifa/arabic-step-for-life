// Public contact-form route.
const express = require('express');
const { body } = require('express-validator');
const contactController = require('../controllers/contactController');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 200 }),
    body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
    body('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 200 }),
    body('message').trim().notEmpty().withMessage('Message is required.').isLength({ max: 10000 }),
  ],
  handleValidationErrors,
  contactController.create
);

module.exports = router;
