// Message routes (authenticated).
const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);

router.get('/', messageController.list);

router.post(
  '/',
  [
    body('recipientId').optional({ nullable: true }).trim().notEmpty(),
    body('applicationId').optional({ nullable: true }).trim().notEmpty(),
    body('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 200 }),
    body('body').trim().notEmpty().withMessage('Message body is required.').isLength({ max: 10000 }),
  ],
  handleValidationErrors,
  messageController.create
);

router.patch('/:id/read', messageController.markRead);

module.exports = router;
