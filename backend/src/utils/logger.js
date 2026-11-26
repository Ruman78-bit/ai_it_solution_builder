/**
 * Minimal logger. It deliberately accepts only a message and a small metadata
 * object, and redacts anything that looks like a secret, so request bodies,
 * API keys and passwords never end up in logs.
 */
const { config } = require('../config/env');

const SECRET_KEYS = /pass|secret|token|key|authorization|cookie/i;

function redact(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : v;
  }
  return out;
}

function log(level, message, meta) {
  if (config.isTest && level !== 'error') return;
  const line = { level, time: new Date().toISOString(), message, ...(meta ? redact(meta) : {}) };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
