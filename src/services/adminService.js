// Admin-only operations: overview, user management, global search,
// audit logs, contact messages.
//
// Safety rules (enforced here, not just in routes):
// - Only SUPER_ADMIN can change roles or activate/deactivate users.
// - Nobody can deactivate themselves.
// - The last active SUPER_ADMIN cannot be deactivated.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const VALID_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

async function getOverview() {
  const [totalUsers, totalApplications, pendingApplications, activePrograms, donationsAgg, donationsCount, recentApplications] =
    await Promise.all([
      prisma.user.count(),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.program.count({ where: { isActive: true } }),
      prisma.donation.aggregate({ _sum: { amountCents: true }, where: { status: 'COMPLETED' } }),
      prisma.donation.count({ where: { status: 'COMPLETED' } }),
      prisma.application.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { program: { select: { title: true } } },
      }),
    ]);
  return {
    totalUsers,
    totalApplications,
    pendingApplications,
    activePrograms,
    donationsTotal: (donationsAgg._sum.amountCents || 0) / 100,
    donationsCount,
    recentApplications: recentApplications.map((a) => ({
      id: a.id,
      trackingCode: a.trackingCode,
      applicantFirstName: a.applicantFirstName,
      applicantLastName: a.applicantLastName,
      applicantEmail: a.applicantEmail,
      status: a.status,
      programTitle: a.program ? a.program.title : null,
      createdAt: a.createdAt,
    })),
  };
}

async function listUsers({ search, page = 1, limit = 20 }) {
  const where = {};
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function changeUserRole(adminUser, targetId, role) {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Only a super admin can change user roles.');
  }
  if (!VALID_ROLES.includes(role)) throw ApiError.badRequest('Invalid role.');
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found.');
  // Prevent demoting the last active SUPER_ADMIN.
  if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN' && target.isActive) {
    const superCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
    if (superCount <= 1) {
      throw ApiError.badRequest('Cannot change the role of the last active super admin.');
    }
  }
  const updated = await prisma.user.update({ where: { id: targetId }, data: { role } });
  await logAudit(adminUser.id, 'USER_ROLE_CHANGE', 'User', targetId, { from: target.role, to: role });
  return updated;
}

async function changeUserStatus(adminUser, targetId, isActive) {
  if (adminUser.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Only a super admin can activate or deactivate users.');
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found.');
  if (!isActive && targetId === adminUser.id) {
    throw ApiError.badRequest('You cannot deactivate your own account.');
  }
  if (!isActive && target.role === 'SUPER_ADMIN' && target.isActive) {
    const superCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
    if (superCount <= 1) {
      throw ApiError.badRequest('Cannot deactivate the last active super admin.');
    }
  }
  const updated = await prisma.user.update({ where: { id: targetId }, data: { isActive } });
  await logAudit(adminUser.id, 'USER_STATUS_CHANGE', 'User', targetId, { isActive });
  return updated;
}

async function globalSearch(q) {
  const query = String(q || '').trim();
  if (!query) return { users: [], applications: [] };
  const [users, applications] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.application.findMany({
      where: {
        OR: [
          { trackingCode: { contains: query, mode: 'insensitive' } },
          { applicantFirstName: { contains: query, mode: 'insensitive' } },
          { applicantLastName: { contains: query, mode: 'insensitive' } },
          { applicantEmail: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { program: true },
    }),
  ]);
  return { users, applications };
}

async function listAuditLogs({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function listContactMessages({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.contactMessage.count(),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function markContactMessageRead(id) {
  const found = await prisma.contactMessage.findUnique({ where: { id } });
  if (!found) throw ApiError.notFound('Contact message not found.');
  return prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
}

module.exports = {
  VALID_ROLES,
  getOverview,
  listUsers,
  changeUserRole,
  changeUserStatus,
  globalSearch,
  listAuditLogs,
  listContactMessages,
  markContactMessageRead,
};
