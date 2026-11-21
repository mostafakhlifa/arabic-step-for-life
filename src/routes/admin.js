// Admin routes — all behind requireAdmin; role/status changes additionally
// require SUPER_ADMIN (enforced in the route AND in adminService).
const express = require('express');
const { body, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { VALID_CATEGORIES } = require('../services/programService');
const { VALID_STATUSES } = require('../services/applicationService');
const { VALID_ROLES } = require('../services/adminService');

const router = express.Router();

router.use(requireAdmin);

router.get('/overview', adminController.overview);

// Applications
router.get('/applications', adminController.listApplications);
router.patch(
  '/applications/:id/status',
  [body('status').isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`)],
  handleValidationErrors,
  adminController.updateApplicationStatus
);

// Programs
router.get('/programs', adminController.listPrograms);
router.post(
  '/programs',
  [
    body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }),
    body('slug').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('category').isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('shortDescription').trim().notEmpty().withMessage('Short description is required.').isLength({ max: 500 }),
    body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 20000 }),
    body('imageUrl').optional({ nullable: true }).trim().isURL().withMessage('imageUrl must be a valid URL.'),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  adminController.createProgram
);
router.put(
  '/programs/:id',
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('slug').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('shortDescription').optional().trim().notEmpty().isLength({ max: 500 }),
    body('description').optional().trim().notEmpty().isLength({ max: 20000 }),
    body('imageUrl').optional({ nullable: true }).trim().isURL(),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  adminController.updateProgram
);
router.delete('/programs/:id', adminController.deleteProgram);
router.patch('/programs/:id/toggle', adminController.toggleProgram);

// Stats
router.get('/stats', adminController.getStats);
router.put(
  '/stats',
  [
    body('peopleSupported').optional().isInt({ min: 0 }),
    body('volunteers').optional().isInt({ min: 0 }),
    body('statesReached').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  adminController.updateStats
);

// Users — role/status changes are SUPER_ADMIN only.
router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/role',
  requireSuperAdmin,
  [body('role').isIn(VALID_ROLES).withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`)],
  handleValidationErrors,
  adminController.changeUserRole
);
router.patch(
  '/users/:id/status',
  requireSuperAdmin,
  [body('isActive').isBoolean().withMessage('isActive must be a boolean.')],
  handleValidationErrors,
  adminController.changeUserStatus
);

// Messages
router.get('/messages', adminController.listMessages);
router.post(
  '/messages',
  [
    body('recipientId').notEmpty().withMessage('recipientId is required.'),
    body('applicationId').optional({ nullable: true }).trim().notEmpty(),
    body('subject').trim().notEmpty().withMessage('Subject is required.').isLength({ max: 200 }),
    body('body').trim().notEmpty().withMessage('Message body is required.').isLength({ max: 10000 }),
  ],
  handleValidationErrors,
  adminController.sendMessage
);

// Donations
router.get('/donations', adminController.listDonations);

// Global search
router.get(
  '/search',
  [query('q').trim().notEmpty().withMessage('q is required.').isLength({ max: 200 })],
  handleValidationErrors,
  adminController.search
);

// Audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// Contact messages
router.get('/contact-messages', adminController.listContactMessages);
router.patch('/contact-messages/:id/read', adminController.markContactMessageRead);

module.exports = router;
