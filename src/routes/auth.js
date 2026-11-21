// Auth routes — strict rate limiters on login/register/forgot/reset.
const express = require('express');
const { body, query } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { authLimiter, loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const nameRule = (field) =>
  body(field).trim().notEmpty().withMessage(`${field} is required.`).isLength({ max: 100 });
const emailRule = body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail();
const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .isLength({ max: 128 }).withMessage('Password is too long.');

router.post(
  '/register',
  authLimiter,
  [nameRule('firstName'), nameRule('lastName'), emailRule, passwordRule,
    body('phone').optional({ nullable: true }).trim().isLength({ max: 30 })],
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  [emailRule, body('password').notEmpty().withMessage('Password is required.')],
  handleValidationErrors,
  authController.login
);

router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

router.get(
  '/verify',
  [query('token').notEmpty().withMessage('token is required.')],
  handleValidationErrors,
  authController.verify
);

router.post(
  '/forgot-password',
  authLimiter,
  [emailRule],
  handleValidationErrors,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('token is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  handleValidationErrors,
  authController.resetPassword
);

router.get('/profile', requireAuth, authController.getProfile);
router.put(
  '/profile',
  requireAuth,
  [nameRule('firstName'), nameRule('lastName'),
    body('phone').optional({ nullable: true }).trim().isLength({ max: 30 })],
  handleValidationErrors,
  authController.updateProfile
);

module.exports = router;
