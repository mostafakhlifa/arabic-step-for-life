// Message controller (authenticated users).
const messageService = require('../services/messageService');
const { ok } = require('../utils/respond');
const { toMessageJson } = require('../utils/serializers');
const { asyncHandler } = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const messages = await messageService.listMessagesForUser(req.user);
  return ok(res, messages.map(toMessageJson));
});

const create = asyncHandler(async (req, res) => {
  const message = await messageService.createMessage(req.user, req.body);
  return ok(res, toMessageJson(message), 201);
});

const markRead = asyncHandler(async (req, res) => {
  const message = await messageService.markMessageRead(req.params.id, req.user);
  return ok(res, toMessageJson(message));
});

module.exports = { list, create, markRead };
