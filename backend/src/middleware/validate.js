const { ApiError } = require('../utils/errors');

/**
 * Validates req.body / req.query / req.params against Zod schemas and stores the
 * parsed, cleaned result on req.valid (Express 5 makes req.query read-only, so we
 * don't overwrite it). Controllers read only from req.valid.
 */
function validate(schemas) {
  return (req, _res, next) => {
    req.valid = req.valid || {};
    const details = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || part, message: issue.message });
        }
      }
    }

    if (details.length) {
      return next(ApiError.badRequest('Please correct the highlighted fields.', details));
    }
    return next();
  };
}

module.exports = { validate };
