/**
 * Generates the quotation PDF (A4) with PDFKit and returns it as a Buffer.
 * Only admin-entered figures are printed. Unapproved quotations carry a DRAFT
 * watermark so they can't be mistaken for an official offer.
 */
const PDFDocument = require('pdfkit');
const { config } = require('../config/env');
const { formatMoney } = require('./quotation.service');

const COLORS = { navy: '#0B1F3A', blue: '#1E5AA8', muted: '#5B6B82', line: '#D5DDE8', light: '#F3F6FA' };
const M = 50; // page margin
const W = 595.28 - M * 2; // usable width on A4

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function drawWatermark(doc) {
  doc.save();
  doc.rotate(-35, { origin: [297, 421] });
  doc.font('Helvetica-Bold').fontSize(110).fillColor('#E4E9F0').opacity(0.6);
  doc.text('DRAFT', 0, 360, { width: 595, align: 'center' });
  doc.restore();
  doc.opacity(1);
}

function drawHeader(doc, company) {
  doc.rect(0, 0, 595.28, 90).fill(COLORS.navy);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(company.name, M, 28, { width: W / 2 });
  doc.font('Helvetica').fontSize(9).fillColor('#C9D6EA');
  const contact = [company.website, company.email, company.phone].filter(Boolean).join('  |  ');
  doc.text(contact, M, 56, { width: W / 2 + 60 });
  if (company.address) doc.text(company.address, M, 68, { width: W / 2 + 60 });
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF').text('QUOTATION', M, 32, { width: W, align: 'right' });
  doc.fillColor('#000000');
}

const COLS = [
  { key: 'n', label: '#', w: 22, align: 'left' },
  { key: 'description', label: 'Description', w: 183, align: 'left' },
  { key: 'qty', label: 'Qty', w: 50, align: 'right' },
  { key: 'unitPrice', label: 'Unit price', w: 80, align: 'right' },
  { key: 'tax', label: 'Tax', w: 70, align: 'right' },
  { key: 'total', label: 'Amount', w: 90, align: 'right' },
];

function drawTableHeader(doc, y) {
  doc.rect(M, y, W, 22).fill(COLORS.light);
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9);
  let x = M + 6;
  for (const c of COLS) {
    doc.text(c.label, x, y + 7, { width: c.w - 8, align: c.align });
    x += c.w;
  }
  return y + 22;
}

function generateQuotationPdf({ quotation, enquiry }) {
  return new Promise((resolve, reject) => {
    const company = config.company;
    const currency = quotation.currency || 'INR';
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: {
      Title: `Quotation ${quotation.quoteNumber}`,
      Author: company.name,
    } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const isDraft = quotation.status === 'draft';
    const newPage = () => {
      doc.addPage();
      if (isDraft) drawWatermark(doc);
      drawHeader(doc, company);
      return 110;
    };

    if (isDraft) drawWatermark(doc);
    drawHeader(doc, company);

    // Meta + bill-to block
    let y = 112;
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9);
    doc.text('Quotation no.', M + W - 200, y, { width: 90 });
    doc.text('Date', M + W - 200, y + 15, { width: 90 });
    doc.text('Valid until', M + W - 200, y + 30, { width: 90 });
    doc.text('Enquiry ref.', M + W - 200, y + 45, { width: 90 });
    doc.fillColor(COLORS.navy).font('Helvetica-Bold');
    doc.text(quotation.quoteNumber, M + W - 110, y, { width: 110, align: 'right' });
    doc.text(fmtDate(quotation.approvedAt || quotation.updatedAt || new Date()), M + W - 110, y + 15, { width: 110, align: 'right' });
    doc.text(fmtDate(quotation.validUntil), M + W - 110, y + 30, { width: 110, align: 'right' });
    doc.text(enquiry.reference, M + W - 110, y + 45, { width: 110, align: 'right' });

    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(9).text('PREPARED FOR', M, y);
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text(enquiry.customer.company, M, y + 14, { width: 260 });
    doc.font('Helvetica').fontSize(9.5).fillColor('#222222');
    doc.text(enquiry.customer.name, { width: 260 });
    doc.text(enquiry.customer.email, { width: 260 });
    doc.text(enquiry.customer.phone, { width: 260 });
    doc.text(enquiry.location, { width: 260 });
    if (company.gstin) doc.fillColor(COLORS.muted).text(`Supplier GSTIN: ${company.gstin}`, { width: 260 });

    // Line items
    y = Math.max(doc.y, y + 60) + 20;
    y = drawTableHeader(doc, y);
    doc.font('Helvetica').fontSize(9).fillColor('#222222');

    quotation.items.forEach((item, i) => {
      const cells = {
        n: String(i + 1),
        description: item.description,
        qty: `${item.quantity} ${item.unit || ''}`.trim(),
        unitPrice: formatMoney(item.unitPrice, '').trim(),
        tax: `${item.taxRate}%\n${formatMoney(item.lineTax, '').trim()}`,
        total: formatMoney(item.lineTotal, '').trim(),
      };
      const rowH = Math.max(doc.heightOfString(cells.description, { width: COLS[1].w - 8 }), 22) + 10;
      if (y + rowH > 841.89 - 150) {
        y = drawTableHeader(doc, newPage());
        doc.font('Helvetica').fontSize(9).fillColor('#222222');
      }
      let x = M + 6;
      for (const c of COLS) {
        doc.text(cells[c.key], x, y + 6, { width: c.w - 8, align: c.align });
        x += c.w;
      }
      y += rowH;
      doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    });

    // Totals
    if (y > 841.89 - 260) y = newPage();
    y += 12;
    const tx = M + W - 220;
    const row = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(bold ? COLORS.navy : '#222222');
      doc.text(label, tx, y, { width: 110 });
      doc.text(value, tx + 110, y, { width: 110, align: 'right' });
      y += bold ? 20 : 16;
    };
    row('Subtotal', formatMoney(quotation.subtotal, currency));
    row('Taxes', formatMoney(quotation.taxTotal, currency));
    doc.moveTo(tx, y).lineTo(M + W, y).lineWidth(1).strokeColor(COLORS.navy).stroke();
    y += 6;
    row('Total', formatMoney(quotation.total, currency), true);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(`Amounts in ${currency}.`, tx, y, { width: 220, align: 'right' });

    // Terms & notes
    y += 28;
    const section = (title, body) => {
      if (!body) return;
      if (y > 841.89 - 140) y = newPage();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.navy).text(title, M, y);
      doc.font('Helvetica').fontSize(9).fillColor('#333333').text(body, M, doc.y + 4, { width: W, lineGap: 2 });
      y = doc.y + 16;
    };
    section('Notes', quotation.notes);
    section('Terms & conditions', quotation.terms);

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      // The footer sits inside the bottom margin; without this PDFKit would start a new page.
      doc.page.margins.bottom = 0;
      const fy = 841.89 - 45;
      doc.moveTo(M, fy - 8).lineTo(M + W, fy - 8).lineWidth(0.5).strokeColor(COLORS.line).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
      const footer = isDraft
        ? 'DRAFT - not an offer. Prices are subject to approval by Cyber Communications.'
        : `All prices in this quotation were entered and approved by ${company.name}.`;
      doc.text(footer, M, fy, { width: W - 60, lineBreak: false });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, M + W - 60, fy, { width: 60, align: 'right', lineBreak: false });
    }

    doc.end();
  });
}

module.exports = { generateQuotationPdf };
