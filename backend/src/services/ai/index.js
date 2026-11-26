/**
 * AI service entry point (backend only).
 *
 * analyzeRequirements() NEVER throws. If the provider is not configured, times
 * out, errors, or returns invalid output, it falls back to the basic analyser so
 * the customer can always continue and submit their enquiry.
 *
 * To add a provider: create providers/<name>.js exporting { name, generate } and
 * register it in PROVIDERS below.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../../config/env');
const logger = require('../../utils/logger');
const { jsonSchema, sanitizeAnalysis } = require('./analysisSchema');
const { buildSystemPrompt, buildUserPrompt } = require('./prompt');
const basicAnalyzer = require('./basicAnalyzer');

const PROVIDERS = {
  openai: require('./providers/openai'),
  anthropic: require('./providers/anthropic'),
};

// Only these fields may ever be passed to an AI provider.
const AI_INPUT_FIELDS = ['industry', 'employeeCount', 'services', 'requirements', 'budget', 'location', 'notes'];

function pickAiInput(input) {
  const out = {};
  for (const key of AI_INPUT_FIELDS) out[key] = input[key];
  return out;
}

function getProvider(settings = config.ai) {
  if (settings.provider === 'none' || !settings.provider) return { provider: null, reason: 'not_configured' };
  const provider = PROVIDERS[settings.provider];
  if (!provider) return { provider: null, reason: 'unknown_provider' };
  if (!settings.apiKey) return { provider: null, reason: 'missing_api_key' };
  return { provider };
}

function basicResult(input, fallbackReason) {
  return {
    analysis: {
      source: 'basic',
      provider: 'basic',
      model: 'keyword-rules',
      generatedAt: new Date().toISOString(),
      ...basicAnalyzer.analyze(input),
    },
    fallbackReason,
  };
}

/**
 * @param {object} input validated requirement fields (see validators/schemas.js analyzeSchema)
 * @param {object} [deps] test seams: { settings, providers }
 */
async function analyzeRequirements(input, deps = {}) {
  const settings = deps.settings || config.ai;
  const safeInput = pickAiInput(input);
  const { provider, reason } = deps.provider ? { provider: deps.provider } : getProvider(settings);

  if (!provider) return basicResult(safeInput, reason);

  try {
    const { output, model } = await provider.generate({
      system: buildSystemPrompt(config.company.name),
      user: buildUserPrompt(safeInput),
      jsonSchema,
      settings,
    });
    const clean = sanitizeAnalysis(output);
    return {
      analysis: { source: 'ai', provider: provider.name, model, generatedAt: new Date().toISOString(), ...clean },
      fallbackReason: null,
    };
  } catch (err) {
    const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    logger.warn('AI analysis failed, using basic analysis', {
      provider: provider.name,
      reason: timedOut ? 'timeout' : err && err.message,
    });
    return basicResult(safeInput, timedOut ? 'timeout' : 'provider_error');
  }
}

/* ------------------------------------------------------------------------ *
 * Analysis token: the analysis is returned to the browser for review, then
 * sent back on submit. We sign it (with a hash of the requirement fields it was
 * generated from) so a customer cannot alter it, and so a stale analysis is not
 * stored against requirements that were edited afterwards.
 * ------------------------------------------------------------------------ */
const tokenSecret = () => `${config.jwt.secret}:analysis`;

function hashInput(input) {
  const safe = pickAiInput(input);
  const canonical = JSON.stringify(AI_INPUT_FIELDS.map((k) => (Array.isArray(safe[k]) ? [...safe[k]].sort() : safe[k] ?? '')));
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function signAnalysis(analysis, input) {
  return jwt.sign({ analysis, inputHash: hashInput(input) }, tokenSecret(), { expiresIn: '6h', algorithm: 'HS256' });
}

/** Returns the analysis if the token is valid and matches the submitted requirements, otherwise null. */
function verifyAnalysis(token, input) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, tokenSecret(), { algorithms: ['HS256'] });
    if (payload.inputHash !== hashInput(input)) return null;
    return payload.analysis;
  } catch {
    return null;
  }
}

function aiStatusInfo() {
  const { provider, reason } = getProvider();
  return { enabled: Boolean(provider), provider: provider ? provider.name : null, reason: reason || null };
}

module.exports = { analyzeRequirements, signAnalysis, verifyAnalysis, pickAiInput, aiStatusInfo, AI_INPUT_FIELDS };
