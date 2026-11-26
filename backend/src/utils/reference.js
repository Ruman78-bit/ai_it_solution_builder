const crypto = require('crypto');

// No 0/O/1/I so references are easy to read over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function datePart(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Enquiry reference, e.g. CC-20261126-7KQ4M */
const enquiryReference = () => `CC-${datePart()}-${randomCode(5)}`;

/** Quotation number, e.g. CCQ-20261126-X8B2 */
const quoteNumber = () => `CCQ-${datePart()}-${randomCode(4)}`;

module.exports = { enquiryReference, quoteNumber };
