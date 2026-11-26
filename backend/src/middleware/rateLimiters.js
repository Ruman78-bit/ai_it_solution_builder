const { rateLimit } = require('express-rate-limit');
const { config } = require('../config/env');

const make = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, res) =>
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message } }),
  });

module.exports = {
  apiLimiter: make(15, 300, 'Too many requests. Please try again in a few minutes.'),
  // AI calls cost money, so they get the tightest limit.
  analyzeLimiter: make(15, 10, 'Too many analysis requests. Please wait a few minutes and try again.'),
  submitLimiter: make(60, 10, 'Too many enquiries from this connection. Please try again later.'),
  loginLimiter: make(15, 10, 'Too many sign-in attempts. Please wait 15 minutes and try again.'),
};
