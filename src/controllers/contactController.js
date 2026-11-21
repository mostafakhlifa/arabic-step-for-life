// Contact form controller (public).
const contactService = require('../services/contactService');
const { ok } = require('../utils/respond');
const { asyncHandler } = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const message = await contactService.createContactMessage(req.body);
  return ok(res, { id: message.id, message: 'Thank you for contacting us. We will get back to you soon.' }, 201);
});

module.exports = { create };
