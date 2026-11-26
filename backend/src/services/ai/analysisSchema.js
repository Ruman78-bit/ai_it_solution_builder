/**
 * The contract for AI output.
 *
 * 1. `jsonSchema` is sent to the provider so the model is forced to answer in this shape.
 * 2. `rawAnalysisSchema` re-validates whatever comes back (models can still misbehave).
 * 3. `sanitizeAnalysis` enforces business rules a schema can't express: only catalogue
 *    categories, no prices / stock / warranty / delivery promises, bounded list sizes.
 */
const { z } = require('zod');
const { categoryIds } = require('../../config/catalogue');
const { cleanText } = require('../../utils/sanitize');

const LIMITS = { list: 8, item: 400, summary: 1200 };

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'projectSummary',
    'identifiedRequirements',
    'relevantServiceCategories',
    'suggestedComponents',
    'missingInformation',
    'followUpQuestions',
  ],
  properties: {
    projectSummary: { type: 'string', description: 'Two to four sentence neutral summary of what the customer needs.' },
    identifiedRequirements: { type: 'array', items: { type: 'string' }, description: 'Concrete requirements stated or clearly implied by the customer.' },
    relevantServiceCategories: { type: 'array', items: { type: 'string', enum: categoryIds } },
    suggestedComponents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'purpose'],
        properties: {
          name: { type: 'string', description: 'Generic component type, never a specific model, price or SKU.' },
          category: { type: 'string', enum: categoryIds },
          purpose: { type: 'string' },
        },
      },
    },
    missingInformation: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } },
  },
};

const str = z.string().transform(cleanText);

const rawAnalysisSchema = z.object({
  projectSummary: str.pipe(z.string().min(1)),
  identifiedRequirements: z.array(str).default([]),
  relevantServiceCategories: z.array(z.string()).default([]),
  suggestedComponents: z
    .array(z.object({ name: str, category: z.string(), purpose: str.optional().default('') }))
    .default([]),
  missingInformation: z.array(str).default([]),
  followUpQuestions: z.array(str).default([]),
});

// Statements the AI must never make: prices, stock, warranty terms, delivery commitments.
const FORBIDDEN_PATTERNS = [
  /(₹|\brs\.?\s*\d|\binr\s*\d|\$\s*\d|\busd\b|€|£)/i,
  /\b\d[\d,.]*\s*(lakh|lakhs|crore|crores)\b/i,
  /\b(price|pricing|cost|costs|priced)\b[^.?!]{0,20}\d/i,
  /\b(in stock|out of stock|available (now|immediately|today)|ready stock)\b/i,
  /\b\d+[\s-]*(year|yr|month)s?[\s-]*(warranty|guarantee)\b/i,
  /\b(guarantee|guaranteed)\b/i,
  /\bdeliver(ed|y)?\b[^.?!]{0,25}\b(within|in)\s+\d+\s*(hour|day|week|month)s?/i,
];

const hasForbiddenClaim = (text) => FORBIDDEN_PATTERNS.some((re) => re.test(text));

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function cleanList(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const t = truncate(item, LIMITS.item);
    const key = t.toLowerCase();
    if (!t || seen.has(key) || hasForbiddenClaim(t)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= LIMITS.list) break;
  }
  return out;
}

function cleanSummary(summary) {
  // Drop individual sentences that contain forbidden claims instead of the whole summary.
  const sentences = summary.match(/[^.!?]+[.!?]*/g) || [summary];
  const kept = sentences.map((s) => s.trim()).filter((s) => s && !hasForbiddenClaim(s));
  return truncate(kept.join(' '), LIMITS.summary);
}

/**
 * Validates and cleans raw provider output. Throws if the output is unusable,
 * which makes the caller fall back to the basic analyser.
 */
function sanitizeAnalysis(raw) {
  const parsed = rawAnalysisSchema.parse(raw);

  const relevantServiceCategories = [...new Set(parsed.relevantServiceCategories)].filter((id) =>
    categoryIds.includes(id)
  );

  const suggestedComponents = [];
  for (const c of parsed.suggestedComponents) {
    if (!categoryIds.includes(c.category)) continue;
    const name = truncate(c.name, 200);
    const purpose = truncate(c.purpose || '', LIMITS.item);
    if (!name || hasForbiddenClaim(name) || hasForbiddenClaim(purpose)) continue;
    suggestedComponents.push({ name, category: c.category, purpose });
    if (suggestedComponents.length >= LIMITS.list) break;
  }

  const projectSummary = cleanSummary(parsed.projectSummary);
  if (!projectSummary) throw new Error('AI summary was empty after removing disallowed content');

  return {
    projectSummary,
    identifiedRequirements: cleanList(parsed.identifiedRequirements),
    relevantServiceCategories,
    suggestedComponents,
    missingInformation: cleanList(parsed.missingInformation),
    followUpQuestions: cleanList(parsed.followUpQuestions),
  };
}

module.exports = { jsonSchema, sanitizeAnalysis, hasForbiddenClaim };
