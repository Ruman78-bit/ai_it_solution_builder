const mongoose = require('mongoose');
const { STATUS_VALUES, EMPLOYEE_RANGES, BUDGET_VALUES } = require('../config/constants');
const { categoryIds } = require('../config/catalogue');

const { Schema } = mongoose;

const componentSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    category: { type: String, enum: categoryIds },
    purpose: { type: String, maxlength: 500 },
  },
  { _id: false }
);

/**
 * Preliminary analysis attached to an enquiry. `source` records whether it came
 * from an LLM ('ai') or the built-in keyword analyser ('basic'), so admins always
 * know how much weight to give it. It never contains prices.
 */
const analysisSchema = new Schema(
  {
    source: { type: String, enum: ['ai', 'basic'], required: true },
    provider: { type: String, maxlength: 50 },
    model: { type: String, maxlength: 100 },
    generatedAt: { type: Date },
    projectSummary: { type: String, maxlength: 2000 },
    identifiedRequirements: [{ type: String, maxlength: 500 }],
    relevantServiceCategories: [{ type: String, enum: categoryIds }],
    suggestedComponents: [componentSchema],
    missingInformation: [{ type: String, maxlength: 500 }],
    followUpQuestions: [{ type: String, maxlength: 500 }],
  },
  { _id: false }
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: STATUS_VALUES, required: true },
    note: { type: String, maxlength: 1000 },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enquirySchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, immutable: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      company: { type: String, required: true, trim: true, maxlength: 150 },
      email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
    },
    industry: { type: String, required: true, maxlength: 100 },
    employeeCount: { type: String, required: true, enum: EMPLOYEE_RANGES },
    services: {
      type: [{ type: String, enum: categoryIds }],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'Select at least one service' },
    },
    requirements: { type: String, required: true, maxlength: 5000 },
    budget: { type: String, required: true, enum: BUDGET_VALUES },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, maxlength: 2000, default: '' },

    aiStatus: { type: String, enum: ['completed', 'unavailable', 'not_requested'], default: 'not_requested' },
    aiAnalysis: { type: analysisSchema, default: undefined },

    status: { type: String, enum: STATUS_VALUES, default: 'pending', index: true },
    statusHistory: { type: [statusHistorySchema], default: () => [{ status: 'pending', note: 'Enquiry submitted' }] },
  },
  { timestamps: true }
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ 'customer.email': 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
