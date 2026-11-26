/**
 * Request validation schemas (Zod). All user input passes through one of these
 * before reaching a controller: strings are trimmed and cleaned of control
 * characters, lengths are capped, and enum fields only accept known values.
 */
const { z } = require('zod');
const { categoryIds } = require('../config/catalogue');
const { STATUS_VALUES, EMPLOYEE_RANGES, BUDGET_VALUES, INDUSTRIES } = require('../config/constants');
const { cleanText } = require('../utils/sanitize');

const text = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`)
    );

const optionalText = (max, label) =>
  z
    .string()
    .optional()
    .default('')
    .transform(cleanText)
    .pipe(z.string().max(max, `${label} must be at most ${max} characters`));

const enumOf = (values, label) =>
  z.string({ error: `${label} is required` }).refine((v) => values.includes(v), `Select a valid ${label.toLowerCase()}`);

const servicesField = z
  .array(z.string(), { error: 'Select at least one service' })
  .min(1, 'Select at least one service')
  .max(categoryIds.length)
  .refine((arr) => arr.every((id) => categoryIds.includes(id)), 'One or more selected services are not recognised')
  .transform((arr) => [...new Set(arr)]);

// Fields that describe the requirement. These (and only these) may be sent to the AI provider.
const requirementShape = {
  industry: enumOf(INDUSTRIES, 'Industry'),
  employeeCount: enumOf(EMPLOYEE_RANGES, 'Number of employees'),
  services: servicesField,
  requirements: text(30, 5000, 'Requirements'),
  budget: enumOf(BUDGET_VALUES, 'Budget'),
  location: text(2, 120, 'Location'),
  notes: optionalText(2000, 'Notes'),
};

const analyzeSchema = z.object(requirementShape);

const phone = z
  .string({ error: 'Phone is required' })
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, 'Phone is required')
      .regex(/^\+?[0-9\s()-]{7,20}$/, 'Enter a valid phone number (digits, spaces, +, - and brackets only)')
      .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number')
  );

const enquirySchema = z.object({
  name: text(2, 100, 'Name'),
  company: text(2, 150, 'Company'),
  email: z
    .string({ error: 'Email is required' })
    .transform((v) => cleanText(v).toLowerCase())
    .pipe(z.email('Enter a valid email address').max(254)),
  phone,
  ...requirementShape,
  // Optional signed analysis returned earlier by /api/enquiries/analyze.
  analysisToken: z.string().max(20000).optional(),
});

const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .transform((v) => cleanText(v).toLowerCase())
    .pipe(z.email('Enter a valid email address')),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(200),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParams = z.object({ id: objectId });

const listQuerySchema = z.object({
  search: z.string().max(100).optional().transform((v) => (v ? cleanText(v) : undefined)),
  status: z
    .string()
    .optional()
    .refine((v) => !v || STATUS_VALUES.includes(v), 'Unknown status'),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const statusUpdateSchema = z.object({
  status: enumOf(STATUS_VALUES, 'Status'),
  note: optionalText(1000, 'Note'),
});

const money = (label) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .refine(Number.isFinite, `${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(1e10, `${label} is too large`);

const lineItemSchema = z.object({
  description: text(2, 500, 'Description'),
  quantity: z.coerce.number({ error: 'Quantity must be a number' }).min(0.01, 'Quantity must be greater than 0').max(1e6),
  unit: optionalText(20, 'Unit').transform((v) => v || 'Nos'),
  unitPrice: money('Unit price'),
  taxRate: z.coerce.number({ error: 'Tax rate must be a number' }).min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
});

const quotationSchema = z.object({
  items: z.array(lineItemSchema).min(1, 'Add at least one line item').max(100),
  validUntil: z.coerce
    .date({ error: 'Valid-until date is required' })
    .refine((d) => d.getTime() > Date.now() - 24 * 3600 * 1000, 'Valid-until date cannot be in the past'),
  terms: optionalText(5000, 'Terms'),
  notes: optionalText(2000, 'Notes'),
});

module.exports = {
  analyzeSchema,
  enquirySchema,
  loginSchema,
  idParams,
  listQuerySchema,
  statusUpdateSchema,
  quotationSchema,
};
