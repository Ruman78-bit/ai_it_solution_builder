/**
 * Quotation workflow (admin only):
 *   save (draft) -> approve -> download PDF / send by email
 * Editing an approved or sent quotation moves it back to draft so it must be
 * re-approved before it can be sent again.
 */
const Enquiry = require('../models/Enquiry');
const Quotation = require('../models/Quotation');
const { config } = require('../config/env');
const { computeTotals } = require('../services/quotation.service');
const { generateQuotationPdf } = require('../services/pdf.service');
const emailService = require('../services/email.service');
const { quoteNumber } = require('../utils/reference');
const { ApiError } = require('../utils/errors');

async function loadEnquiry(id) {
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  return enquiry;
}

async function loadQuotation(enquiryId) {
  const q = await Quotation.findOne({ enquiry: enquiryId });
  if (!q) throw ApiError.notFound('No quotation has been prepared for this enquiry yet');
  return q;
}

function addHistory(enquiry, status, note, adminId) {
  enquiry.status = status;
  enquiry.statusHistory.push({ status, note, changedBy: adminId });
}

function defaults(_req, res) {
  const validUntil = new Date(Date.now() + config.quotation.defaultValidityDays * 24 * 3600 * 1000);
  res.json({
    success: true,
    data: {
      currency: config.quotation.currency,
      taxRate: config.quotation.defaultTaxRate,
      validUntil: validUntil.toISOString().slice(0, 10),
      terms: config.quotation.defaultTerms,
    },
  });
}

async function saveQuotation(req, res) {
  const enquiry = await loadEnquiry(req.valid.params.id);
  const { items, validUntil, terms, notes } = req.valid.body;
  const totals = computeTotals(items);

  let quotation = await Quotation.findOne({ enquiry: enquiry._id });
  if (quotation) {
    Object.assign(quotation, totals, { validUntil, terms, notes, status: 'draft', updatedBy: req.admin._id });
    quotation.approvedBy = undefined;
    quotation.approvedAt = undefined;
  } else {
    quotation = new Quotation({
      ...totals,
      enquiry: enquiry._id,
      quoteNumber: quoteNumber(),
      currency: config.quotation.currency,
      validUntil,
      terms,
      notes,
      createdBy: req.admin._id,
      updatedBy: req.admin._id,
    });
  }
  await quotation.save();

  if (['pending', 'under_review'].includes(enquiry.status)) {
    addHistory(enquiry, 'quotation_prepared', `Quotation ${quotation.quoteNumber} drafted`, req.admin._id);
    await enquiry.save();
  }

  res.json({ success: true, data: { quotation, enquiryStatus: enquiry.status } });
}

async function approveQuotation(req, res) {
  const quotation = await loadQuotation(req.valid.params.id);
  if (quotation.status !== 'draft') throw ApiError.badRequest('Only a draft quotation can be approved');
  if (new Date(quotation.validUntil).getTime() < Date.now() - 24 * 3600 * 1000) {
    throw ApiError.badRequest('The valid-until date has passed. Update it before approving.');
  }
  quotation.status = 'approved';
  quotation.approvedBy = req.admin._id;
  quotation.approvedAt = new Date();
  await quotation.save();
  res.json({ success: true, data: { quotation } });
}

async function downloadPdf(req, res) {
  const enquiry = await loadEnquiry(req.valid.params.id);
  const quotation = await loadQuotation(enquiry._id);
  const pdf = await generateQuotationPdf({ quotation, enquiry });
  const suffix = quotation.status === 'draft' ? '-DRAFT' : '';
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${quotation.quoteNumber}${suffix}.pdf"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'no-store',
  });
  res.send(pdf);
}

async function sendQuotation(req, res) {
  const enquiry = await loadEnquiry(req.valid.params.id);
  const quotation = await loadQuotation(enquiry._id);
  if (!['approved', 'sent'].includes(quotation.status)) {
    throw ApiError.badRequest('Approve the quotation before sending it to the customer');
  }

  const pdfBuffer = await generateQuotationPdf({ quotation, enquiry });
  const result = await emailService.sendQuotationEmail({ enquiry, quotation, pdfBuffer });

  quotation.lastEmail = { attemptedAt: new Date(), success: result.success, error: result.error || undefined, to: enquiry.customer.email };
  if (result.success) {
    quotation.status = 'sent';
    quotation.sentAt = new Date();
  }
  await quotation.save();

  if (!result.success) {
    throw new ApiError(502, result.error || 'The email could not be sent', { code: 'EMAIL_FAILED' });
  }

  if (!['accepted', 'rejected'].includes(enquiry.status)) {
    addHistory(enquiry, 'sent', `Quotation ${quotation.quoteNumber} emailed to ${enquiry.customer.email}`, req.admin._id);
    await enquiry.save();
  }

  res.json({ success: true, data: { quotation, enquiryStatus: enquiry.status } });
}

module.exports = { defaults, saveQuotation, approveQuotation, downloadPdf, sendQuotation };
