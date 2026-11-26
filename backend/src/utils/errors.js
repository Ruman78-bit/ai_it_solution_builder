/** Error type used across the API so every failure has a status code and a safe message. */
class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || defaultCode(statusCode);
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: 'VALIDATION_ERROR', details });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }
}

function defaultCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
      502: 'UPSTREAM_ERROR',
    }[status] || 'INTERNAL_ERROR'
  );
}

module.exports = { ApiError };
