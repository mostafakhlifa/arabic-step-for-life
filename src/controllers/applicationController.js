// Application controller (authenticated users + public tracking).
const applicationService = require('../services/applicationService');
const { ok } = require('../utils/respond');
const { toApplicationJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const application = await applicationService.createApplication(req.user.id, req.body);
  return ok(res, { application: toApplicationJson(application) }, 201);
});

const mine = asyncHandler(async (req, res) => {
  const applications = await applicationService.listUserApplications(req.user.id);
  return ok(res, applications.map(toApplicationJson));
});

const track = asyncHandler(async (req, res) => {
  const result = await applicationService.trackApplication(req.params.code, req.query.email);
  return ok(res, result);
});

const getOne = asyncHandler(async (req, res) => {
  const application = await applicationService.getApplicationForUser(req.params.id, req.user);
  return ok(res, toApplicationJson(application));
});

module.exports = { create, mine, track, getOne };
