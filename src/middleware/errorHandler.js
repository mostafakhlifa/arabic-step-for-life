// Central error type + handler. Services throw ApiError(status, message);
// the handler converts any error into the { success: false, error } envelope.
const { fail } = require('../utils/respond');

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }

  static badRequest(msg = 'Bad request') { return new ApiError(400, msg); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg); }
  static unavailable(msg = 'Service unavailable') { return new ApiError(503, msg); }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return fail(res, err.status, err.message);
  }
  // Prisma unique-constraint violation (e.g. duplicate email/slug).
  if (err && err.code === 'P2002') {
    return fail(res, 409, 'A record with this value already exists.');
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return fail(res, 500, 'Internal server error');
}

module.exports = { ApiError, errorHandler };
