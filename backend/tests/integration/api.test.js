/**
 * End-to-end API tests against a real MongoDB: enquiry submission, admin auth,
 * enquiry management, and the full quotation workflow (save -> approve -> PDF -> send).
 */
const request = require('supertest');
const { createApp } = require('../../src/app');
const Admin = require('../../src/models/Admin');
const Enquiry = require('../../src/models/Enquiry');
const Quotation = require('../../src/models/Quotation');
const emailService = require('../../src/services/email.service');
const { setupDB, clearDB, teardownDB } = require('./db');
const { enquiryInput } = require('../fixtures');

const app = createApp();
const ADMIN = { email: 'admin@test.example', password: 'correct-horse-battery' };

beforeAll(setupDB);
afterAll(teardownDB);
beforeEach(async () => {
  await clearDB();
  emailService.setTransport({ sendMail: jest.fn().mockResolvedValue({ messageId: 'ok' }) });
  await Admin.create({ name: 'Test Admin', email: ADMIN.email, passwordHash: await Admin.hashPassword(ADMIN.password) });
});
afterEach(() => emailService.setTransport(null));

const login = async () => {
  const res = await request(app).post('/api/auth/login').send(ADMIN);
  return res.body.data.token;
};

const submitEnquiry = async (overrides = {}, withAnalysis = true) => {
  const body = { ...enquiryInput(), ...overrides };
  if (withAnalysis) {
    const a = await request(app).post('/api/enquiries/analyze').send(body);
    body.analysisToken = a.body.data.analysisToken;
  }
  return request(app).post('/api/enquiries').send(body);
};

const quoteBody = () => ({
  items: [
    { description: 'Managed Wi-Fi access point', quantity: 10, unit: 'Nos', unitPrice: 15000, taxRate: 18 },
    { description: 'Installation', quantity: 1, unitPrice: 20000, taxRate: 18 },
  ],
  validUntil: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10),
  terms: 'Standard terms',
  // Client-sent totals must be ignored:
  total: 1,
});

describe('customer enquiry submission', () => {
  test('stores enquiry with analysis and returns a reference', async () => {
    const res = await submitEnquiry();
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^CC-\d{8}-[A-Z2-9]{5}$/);
    expect(res.body.data.analysisAttached).toBe(true);

    const saved = await Enquiry.findOne({ reference: res.body.data.reference }).lean();
    expect(saved.customer.email).toBe('priya@greenvalley.example');
    expect(saved.status).toBe('pending');
    expect(saved.aiStatus).toBe('unavailable'); // basic analysis because AI is not configured in tests
    expect(saved.aiAnalysis.source).toBe('basic');
  });

  test('can be submitted without any analysis', async () => {
    const res = await submitEnquiry({}, false);
    expect(res.status).toBe(201);
    const saved = await Enquiry.findOne({ reference: res.body.data.reference }).lean();
    expect(saved.aiStatus).toBe('not_requested');
    expect(saved.aiAnalysis).toBeUndefined();
  });

  test('discards a stale analysis if requirements changed after analysing', async () => {
    const body = enquiryInput();
    const a = await request(app).post('/api/enquiries/analyze').send(body);
    const res = await request(app)
      .post('/api/enquiries')
      .send({ ...body, requirements: `${body.requirements} Also CCTV for the car park.`, analysisToken: a.body.data.analysisToken });
    expect(res.status).toBe(201);
    expect(res.body.data.analysisAttached).toBe(false);
  });
});

describe('admin authentication', () => {
  test('logs in with correct credentials and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.admin.passwordHash).toBeUndefined();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.admin.email).toBe(ADMIN.email);
  });

  test('rejects a wrong password and an unknown email with the same message', async () => {
    const a = await request(app).post('/api/auth/login').send({ ...ADMIN, password: 'wrong-password-123' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@test.example', password: 'whatever-123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  test('token stops working once the admin is deleted', async () => {
    const token = await login();
    await Admin.deleteMany({});
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('admin enquiry management', () => {
  test('stats, search, filter and pagination', async () => {
    await submitEnquiry();
    await submitEnquiry({ company: 'Lakeside Clinic', name: 'Arjun Rao', email: 'arjun@lakeside.example', industry: 'Healthcare' });
    const token = await login();
    const auth = { Authorization: `Bearer ${token}` };

    const stats = await request(app).get('/api/admin/stats').set(auth);
    expect(stats.body.data).toMatchObject({ total: 2, pending: 2 });
    expect(stats.body.data.recent).toHaveLength(2);

    const search = await request(app).get('/api/admin/enquiries').query({ search: 'lakeside' }).set(auth);
    expect(search.body.data.items).toHaveLength(1);
    expect(search.body.data.items[0].customer.company).toBe('Lakeside Clinic');

    const regexInjection = await request(app).get('/api/admin/enquiries').query({ search: '.*' }).set(auth);
    expect(regexInjection.body.data.items).toHaveLength(0);

    const filtered = await request(app).get('/api/admin/enquiries').query({ status: 'accepted' }).set(auth);
    expect(filtered.body.data.items).toHaveLength(0);

    const paged = await request(app).get('/api/admin/enquiries').query({ limit: 1, page: 2 }).set(auth);
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.data.pagination).toMatchObject({ total: 2, pages: 2 });

    const bad = await request(app).get('/api/admin/enquiries').query({ status: 'nonsense' }).set(auth);
    expect(bad.status).toBe(400);
  });

  test('detail view and status update with history', async () => {
    const sub = await submitEnquiry();
    const enquiry = await Enquiry.findOne({ reference: sub.body.data.reference });
    const token = await login();
    const auth = { Authorization: `Bearer ${token}` };

    const detail = await request(app).get(`/api/admin/enquiries/${enquiry._id}`).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.enquiry.aiAnalysis).toBeDefined();
    expect(detail.body.data.quotation).toBeNull();

    const upd = await request(app)
      .patch(`/api/admin/enquiries/${enquiry._id}/status`)
      .set(auth)
      .send({ status: 'under_review', note: 'Called customer' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.statusHistory.at(-1)).toMatchObject({ status: 'under_review', note: 'Called customer' });

    // "Sent" can only be set by actually sending a quotation.
    const sent = await request(app).patch(`/api/admin/enquiries/${enquiry._id}/status`).set(auth).send({ status: 'sent' });
    expect(sent.status).toBe(400);

    const missing = await request(app).get('/api/admin/enquiries/507f1f77bcf86cd799439011').set(auth);
    expect(missing.status).toBe(404);
    const invalid = await request(app).get('/api/admin/enquiries/not-an-id').set(auth);
    expect(invalid.status).toBe(400);
  });
});

describe('quotation workflow', () => {
  let enquiry;
  let auth;

  beforeEach(async () => {
    const sub = await submitEnquiry();
    enquiry = await Enquiry.findOne({ reference: sub.body.data.reference });
    auth = { Authorization: `Bearer ${await login()}` };
  });

  test('save computes totals on the server and moves enquiry to Quotation Prepared', async () => {
    const res = await request(app).put(`/api/admin/enquiries/${enquiry._id}/quotation`).set(auth).send(quoteBody());
    expect(res.status).toBe(200);
    const q = res.body.data.quotation;
    expect(q).toMatchObject({ subtotal: 170000, taxTotal: 30600, total: 200600, status: 'draft' });
    expect(q.quoteNumber).toMatch(/^CCQ-/);
    expect(res.body.data.enquiryStatus).toBe('quotation_prepared');
  });

  test('validates line items', async () => {
    const res = await request(app)
      .put(`/api/admin/enquiries/${enquiry._id}/quotation`)
      .set(auth)
      .send({ ...quoteBody(), items: [{ description: 'X', quantity: 0, unitPrice: -5, taxRate: 150 }] });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['items.0.quantity', 'items.0.unitPrice', 'items.0.taxRate']));
  });

  test('cannot send before approval; approve, download PDF, then send', async () => {
    const base = `/api/admin/enquiries/${enquiry._id}/quotation`;
    await request(app).put(base).set(auth).send(quoteBody());

    const early = await request(app).post(`${base}/send`).set(auth);
    expect(early.status).toBe(400);

    const draftPdf = await request(app).get(`${base}/pdf`).set(auth).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(draftPdf.status).toBe(200);
    expect(draftPdf.headers['content-type']).toBe('application/pdf');
    expect(draftPdf.headers['content-disposition']).toMatch(/DRAFT\.pdf/);
    expect(draftPdf.body.subarray(0, 5).toString()).toBe('%PDF-');

    const approved = await request(app).post(`${base}/approve`).set(auth);
    expect(approved.status).toBe(200);
    expect(approved.body.data.quotation.status).toBe('approved');

    const sent = await request(app).post(`${base}/send`).set(auth);
    expect(sent.status).toBe(200);
    expect(sent.body.data.quotation.status).toBe('sent');
    expect(sent.body.data.enquiryStatus).toBe('sent');

    // Editing after sending returns it to draft for re-approval.
    const edited = await request(app).put(base).set(auth).send(quoteBody());
    expect(edited.body.data.quotation.status).toBe('draft');
    expect(edited.body.data.quotation.approvedBy).toBeUndefined();
  });

  test('email failure is reported (502) and recorded without marking the quotation sent', async () => {
    emailService.setTransport({ sendMail: jest.fn().mockRejectedValue(new Error('SMTP down')) });
    const base = `/api/admin/enquiries/${enquiry._id}/quotation`;
    await request(app).put(base).set(auth).send(quoteBody());
    await request(app).post(`${base}/approve`).set(auth);

    const res = await request(app).post(`${base}/send`).set(auth);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('EMAIL_FAILED');

    const q = await Quotation.findOne({ enquiry: enquiry._id }).lean();
    expect(q.status).toBe('approved');
    expect(q.lastEmail.success).toBe(false);
    const e = await Enquiry.findById(enquiry._id).lean();
    expect(e.status).toBe('quotation_prepared');
  });
});
