// Notification controller (authenticated users, own notifications only).
const notificationService = require('../services/notificationService');
const { ok } = require('../utils/respond');
const { toNotificationJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForUser(req.user.id);
  return ok(res, notifications.map(toNotificationJson));
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.user.id);
  return ok(res, { count });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user.id);
  return ok(res, toNotificationJson(notification));
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  return ok(res, { message: 'All notifications marked as read.' });
});

module.exports = { list, unreadCount, markRead, markAllRead };
