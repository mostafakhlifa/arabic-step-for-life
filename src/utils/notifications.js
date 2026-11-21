// In-app notification helpers.
const { prisma } = require('../config/db');

async function createNotification(userId, { type, title, body, link = null }) {
  return prisma.notification.create({ data: { userId, type, title, body, link } });
}

/** Notify every active admin / super-admin (e.g. a user wrote to the org). */
async function notifyAdmins({ type, title, body, link = null }) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true },
  });
  if (admins.length === 0) return [];
  return prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type, title, body, link })),
  });
}

module.exports = { createNotification, notifyAdmins };
