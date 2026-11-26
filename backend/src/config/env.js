/**
 * Central configuration. Every value that differs between environments
 * (secrets, URLs, provider choices) is read from environment variables here
 * and nowhere else, so the rest of the code never touches process.env.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const toNumber = (value, fallback) => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/it_solution_builder',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true',

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  ai: {
    // openai | anthropic | none
    provider: (process.env.AI_PROVIDER || 'none').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    // Lets you point the OpenAI provider at any OpenAI-compatible API (Groq, OpenRouter, Azure, local).
    baseUrl: process.env.AI_BASE_URL || '',
    timeoutMs: toInt(process.env.AI_TIMEOUT_MS, 30000),
    maxOutputTokens: toInt(process.env.AI_MAX_OUTPUT_TOKENS, 1500),
  },

  email: {
    // smtp | json (dev: logs a summary, sends nothing) | disabled
    transport: (process.env.EMAIL_TRANSPORT || 'json').toLowerCase(),
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: toInt(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'Cyber Communications <no-reply@example.com>',
    replyTo: process.env.EMAIL_REPLY_TO || '',
    adminNotifyTo: process.env.ADMIN_NOTIFY_EMAIL || '',
  },

  company: {
    name: process.env.COMPANY_NAME || 'Cyber Communications',
    website: process.env.COMPANY_WEBSITE || 'https://cybercommunications.in',
    // Left empty by default on purpose: these must come from the company, not be invented.
    email: process.env.COMPANY_EMAIL || '',
    phone: process.env.COMPANY_PHONE || '',
    address: process.env.COMPANY_ADDRESS || '',
    gstin: process.env.COMPANY_GSTIN || '',
  },

  quotation: {
    currency: process.env.QUOTE_CURRENCY || 'INR',
    defaultTaxRate: toNumber(process.env.QUOTE_DEFAULT_TAX_RATE, 18),
    defaultValidityDays: toInt(process.env.QUOTE_VALIDITY_DAYS, 15),
    defaultTerms:
      process.env.QUOTE_DEFAULT_TERMS ||
      [
        'Prices are valid until the date shown on this quotation.',
        'Taxes are charged at the rates shown against each line item.',
        'Delivery timelines will be confirmed in writing on receipt of purchase order.',
        'Payment terms as agreed in writing with Cyber Communications.',
      ].join('\n'),
  },
};

function assertConfig() {
  const problems = [];
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    problems.push('JWT_SECRET must be set and at least 32 characters long.');
  }
  if (config.email.transport === 'smtp' && !config.email.smtp.host) {
    problems.push('EMAIL_TRANSPORT=smtp requires SMTP_HOST.');
  }
  return problems;
}

module.exports = { config, assertConfig };
