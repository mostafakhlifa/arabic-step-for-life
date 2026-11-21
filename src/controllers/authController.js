// Auth controller — thin HTTP layer over authService.
const authService = require('../services/authService');
const { ok } = require('../utils/respond');
const { toUserJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

function startSession(req, user) {
  req.session.userId = user.id;
  req.session.role = user.role;
}

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  startSession(req, user);
  return ok(res, { user: toUserJson(user) }, 201);
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.loginUser(req.body);
  startSession(req, user);
  return ok(res, { user: toUserJson(user) });
});

const logout = asyncHandler(async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('connect.sid');
  return ok(res, { message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => ok(res, { user: toUserJson(req.user) }));

const verify = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmailToken(req.query.token);
  return ok(res, { user: toUserJson(user), message: 'Email verified.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  // Always the same generic message — never reveal whether the email exists.
  return ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  return ok(res, { message: 'Password has been reset. You can now log in.' });
});

const getProfile = asyncHandler(async (req, res) => ok(res, { user: toUserJson(req.user) }));

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  return ok(res, { user: toUserJson(user) });
});

module.exports = {
  register,
  login,
  logout,
  me,
  verify,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
};
