// Cryptographically random tokens (email verification, password reset).
const crypto = require('crypto');

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

module.exports = { randomToken, hoursFromNow };
