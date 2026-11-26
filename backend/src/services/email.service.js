/**
 * Email notifications through Nodemailer.
 *
 * EMAIL_TRANSPORT:
 *   smtp      - real delivery via any SMTP provider (SendGrid, Amazon SES, Brevo, Gmail, Zoho...)
 *   json      - development: builds the message but does not send it; logs recipient + subject only
 *   disabled  - emails are skipped and reported as not sent
 *
 * Functions here return { success, error } instead of throwing, so a mail
 * failure never breaks the request that triggered it.
 */
const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { escapeHtml } = require('../utils/sanitize');
const { formatMoney } = require('./quotation.service');

let transporter = null;

function createTransport() {
  const { transport, smtp } = config.email;
  if (transport === 'smtp') {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }
  if (transport === 'json') return nodemailer.createTransport({ jsonTransport: true });
  return null;
}

function getTransport() {
  if (transporter === null) transporter = createTransport();
  return transporter;
}

/** Test seam: inject a fake transport (or null to reset). */
function setTransport(t) {
  transporter = t;
}

async function send(message) {
  const t = getTransport();
  if (!t) return { success: false, error: 'Email sending is disabled (EMAIL_TRANSPORT=disabled).' };
  try {
    const info = await t.sendMail({
      from: config.email.from,
      replyTo: config.email.replyTo || undefined,
      ...message,
    });
    logger.info('Email sent', { to: message.to, subject: message.subject, transport: config.email.transport, messageId: info && info.messageId });
    return { success: true, error: null };
  } catch (err) {
    logger.error('Email failed', { to: message.to, subject: message.subject, error: err && err.message });
    return { success: false, error: 'The email could not be sent. Check the email settings and try again.' };
  }
}

const layout = (inner) => `<!doctype html><html><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0b1f3a;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:bold">${escapeHtml(config.company.name)}</td></tr>
<tr><td style="padding:28px;font-size:14px;line-height:1.6">${inner}</td></tr>
<tr><td style="padding:16px 28px;background:#f3f6fa;color:#5b6b82;font-size:12px">${escapeHtml(config.company.website)}</td></tr>
</table></td></tr></table></body></html>`;

function sendQuotationEmail({ enquiry, quotation, pdfBuffer }) {
  const name = escapeHtml(enquiry.customer.name);
  const total = escapeHtml(formatMoney(quotation.total, quotation.currency));
  const validUntil = new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const html = layout(`
    <p>Dear ${name},</p>
    <p>Thank you for your enquiry <strong>${escapeHtml(enquiry.reference)}</strong>. Please find attached our quotation
    <strong>${escapeHtml(quotation.quoteNumber)}</strong> for ${escapeHtml(enquiry.customer.company)}.</p>
    <table role="presentation" cellpadding="6" style="border-collapse:collapse;margin:16px 0;background:#f3f6fa;border-radius:6px">
      <tr><td style="color:#5b6b82">Quotation total</td><td><strong>${total}</strong></td></tr>
      <tr><td style="color:#5b6b82">Valid until</td><td>${escapeHtml(validUntil)}</td></tr>
    </table>
    <p>If you have any questions or would like to proceed, simply reply to this email.</p>
    <p>Regards,<br/>${escapeHtml(config.company.name)}</p>`);

  const text = `Dear ${enquiry.customer.name},

Thank you for your enquiry ${enquiry.reference}. Please find attached our quotation ${quotation.quoteNumber} for ${enquiry.customer.company}.

Quotation total: ${formatMoney(quotation.total, quotation.currency)}
Valid until: ${validUntil}

If you have any questions or would like to proceed, simply reply to this email.

Regards,
${config.company.name}`;

  return send({
    to: enquiry.customer.email,
    subject: `Quotation ${quotation.quoteNumber} – ${config.company.name}`,
    text,
    html,
    attachments: [{ filename: `${quotation.quoteNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}

function sendNewEnquiryNotification(enquiry) {
  const to = config.email.adminNotifyTo;
  if (!to) return Promise.resolve({ success: false, error: 'ADMIN_NOTIFY_EMAIL not set' });
  const html = layout(`
    <p>A new enquiry has been submitted.</p>
    <p><strong>${escapeHtml(enquiry.reference)}</strong><br/>
    ${escapeHtml(enquiry.customer.company)} – ${escapeHtml(enquiry.customer.name)}<br/>
    ${escapeHtml(enquiry.industry)}, ${escapeHtml(enquiry.employeeCount)} employees, ${escapeHtml(enquiry.location)}</p>
    <p>Sign in to the admin dashboard to review it.</p>`);
  return send({
    to,
    subject: `New enquiry ${enquiry.reference} from ${enquiry.customer.company}`,
    text: `New enquiry ${enquiry.reference} from ${enquiry.customer.company} (${enquiry.customer.name}). Sign in to the admin dashboard to review it.`,
    html,
  });
}

module.exports = { sendQuotationEmail, sendNewEnquiryNotification, setTransport };
