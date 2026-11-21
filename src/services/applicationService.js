// Application logic: submission, ownership-checked reads, public tracking,
// admin listing + status changes (which notify the applicant + audit-log).
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { generateTrackingCode } = require('../utils/trackingCode');
const { createNotification } = require('../utils/notifications');
const { logAudit } = require('../utils/audit');
const { STATUS_LABELS } = require('../utils/serializers');

const VALID_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];

const programInclude = { include: { program: true } };

async function generateUniqueTrackingCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateTrackingCode();
    const existing = await prisma.application.findUnique({ where: { trackingCode: code } });
    if (!existing) return code;
  }
  throw ApiError.unavailable('Could not generate a tracking code. Please try again.');
}

async function createApplication(userId, data) {
  const program = await prisma.program.findFirst({ where: { id: data.programId, isActive: true } });
  if (!program) throw ApiError.badRequest('The selected program is not available.');

  let details = data.details.trim();
  if (data.needs && String(data.needs).trim()) {
    details += `\n\nNeeds / additional information:\n${String(data.needs).trim()}`;
  }

  const application = await prisma.application.create({
    data: {
      trackingCode: await generateUniqueTrackingCode(),
      userId,
      programId: program.id,
      applicantFirstName: data.applicantFirstName.trim(),
      applicantLastName: data.applicantLastName.trim(),
      applicantEmail: data.applicantEmail.trim().toLowerCase(),
      applicantPhone: data.applicantPhone ? data.applicantPhone.trim() : null,
      details,
    },
    ...programInclude,
  });

  await createNotification(userId, {
    type: 'APPLICATION_STATUS',
    title: 'Application submitted',
    body: `Your application for ${program.title} was received. Tracking code: ${application.trackingCode}.`,
    link: '/dashboard.html',
  });
  return application;
}

async function listUserApplications(userId) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    ...programInclude,
  });
}

function isAdmin(user) {
  return user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
}

/** Owner-only read (admins may read any application). */
async function getApplicationForUser(id, user) {
  const application = await prisma.application.findUnique({ where: { id }, ...programInclude });
  if (!application) throw ApiError.notFound('Application not found.');
  if (!isAdmin(user) && application.userId !== user.id) {
    throw ApiError.forbidden('You can only view your own applications.');
  }
  return application;
}

/** Public tracking: only the applicant's own email unlocks the status. */
async function trackApplication(code, email) {
  const application = await prisma.application.findUnique({
    where: { trackingCode: String(code).trim().toUpperCase() },
    ...programInclude,
  });
  if (!application) throw ApiError.notFound('No application found with that tracking code.');
  if (!email || application.applicantEmail.toLowerCase() !== String(email).trim().toLowerCase()) {
    throw ApiError.forbidden('The email address does not match this application.');
  }
  return {
    trackingCode: application.trackingCode,
    status: application.status,
    statusLabel: STATUS_LABELS[application.status] || application.status,
    programTitle: application.program ? application.program.title : null,
    submittedAt: application.createdAt,
  };
}

async function adminListApplications({ search, status, programId, page = 1, limit = 20 }) {
  const where = {};
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (programId) where.programId = programId;
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { trackingCode: { contains: q, mode: 'insensitive' } },
      { applicantFirstName: { contains: q, mode: 'insensitive' } },
      { applicantLastName: { contains: q, mode: 'insensitive' } },
      { applicantEmail: { contains: q, mode: 'insensitive' } },
    ];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.application.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, ...programInclude }),
    prisma.application.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function updateApplicationStatus(id, status, adminUser) {
  if (!VALID_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status.');
  const application = await prisma.application.findUnique({ where: { id }, ...programInclude });
  if (!application) throw ApiError.notFound('Application not found.');
  const previousStatus = application.status;
  const updated = await prisma.application.update({ where: { id }, data: { status }, ...programInclude });

  await createNotification(application.userId, {
    type: 'APPLICATION_STATUS',
    title: `Application ${STATUS_LABELS[status]}`,
    body: `Your application ${application.trackingCode} (${application.program ? application.program.title : 'program'}) is now: ${STATUS_LABELS[status]}.`,
    link: '/dashboard.html',
  });
  await logAudit(adminUser.id, 'APPLICATION_STATUS_CHANGE', 'Application', id, {
    trackingCode: application.trackingCode,
    from: previousStatus,
    to: status,
  });
  return updated;
}

module.exports = {
  VALID_STATUSES,
  createApplication,
  listUserApplications,
  getApplicationForUser,
  trackApplication,
  adminListApplications,
  updateApplicationStatus,
};
