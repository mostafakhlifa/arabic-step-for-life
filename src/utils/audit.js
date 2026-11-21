// Audit trail: records who did what to which record (admin actions).
const { prisma } = require('../config/db');

async function logAudit(actorId, action, targetType, targetId, details = null) {
  try {
    await prisma.auditLog.create({
      data: { actorId: actorId || null, action, targetType, targetId: targetId || null, details: details || undefined },
    });
  } catch (err) {
    // Auditing must never break the main action; log and continue.
    // eslint-disable-next-line no-console
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
