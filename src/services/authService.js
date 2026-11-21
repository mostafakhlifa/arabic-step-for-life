// Auth business logic: registration, login, verification, password reset,
// profile updates. Controllers stay thin; this module owns the rules.
const { prisma } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { hashPassword, verifyPassword } = require('../utils/password');
const { randomToken, hoursFromNow } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

async function registerUser({ firstName, lastName, email, phone, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const passwordHash = await hashPassword(password);
  const verificationToken = randomToken();
  const user = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      passwordHash,
      verificationToken,
      verificationTokenExpires: hoursFromNow(24),
    },
  });
  // Best-effort: registration succeeds even if email cannot be sent.
  await sendVerificationEmail(user, verificationToken);
  return user;
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // Same generic error for unknown email / wrong password / inactive account.
  if (!user) throw ApiError.unauthorized('Invalid email or password.');
  if (!user.isActive) throw ApiError.unauthorized('Invalid email or password.');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password.');
  return user;
}

async function verifyEmailToken(token) {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token, verificationTokenExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired.');
  return prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpires: null },
  });
}

async function requestPasswordReset(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // Always silent: callers return the same generic message either way so
  // password-reset requests cannot be used to enumerate accounts.
  if (!user || !user.isActive) return;
  const resetToken = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires: hoursFromNow(1) },
  });
  await sendPasswordResetEmail(user, resetToken);
}

async function resetPassword(token, newPassword) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired.');
  const passwordHash = await hashPassword(newPassword);
  return prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpires: null },
  });
}

async function updateProfile(userId, { firstName, lastName, phone }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : null,
    },
  });
}

async function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

module.exports = {
  registerUser,
  loginUser,
  verifyEmailToken,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  getUserById,
};
