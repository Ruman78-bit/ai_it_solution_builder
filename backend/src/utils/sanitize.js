/** Small text helpers shared by validators, the AI module and the email/PDF templates. */

// Strip ASCII control characters except tab and newline, normalise line endings.
function cleanText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Remove email addresses and phone-like numbers from free text before it leaves the server.
function redactContactDetails(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/(\+?\d[\d\s-]{8,}\d)/g, '[phone removed]');
}

module.exports = { cleanText, escapeHtml, escapeRegex, redactContactDetails };
