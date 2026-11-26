const { computeTotals, formatMoney } = require('../../src/services/quotation.service');
const { generateQuotationPdf } = require('../../src/services/pdf.service');
const emailService = require('../../src/services/email.service');

const items = [
  { description: 'Managed Wi-Fi access point', quantity: 12, unit: 'Nos', unitPrice: 18500, taxRate: 18 },
  { description: 'Installation & configuration', quantity: 1, unit: 'Lot', unitPrice: 25000.5, taxRate: 18 },
  { description: 'Zero-rated item', quantity: 3, unitPrice: 99.99, taxRate: 0 },
];

describe('quotation totals', () => {
  test('computes line and grand totals with 2-decimal rounding', () => {
    const t = computeTotals(items);
    expect(t.items[0]).toMatchObject({ lineSubtotal: 222000, lineTax: 39960, lineTotal: 261960 });
    expect(t.items[1]).toMatchObject({ lineSubtotal: 25000.5, lineTax: 4500.09, lineTotal: 29500.59 });
    expect(t.items[2]).toMatchObject({ lineSubtotal: 299.97, lineTax: 0 });
    expect(t.subtotal).toBe(247300.47);
    expect(t.taxTotal).toBe(44460.09);
    expect(t.total).toBe(291760.56);
  });

  test('formats money in Indian grouping', () => {
    expect(formatMoney(291760.56)).toBe('INR 2,91,760.56');
  });
});

const quotationDoc = (status = 'approved') => ({
  quoteNumber: 'CCQ-20260101-TEST',
  currency: 'INR',
  status,
  validUntil: new Date(Date.now() + 15 * 864e5),
  terms: 'Line one\nLine two',
  notes: 'Demo note',
  ...computeTotals(items),
});

const enquiryDoc = {
  reference: 'CC-20260101-ABCDE',
  location: 'Bengaluru',
  customer: { name: 'Priya <script>', company: 'Green Valley School', email: 'priya@example.com', phone: '+91 98765 43210' },
};

describe('PDF generation', () => {
  test('produces a valid PDF buffer', async () => {
    const pdf = await generateQuotationPdf({ quotation: quotationDoc(), enquiry: enquiryDoc });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
  });

  test('handles many line items across pages', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ description: `Item ${i} with a longer description to wrap onto two lines in the table`, quantity: 1, unitPrice: 100, taxRate: 18 }));
    const pdf = await generateQuotationPdf({ quotation: { ...quotationDoc('draft'), ...computeTotals(many) }, enquiry: enquiryDoc });
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    expect(pages).toBeGreaterThan(1);
  });
});

describe('email service', () => {
  afterEach(() => emailService.setTransport(null));

  test('sends quotation with PDF attachment and escapes HTML', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'x' });
    emailService.setTransport({ sendMail });
    const result = await emailService.sendQuotationEmail({ enquiry: enquiryDoc, quotation: quotationDoc(), pdfBuffer: Buffer.from('%PDF-') });

    expect(result).toEqual({ success: true, error: null });
    const msg = sendMail.mock.calls[0][0];
    expect(msg.to).toBe('priya@example.com');
    expect(msg.attachments[0].filename).toBe('CCQ-20260101-TEST.pdf');
    expect(msg.html).toContain('Priya &lt;script&gt;');
    expect(msg.html).not.toContain('<script>');
  });

  test('returns a failure result instead of throwing when delivery fails', async () => {
    emailService.setTransport({ sendMail: jest.fn().mockRejectedValue(new Error('SMTP 535 auth failed')) });
    const result = await emailService.sendQuotationEmail({ enquiry: enquiryDoc, quotation: quotationDoc(), pdfBuffer: Buffer.alloc(1) });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/could not be sent/);
    // The raw SMTP error (which can contain server details) is not exposed to callers.
    expect(result.error).not.toMatch(/535/);
  });
});
