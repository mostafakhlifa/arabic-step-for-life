// Email delivery via nodemailer — ONLY when SMTP env vars are configured.
// When SMTP is not configured this module logs and returns
// { sent: false, reason: 'SMTP not configured' } and NEVER claims delivery.
const nodemailer = require('nodemailer');
const { config } = require('../config/env');

function isSmtpConfigured() {
  const { host, user, pass } = config.smtp;
  return Boolean(host && user && pass);
}

let transporter = null;
function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Send an email. Never throws for missing SMTP config.
 * @returns {{sent: boolean, reason?: string, messageId?: string}}
 */
async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    // eslint-disable-next-line no-console
    console.log(`[email] SMTP not configured — skipping email to ${to} (${subject})`);
    return { sent: false, reason: 'SMTP not configured' };
  }
  try {
    const info = await mailer.sendMail({ from: config.smtp.from, to, subject, text, html });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Failed to send email:', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendVerificationEmail(user, token) {
  const url = `${config.appUrl}/verify.html?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your email — Arabic Step for Life',
    text: `Hello ${user.firstName},\n\nPlease verify your email address by visiting this link:\n${url}\n\nThis link expires in 24 hours.\n\n— Arabic Step for Life Organization, Inc.`,
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${config.appUrl}/reset-password.html?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your password — Arabic Step for Life',
    text: `Hello ${user.firstName},\n\nYou requested a password reset. Visit this link to set a new password:\n${url}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.\n\n— Arabic Step for Life Organization, Inc.`,
  });
}

module.exports = { isSmtpConfigured, sendEmail, sendVerificationEmail, sendPasswordResetEmail };
