// Public stats controller.
const statsService = require('../services/statsService');
const { ok } = require('../utils/respond');
const { asyncHandler } = require('../utils/asyncHandler');

const getStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getPublicStats();
  return ok(res, stats);
});

module.exports = { getStats };
