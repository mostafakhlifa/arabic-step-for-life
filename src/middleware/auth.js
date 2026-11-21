// Session auth middleware.
//
// loadUser: resolves req.session.userId to req.user on every /api request.
//   - If the user no longer exists or is inactive, the session is destroyed
//     and the request proceeds unauthenticated (protected routes then 401).
// requireAuth / requireRole / requireAdmin / requireSuperAdmin: guards.
const { prisma } = require('../config/db');
const { ApiError } = require('./errorHandler');

async function loadUser(req, res, next) {
  req.user = null;
  const userId = req.session && req.session.userId;
  if (!userId) return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      // Inactive or deleted user: invalidate the session immediately.
      req.user = null;
      req.session.destroy(() => {});
      if (res.clearCookie) res.clearCookie('connect.sid');
      return next();
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized('Please log in to continue.'));
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Please log in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to do that.'));
    }
    return next();
  };
}

const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
const requireSuperAdmin = requireRole('SUPER_ADMIN');

module.exports = { loadUser, requireAuth, requireRole, requireAdmin, requireSuperAdmin };
