/**
 * Route tests that don't touch the database: catalogue, analysis, validation and
 * auth guards. These run anywhere, with no MongoDB.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { requirementInput } = require('../fixtures');

const app = createApp();

describe('public routes', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  test('GET /api/catalogue returns categories, options and AI status', async () => {
    const res = await request(app).get('/api/catalogue');
    expect(res.status).toBe(200);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    expect(res.body.data.categories.every((c) => c.verified === false)).toBe(true);
    expect(res.body.data.options.industries).toContain('Education');
    expect(res.body.data.ai.enabled).toBe(false);
  });

  test('POST /api/enquiries/analyze returns an analysis and a token even without AI', async () => {
    const res = await request(app).post('/api/enquiries/analyze').send(requirementInput());
    expect(res.status).toBe(200);
    expect(res.body.data.analysis.source).toBe('basic');
    expect(res.body.data.fallback).toBe(true);
    expect(typeof res.body.data.analysisToken).toBe('string');
  });

  test('POST /api/enquiries/analyze validates input with field-level errors', async () => {
    const res = await request(app).post('/api/enquiries/analyze').send({ services: [], requirements: 'too short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['industry', 'services', 'requirements', 'budget', 'location']));
  });

  test('POST /api/enquiries rejects operator injection and bad email', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({ ...requirementInput(), name: { $gt: '' }, company: 'X Co', email: 'not-an-email', phone: '123' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'phone']));
  });

  test('malformed JSON gives a 400, not a 500', async () => {
    const res = await request(app).post('/api/enquiries/analyze').set('Content-Type', 'application/json').send('{"bad"');
    expect(res.status).toBe(400);
  });

  test('unknown API route gives JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('admin route protection', () => {
  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/admin/enquiries');
    expect(res.status).toBe(401);
  });

  test('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011', role: 'admin' }, 'wrong-secret');
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('rejects an expired token with a clear message', async () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011', role: 'admin', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/);
  });
});
