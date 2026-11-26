/** Shared option lists. The frontend fetches these from /api/catalogue so both sides stay in sync. */

const ENQUIRY_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'quotation_prepared', label: 'Quotation Prepared' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const BUDGET_RANGES = [
  { value: 'under-1l', label: 'Under ₹1 lakh' },
  { value: '1l-5l', label: '₹1 – 5 lakh' },
  { value: '5l-20l', label: '₹5 – 20 lakh' },
  { value: '20l-50l', label: '₹20 – 50 lakh' },
  { value: 'above-50l', label: 'Above ₹50 lakh' },
  { value: 'not-sure', label: 'Not sure yet' },
];

const INDUSTRIES = [
  'Education',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Banking & Finance',
  'IT & Software',
  'Government & Public Sector',
  'Hospitality',
  'Logistics',
  'Real Estate & Construction',
  'Professional Services',
  'Other',
];

const QUOTATION_STATUSES = ['draft', 'approved', 'sent'];

module.exports = {
  ENQUIRY_STATUSES,
  STATUS_VALUES: ENQUIRY_STATUSES.map((s) => s.value),
  EMPLOYEE_RANGES,
  BUDGET_RANGES,
  BUDGET_VALUES: BUDGET_RANGES.map((b) => b.value),
  INDUSTRIES,
  QUOTATION_STATUSES,
};
