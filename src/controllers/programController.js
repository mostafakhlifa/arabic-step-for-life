// Public program controller (active programs only).
const programService = require('../services/programService');
const { ok } = require('../utils/respond');
const { toProgramJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const programs = await programService.listActivePrograms();
  return ok(res, programs.map(toProgramJson));
});

const getBySlug = asyncHandler(async (req, res) => {
  const program = await programService.getActiveProgramBySlug(req.params.slug);
  return ok(res, toProgramJson(program));
});

module.exports = { list, getBySlug };
