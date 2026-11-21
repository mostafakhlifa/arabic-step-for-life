// express-validator result handling: turns validation failures into a
// single 400 { success: false, error } response listing the problems.
const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
  return next(ApiError.badRequest(`Validation failed — ${details}`));
}

module.exports = { handleValidationErrors };
