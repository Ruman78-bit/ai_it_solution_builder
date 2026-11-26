/**
 * Deterministic fallback used when no AI provider is configured or the provider
 * fails. It never calls the network. Output has the same shape as AI output and
 * is labelled source: 'basic' so customers and admins know it is a simple
 * keyword-based summary, not an AI recommendation.
 */
const { catalogue, categoryById } = require('../../config/catalogue');
const { redactContactDetails } = require('../../utils/sanitize');

const KEYWORDS = {
  'hardware-laptops': ['laptop', 'desktop', 'computer', 'workstation', 'pc', 'monitor', 'printer', 'peripheral', 'device'],
  'servers-storage': ['server', 'storage', 'nas', 'san', 'backup', 'data centre', 'data center', 'rack', 'ups'],
  networking: ['network', 'wifi', 'wi-fi', 'wireless', 'lan', 'wan', 'switch', 'router', 'cabling', 'internet', 'branch'],
  cybersecurity: ['security', 'firewall', 'antivirus', 'malware', 'ransomware', 'phishing', 'endpoint', 'vpn', 'compliance', 'breach'],
  'cloud-solutions': ['cloud', 'migration', 'microsoft 365', 'office 365', 'google workspace', 'aws', 'azure', 'saas', 'email'],
  'software-business-tech': ['software', 'licence', 'license', 'erp', 'crm', 'application', 'windows', 'office'],
  'it-support': ['support', 'maintenance', 'amc', 'helpdesk', 'help desk', 'install', 'setup', 'troubleshoot'],
};

const FOLLOW_UPS = {
  'hardware-laptops': 'How many devices do you need, and for what kind of work (office, design, engineering)?',
  'servers-storage': 'How much data do you store today, and how fast is it growing?',
  networking: 'How many sites, floors and concurrent users need to be connected?',
  cybersecurity: 'Do you have any compliance or audit requirements we should know about?',
  'cloud-solutions': 'Which cloud or email platforms, if any, are you using today?',
  'software-business-tech': 'Which software do you need licensed, and for how many users?',
  'it-support': 'Do you need on-site support, remote support, or both, and during which hours?',
};

const matchesAny = (text, words) => words.some((w) => new RegExp(`\\b${w.replace(/[-\s]/g, '[-\\s]?')}s?\\b`, 'i').test(text));

function analyze(input) {
  const text = `${input.requirements} ${input.notes || ''}`;

  const detected = Object.entries(KEYWORDS)
    .filter(([, words]) => matchesAny(text, words))
    .map(([id]) => id);
  const relevant = catalogue.map((c) => c.id).filter((id) => input.services.includes(id) || detected.includes(id));

  // Split on sentence-ending punctuation followed by whitespace (so "a@b.com" or "v2.0" stay intact),
  // and drop sentences that were only contact details.
  const sentences = redactContactDetails(input.requirements)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && !/\[(email|phone) removed\]/.test(s))
    .slice(0, 6);

  const suggestedComponents = relevant.slice(0, 4).flatMap((id) =>
    categoryById[id].examples.slice(0, 2).map((example) => ({
      name: example,
      category: id,
      purpose: `Often part of ${categoryById[id].name.toLowerCase()} solutions. Our team will confirm whether it fits your needs.`,
    }))
  ).slice(0, 8);

  const missing = [];
  if (!/\d/.test(text)) missing.push('Quantities such as number of users, devices or sites.');
  if (!/(week|month|urgent|asap|deadline|timeline|by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(text)) {
    missing.push('Your preferred timeline for the project.');
  }
  if (!/(existing|current|currently|today|already|old|legacy|replace|upgrade)/i.test(text)) {
    missing.push('Details of your existing IT setup, if any.');
  }

  const names = relevant.map((id) => categoryById[id].name);
  const projectSummary =
    `An organisation in the ${input.industry} sector with ${input.employeeCount} employees in ${input.location} ` +
    `is looking for help with ${names.length ? names.join(', ') : 'IT services'}. ` +
    'This is a basic keyword-based summary; our team will review your full description.';

  return {
    projectSummary,
    identifiedRequirements: sentences,
    relevantServiceCategories: relevant,
    suggestedComponents,
    missingInformation: missing,
    followUpQuestions: relevant.map((id) => FOLLOW_UPS[id]).filter(Boolean).slice(0, 6),
  };
}

module.exports = { analyze };
