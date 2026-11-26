/**
 * Admin enquiry management: dashboard stats, list/search, detail and status changes.
 */
const Enquiry = require('../models/Enquiry');
const Quotation = require('../models/Quotation');
const { ENQUIRY_STATUSES } = require('../config/constants');
const { ApiError } = require('../utils/errors');
const { escapeRegex } = require('../utils/sanitize');

async function stats(_req, res) {
  const [total, grouped, recent] = await Promise.all([
    Enquiry.countDocuments(),
    Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reference customer.name customer.company status createdAt services')
      .lean(),
  ]);

  const byStatus = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s.value, 0]));
  for (const g of grouped) byStatus[g._id] = g.count;

  res.json({ success: true, data: { total, pending: byStatus.pending, byStatus, recent } });
}

async function listEnquiries(req, res) {
  const { search, status, page, limit } = req.valid.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ reference: re }, { 'customer.name': re }, { 'customer.company': re }, { 'customer.email': re }];
  }

  // sanitizeFilter is on globally; trust our own constructed filter object here.
  const query = Enquiry.find(filter).setOptions({ sanitizeFilter: false });
  const [items, total] = await Promise.all([
    query
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('reference customer industry employeeCount services budget location status aiStatus createdAt')
      .lean(),
    Enquiry.countDocuments(filter).setOptions({ sanitizeFilter: false }),
  ]);

  res.json({
    success: true,
    data: { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } },
  });
}

async function getEnquiry(req, res) {
  const enquiry = await Enquiry.findById(req.valid.params.id).populate('statusHistory.changedBy', 'name email').lean();
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  const quotation = await Quotation.findOne({ enquiry: enquiry._id })
    .populate('approvedBy', 'name')
    .populate('updatedBy', 'name')
    .lean();

  res.json({ success: true, data: { enquiry, quotation } });
}

async function updateStatus(req, res) {
  const { status, note } = req.valid.body;
  const enquiry = await Enquiry.findById(req.valid.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  if (status === 'sent') {
    const q = await Quotation.findOne({ enquiry: enquiry._id }).lean();
    if (!q || q.status !== 'sent') {
      throw ApiError.badRequest('Use "Send quotation" to email the customer; the status updates automatically.');
    }
  }

  if (enquiry.status !== status || note) {
    enquiry.status = status;
    enquiry.statusHistory.push({ status, note, changedBy: req.admin._id });
    await enquiry.save();
  }

  res.json({ success: true, data: { status: enquiry.status, statusHistory: enquiry.statusHistory } });
}

module.exports = { stats, listEnquiries, getEnquiry, updateStatus };
