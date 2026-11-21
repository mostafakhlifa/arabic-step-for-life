// Public impact stats + admin stat management.
// Values come ONLY from the impact_stats table (seeded at 0) or admin edits —
// never invented. corePrograms is computed from active programs.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const STAT_KEYS = ['peopleSupported', 'volunteers', 'statesReached'];
const STAT_LABELS = {
  peopleSupported: 'People Supported',
  volunteers: 'Volunteers',
  statesReached: 'States Reached',
};

async function readStats() {
  const rows = await prisma.impactStat.findMany();
  const stats = { peopleSupported: 0, volunteers: 0, statesReached: 0 };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(stats, row.key)) stats[row.key] = row.value;
  }
  return stats;
}

async function getPublicStats() {
  const stats = await readStats();
  const corePrograms = await prisma.program.count({ where: { isActive: true } });
  return { ...stats, corePrograms };
}

async function getAdminStats() {
  return readStats();
}

async function updateAdminStats(values, adminUser) {
  const updates = {};
  for (const key of STAT_KEYS) {
    if (values[key] !== undefined) {
      const n = Number(values[key]);
      if (!Number.isInteger(n) || n < 0) {
        throw ApiError.badRequest(`${key} must be a non-negative integer.`);
      }
      updates[key] = n;
    }
  }
  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest('Provide at least one stat to update.');
  }
  for (const [key, value] of Object.entries(updates)) {
    await prisma.impactStat.upsert({
      where: { key },
      update: { value },
      create: { key, value, label: STAT_LABELS[key] },
    });
  }
  await logAudit(adminUser.id, 'STATS_UPDATE', 'ImpactStat', null, updates);
  return readStats();
}

module.exports = { STAT_KEYS, getPublicStats, getAdminStats, updateAdminStats };
