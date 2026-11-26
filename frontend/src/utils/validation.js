/**
 * Client-side checks that mirror the API rules, so most mistakes are caught
 * before a request is sent. The API validates again and its field errors are
 * shown in the same places.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;

const len = (v) => (v || '').trim().length;

export function validateContact(v) {
  const e = {};
  if (len(v.name) < 2) e.name = 'Enter your full name';
  else if (len(v.name) > 100) e.name = 'Name must be at most 100 characters';
  if (len(v.company) < 2) e.company = 'Enter your company or organisation name';
  if (!EMAIL_RE.test((v.email || '').trim())) e.email = 'Enter a valid email address, like name@company.com';
  if (!PHONE_RE.test((v.phone || '').trim()) || (v.phone || '').replace(/\D/g, '').length < 7) {
    e.phone = 'Enter a valid phone number, like +91 98765 43210';
  }
  return e;
}

export function validateRequirements(v) {
  const e = {};
  if (!v.industry) e.industry = 'Select your industry';
  if (!v.employeeCount) e.employeeCount = 'Select the number of employees';
  if (!v.services?.length) e.services = 'Select at least one service';
  if (len(v.requirements) < 30) e.requirements = `Describe your requirements in at least 30 characters (${len(v.requirements)} so far)`;
  else if (len(v.requirements) > 5000) e.requirements = 'Requirements must be at most 5,000 characters';
  if (!v.budget) e.budget = 'Select an approximate budget';
  if (len(v.location) < 2) e.location = 'Enter the city where the work is needed';
  if (len(v.notes) > 2000) e.notes = 'Notes must be at most 2,000 characters';
  return e;
}
