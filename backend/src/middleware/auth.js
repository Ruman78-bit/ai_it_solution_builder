const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const Admin = require('../models/Admin');
const { ApiError } = require('../utils/errors');

function signToken(admin) {
  return jwt.sign({ sub: String(admin._id), role: admin.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256',
  });
}

/** Requires a valid Bearer token and loads the admin it belongs to (so deleted admins lose access). */
async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(ApiError.unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
  } catch (err) {
    const expired = err && err.name === 'TokenExpiredError';
    return next(ApiError.unauthorized(expired ? 'Your session has expired. Please sign in again.' : 'Invalid session'));
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin) return next(ApiError.unauthorized('Invalid session'));
  req.admin = admin;
  return next();
}

/** Authorisation: only the listed roles may continue. */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) return next(ApiError.forbidden());
    return next();
  };
}

module.exports = { signToken, authenticate, requireRole };
