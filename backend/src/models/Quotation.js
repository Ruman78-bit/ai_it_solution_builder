const mongoose = require('mongoose');
const { QUOTATION_STATUSES } = require('../config/constants');

const { Schema } = mongoose;

/**
 * Every number in a quotation is entered by an administrator. Totals are
 * recomputed on the server on every save (see services/quotation.service.js) and
 * are never accepted from the client or from the AI module.
 */
const lineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, trim: true, maxlength: 20, default: 'Nos' },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, max: 100 },
    lineSubtotal: { type: Number, required: true },
    lineTax: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const quotationSchema = new Schema(
  {
    enquiry: { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true, unique: true },
    quoteNumber: { type: String, required: true, unique: true, immutable: true },
    currency: { type: String, default: 'INR', maxlength: 3 },
    items: {
      type: [lineItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'A quotation needs at least one line item' },
    },
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    total: { type: Number, required: true },
    validUntil: { type: Date, required: true },
    terms: { type: String, maxlength: 5000 },
    notes: { type: String, maxlength: 2000 },

    status: { type: String, enum: QUOTATION_STATUSES, default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    sentAt: { type: Date },
    lastEmail: {
      attemptedAt: Date,
      success: Boolean,
      error: { type: String, maxlength: 500 },
      to: { type: String, maxlength: 254 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quotation', quotationSchema);
