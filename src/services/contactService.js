// Contact form: always stored in Postgres; an email notification is sent
// only when SMTP is configured AND a notification address is set.
const { prisma } = require('../config/db');
const { config } = require('../config/env');
const { sendEmail } = require('../utils/email');

async function createContactMessage({ name, email, phone, subject, message }) {
  const created = await prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
    },
  });

  if (config.contactNotificationEmail) {
    await sendEmail({
      to: config.contactNotificationEmail,
      subject: `New contact message: ${created.subject}`,
      text: `From: ${created.name} <${created.email}>${created.phone ? ` (${created.phone})` : ''}\n\n${created.message}`,
    });
  }
  return created;
}

module.exports = { createContactMessage };
