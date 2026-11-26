const mongoose = require('mongoose');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}

/** Converts every error into the same JSON shape: { success: false, error: { code, message, details? } } */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.badRequest(
      'Please correct the highlighted fields.',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest('Invalid identifier');
  } else if (err && err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Request body is not valid JSON');
  } else if (err && err.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body is too large', { code: 'PAYLOAD_TOO_LARGE' });
  } else if (err && err.code === 11000) {
    error = ApiError.conflict('A record with these details already exists');
  } else if (err && err.message && err.message.startsWith('CORS')) {
    error = ApiError.forbidden('Origin not allowed');
  } else if (!(err instanceof ApiError)) {
    logger.error('Unhandled error', { path: req.path, method: req.method, error: err && err.message });
    error = new ApiError(500, 'Something went wrong on our side. Please try again.');
  }

  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) body.error.details = error.details;
  res.status(error.statusCode).json(body);
}

module.exports = { notFound, errorHandler };
