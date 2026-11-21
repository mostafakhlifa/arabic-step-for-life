// Application routes. Order matters: /mine and /track/:code come before /:id.
const express = require('express');
const { body, param, query } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { requireAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  [
    body('programId').notEmpty().withMessage('programId is required.'),
    body('applicantFirstName').trim().notEmpty().withMessage('First name is required.'),
    body('applicantLastName').trim().notEmpty().withMessage('Last name is required.'),
    body('applicantEmail').trim().isEmail().withMessage('A valid applicant email is required.').normalizeEmail(),
    body('applicantPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
    body('details').trim().notEmpty().withMessage('Please describe your situation / request.').isLength({ max: 10000 }),
    body('needs').optional({ nullable: true }).trim().isLength({ max: 10000 }),
  ],
  handleValidationErrors,
  applicationController.create
);

router.get('/mine', requireAuth, applicationController.mine);

// Public tracking — email must match the applicant email (checked in service).
router.get(
  '/track/:code',
  [
    param('code').trim().notEmpty(),
    query('email').trim().isEmail().withMessage('A valid email query parameter is required.'),
  ],
  handleValidationErrors,
  applicationController.track
);

router.get('/:id', requireAuth, applicationController.getOne);

module.exports = router;
