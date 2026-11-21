// Admin controller — every route is behind requireAdmin (or requireSuperAdmin
// for role/status changes, enforced again in adminService).
const adminService = require('../services/adminService');
const applicationService = require('../services/applicationService');
const programService = require('../services/programService');
const statsService = require('../services/statsService');
const messageService = require('../services/messageService');
const donationService = require('../services/donationService');
const { ok } = require('../utils/respond');
const {
  toUserJson,
  toProgramJson,
  toApplicationJson,
  toMessageJson,
  toDonationJson,
  toContactMessageJson,
} = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

function pageParams(req) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));
  return { page, limit };
}

const overview = asyncHandler(async (req, res) => ok(res, await adminService.getOverview()));

const listApplications = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const result = await applicationService.adminListApplications({
    search: req.query.search,
    status: req.query.status,
    programId: req.query.programId,
    page,
    limit,
  });
  return ok(res, { ...result, items: result.items.map(toApplicationJson) });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const updated = await applicationService.updateApplicationStatus(req.params.id, req.body.status, req.user);
  return ok(res, toApplicationJson(updated));
});

const listPrograms = asyncHandler(async (req, res) => {
  const programs = await programService.adminListPrograms();
  return ok(res, programs.map(toProgramJson));
});

const createProgram = asyncHandler(async (req, res) => {
  const program = await programService.createProgram(req.body);
  return ok(res, toProgramJson(program), 201);
});

const updateProgram = asyncHandler(async (req, res) => {
  const program = await programService.updateProgram(req.params.id, req.body);
  return ok(res, toProgramJson(program));
});

const deleteProgram = asyncHandler(async (req, res) => {
  await programService.deleteProgram(req.params.id);
  return ok(res, { message: 'Program deleted.' });
});

const toggleProgram = asyncHandler(async (req, res) => {
  const program = await programService.toggleProgram(req.params.id);
  return ok(res, toProgramJson(program));
});

const getStats = asyncHandler(async (req, res) => ok(res, await statsService.getAdminStats()));

const updateStats = asyncHandler(async (req, res) => {
  const stats = await statsService.updateAdminStats(req.body, req.user);
  return ok(res, stats);
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const result = await adminService.listUsers({ search: req.query.search, page, limit });
  return ok(res, { ...result, items: result.items.map(toUserJson) });
});

const changeUserRole = asyncHandler(async (req, res) => {
  const user = await adminService.changeUserRole(req.user, req.params.id, req.body.role);
  return ok(res, toUserJson(user));
});

const changeUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.changeUserStatus(req.user, req.params.id, req.body.isActive);
  return ok(res, toUserJson(user));
});

const listMessages = asyncHandler(async (req, res) => {
  const messages = await messageService.adminListMessages({
    userId: req.query.userId,
    applicationId: req.query.applicationId,
  });
  return ok(res, messages.map(toMessageJson));
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.adminSendMessage(req.user, req.body);
  return ok(res, toMessageJson(message), 201);
});

const listDonations = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const result = await donationService.adminListDonations({ page, limit });
  return ok(res, { ...result, items: result.items.map(toDonationJson) });
});

const search = asyncHandler(async (req, res) => {
  const result = await adminService.globalSearch(req.query.q);
  return ok(res, {
    users: result.users.map(toUserJson),
    applications: result.applications.map(toApplicationJson),
  });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const result = await adminService.listAuditLogs({ page, limit });
  return ok(res, {
    ...result,
    items: result.items.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorName: l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : null,
      actorEmail: l.actor ? l.actor.email : null,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      details: l.details,
      createdAt: l.createdAt,
    })),
  });
});

const listContactMessages = asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req);
  const result = await adminService.listContactMessages({ page, limit });
  return ok(res, { ...result, items: result.items.map(toContactMessageJson) });
});

const markContactMessageRead = asyncHandler(async (req, res) => {
  const message = await adminService.markContactMessageRead(req.params.id);
  return ok(res, toContactMessageJson(message));
});

module.exports = {
  overview,
  listApplications,
  updateApplicationStatus,
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  toggleProgram,
  getStats,
  updateStats,
  listUsers,
  changeUserRole,
  changeUserStatus,
  listMessages,
  sendMessage,
  listDonations,
  search,
  listAuditLogs,
  listContactMessages,
  markContactMessageRead,
};
