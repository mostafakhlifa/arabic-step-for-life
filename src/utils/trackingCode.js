// Public application tracking codes, e.g. ASL-2026-A1B2C3.
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I

function generateTrackingCode() {
  const year = new Date().getFullYear();
  let suffix = '';
  const bytes = crypto.randomBytes(6);
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `ASL-${year}-${suffix}`;
}

module.exports = { generateTrackingCode };
