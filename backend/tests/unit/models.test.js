/** Schema-level validation (runs without a database connection). */
const mongoose = require('mongoose');
const Enquiry = require('../../src/models/Enquiry');
const Quotation = require('../../src/models/Quotation');
const Admin = require('../../src/models/Admin');
const { computeTotals } = require('../../src/services/quotation.service');
const { analyzeRequirements } = require('../../src/services/ai');
const { enquiryInput } = require('../fixtures');

const enquiryDoc = async () => {
  const b = enquiryInput();
  const { analysis } = await analyzeRequirements(b);
  return {
    reference: 'CC-20260101-ABCDE',
    customer: { name: b.name, company: b.company, email: b.email, phone: b.phone },
    industry: b.industry,
    employeeCount: b.employeeCount,
    services: b.services,
    requirements: b.requirements,
    budget: b.budget,
    location: b.location,
    aiStatus: 'unavailable',
    aiAnalysis: analysis,
  };
};

describe('Enquiry model', () => {
  test('accepts a complete enquiry with analysis and sets defaults', async () => {
    const e = new Enquiry(await enquiryDoc());
    await expect(e.validate()).resolves.toBeUndefined();
    expect(e.status).toBe('pending');
    expect(e.statusHistory).toHaveLength(1);
    expect(e.aiAnalysis.source).toBe('basic');
  });

  test('rejects unknown services, statuses and empty service list', async () => {
    const e = new Enquiry({ ...(await enquiryDoc()), services: ['made-up'], status: 'lost' });
    const err = await e.validate().catch((x) => x);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(Object.keys(err.errors)).toEqual(expect.arrayContaining(['services.0', 'status']));

    const empty = new Enquiry({ ...(await enquiryDoc()), services: [] });
    await expect(empty.validate()).rejects.toThrow(/Select at least one service/);
  });
});

describe('Quotation model', () => {
  const base = () => ({
    enquiry: new mongoose.Types.ObjectId(),
    quoteNumber: 'CCQ-20260101-TEST',
    createdBy: new mongoose.Types.ObjectId(),
    validUntil: new Date(Date.now() + 864e6),
    ...computeTotals([{ description: 'Firewall', quantity: 1, unitPrice: 50000, taxRate: 18 }]),
  });

  test('accepts computed totals', async () => {
    const q = new Quotation(base());
    await expect(q.validate()).resolves.toBeUndefined();
    expect(q.status).toBe('draft');
    expect(q.total).toBe(59000);
  });

  test('requires at least one line item', async () => {
    const q = new Quotation({ ...base(), items: [] });
    await expect(q.validate()).rejects.toThrow(/at least one line item/);
  });
});

describe('Admin model', () => {
  test('hashes and verifies passwords and hides the hash in JSON', async () => {
    const hash = await Admin.hashPassword('a-very-long-password');
    expect(hash).not.toContain('a-very-long-password');
    const a = new Admin({ name: 'A', email: 'A@Example.com ', passwordHash: hash });
    await expect(a.validate()).resolves.toBeUndefined();
    expect(a.email).toBe('a@example.com');
    expect(await a.verifyPassword('a-very-long-password')).toBe(true);
    expect(await a.verifyPassword('wrong')).toBe(false);
    expect(a.toJSON().passwordHash).toBeUndefined();
  });
});
