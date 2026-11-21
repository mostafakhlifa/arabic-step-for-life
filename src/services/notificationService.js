// Notifications: ownership-checked reads and read-state changes.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

async function listForUser(userId) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function markRead(id, userId) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw ApiError.notFound('Notification not found.');
  if (notification.userId !== userId) {
    throw ApiError.forbidden('You can only update your own notifications.');
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllRead(userId) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { updated: true };
}

module.exports = { listForUser, unreadCount, markRead, markAllRead };
