/**
 * Customer-facing endpoints: catalogue/options, AI analysis and enquiry submission.
 */
const Enquiry = require('../models/Enquiry');
const { catalogue } = require('../config/catalogue');
const { INDUSTRIES, EMPLOYEE_RANGES, BUDGET_RANGES } = require('../config/constants');
const { config } = require('../config/env');
const ai = require('../services/ai');
const email = require('../services/email.service');
const { enquiryReference } = require('../utils/reference');
const logger = require('../utils/logger');

function getCatalogue(_req, res) {
  const status = ai.aiStatusInfo();
  res.json({
    success: true,
    data: {
      company: { name: config.company.name, website: config.company.website },
      categories: catalogue,
      options: { industries: INDUSTRIES, employeeRanges: EMPLOYEE_RANGES, budgetRanges: BUDGET_RANGES },
      ai: { enabled: status.enabled },
    },
  });
}

async function analyze(req, res) {
  const input = req.valid.body;
  const { analysis, fallbackReason } = await ai.analyzeRequirements(input);
  res.json({
    success: true,
    data: {
      analysis,
      analysisToken: ai.signAnalysis(analysis, input),
      // Tells the UI whether to show "AI unavailable, basic summary shown" messaging.
      fallback: analysis.source !== 'ai',
      fallbackReason,
    },
  });
}

async function createWithUniqueReference(doc, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await Enquiry.create({ ...doc, reference: enquiryReference() });
    } catch (err) {
      const isRefClash = err && err.code === 11000 && err.keyPattern && err.keyPattern.reference;
      if (!isRefClash || i === attempts - 1) throw err;
    }
  }
  return null;
}

async function submitEnquiry(req, res) {
  const body = req.valid.body;
  const analysis = ai.verifyAnalysis(body.analysisToken, body);

  let aiStatus = 'not_requested';
  if (analysis) aiStatus = analysis.source === 'ai' ? 'completed' : 'unavailable';

  const enquiry = await createWithUniqueReference({
    customer: { name: body.name, company: body.company, email: body.email, phone: body.phone },
    industry: body.industry,
    employeeCount: body.employeeCount,
    services: body.services,
    requirements: body.requirements,
    budget: body.budget,
    location: body.location,
    notes: body.notes,
    aiStatus,
    aiAnalysis: analysis || undefined,
  });

  // Fire-and-forget: the customer's submission must not depend on email delivery.
  email.sendNewEnquiryNotification(enquiry).catch((err) => logger.warn('Admin notification failed', { error: err.message }));

  res.status(201).json({
    success: true,
    data: {
      reference: enquiry.reference,
      submittedAt: enquiry.createdAt,
      analysisAttached: Boolean(analysis),
    },
  });
}

module.exports = { getCatalogue, analyze, submitEnquiry };
