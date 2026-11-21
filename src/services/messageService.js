// Messaging: users write to the organization (recipientId null = all admins),
// admins message applicants directly, and replies notify the other side.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { createNotification, notifyAdmins } = require('../utils/notifications');
const { logAudit } = require('../utils/audit');

const senderInclude = { include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } } };

function isAdmin(user) {
  return user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
}

/** Own messages (sent + received), newest first. Admins also see messages
 * addressed to the organization (recipientId null). */
async function listMessagesForUser(user) {
  const where = isAdmin(user)
    ? { OR: [{ senderId: user.id }, { recipientId: user.id }, { recipientId: null }] }
    : { OR: [{ senderId: user.id }, { recipientId: user.id }] };
  return prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, ...senderInclude });
}

async function createMessage(sender, { recipientId, applicationId, subject, body }) {
  let recipient = null;
  if (recipientId) {
    recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient || !recipient.isActive) throw ApiError.badRequest('Recipient not found.');
    // Regular users may only message admins (or reply within their own thread).
    if (!isAdmin(sender) && !isAdmin(recipient)) {
      throw ApiError.forbidden('You can only message the organization administrators.');
    }
  }

  let application = null;
  if (applicationId) {
    application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw ApiError.badRequest('Application not found.');
    if (!isAdmin(sender) && application.userId !== sender.id) {
      throw ApiError.forbidden('You can only message about your own applications.');
    }
    // Default the recipient from the application when none was given.
    if (!recipientId) {
      recipientId = isAdmin(sender) ? application.userId : null;
    }
  }

  const message = await prisma.message.create({
    data: {
      senderId: sender.id,
      recipientId: recipientId || null,
      applicationId: applicationId || null,
      subject: subject.trim(),
      body: body.trim(),
    },
    ...senderInclude,
  });

  // Notify the other side.
  if (message.recipientId) {
    await createNotification(message.recipientId, {
      type: 'MESSAGE',
      title: `New message: ${message.subject}`,
      body: `You have a new message from ${sender.firstName} ${sender.lastName}.`,
      link: '/dashboard.html',
    });
  } else {
    await notifyAdmins({
      type: 'MESSAGE',
      title: `New message: ${message.subject}`,
      body: `New message from ${sender.firstName} ${sender.lastName}.`,
      link: '/admin.html',
    });
  }
  return message;
}

/** Mark read — recipient only. Messages addressed to all admins (recipientId
 * null) may be marked read by any admin. */
async function markMessageRead(id, user) {
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) throw ApiError.notFound('Message not found.');
  const canMark =
    message.recipientId === user.id ||
    (message.recipientId === null && isAdmin(user));
  if (!canMark) throw ApiError.forbidden('Only the recipient can mark this message as read.');
  return prisma.message.update({ where: { id }, data: { isRead: true }, ...senderInclude });
}

async function adminListMessages({ userId, applicationId }) {
  const where = {};
  if (applicationId) where.applicationId = applicationId;
  if (userId) where.OR = [{ senderId: userId }, { recipientId: userId }];
  return prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, ...senderInclude });
}

async function adminSendMessage(admin, { recipientId, applicationId, subject, body }) {
  const message = await createMessage(admin, { recipientId, applicationId, subject, body });
  await logAudit(admin.id, 'MESSAGE_SENT', 'Message', message.id, {
    recipientId: message.recipientId,
    applicationId: message.applicationId,
  });
  return message;
}

module.exports = {
  listMessagesForUser,
  createMessage,
  markMessageRead,
  adminListMessages,
  adminSendMessage,
};
