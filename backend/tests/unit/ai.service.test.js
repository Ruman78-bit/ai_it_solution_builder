const { analyzeRequirements, signAnalysis, verifyAnalysis } = require('../../src/services/ai');
const { sanitizeAnalysis, hasForbiddenClaim } = require('../../src/services/ai/analysisSchema');
const { requirementInput, enquiryInput, goodAiOutput } = require('../fixtures');

const settings = { provider: 'fake', apiKey: 'k', model: 'm', timeoutMs: 1000, maxOutputTokens: 500 };
const fakeProvider = (impl) => ({ name: 'fake', generate: jest.fn(impl) });

describe('AI service fallback behaviour', () => {
  test('uses basic analysis when no provider is configured', async () => {
    const { analysis, fallbackReason } = await analyzeRequirements(requirementInput(), {
      settings: { ...settings, provider: 'none' },
    });
    expect(fallbackReason).toBe('not_configured');
    expect(analysis.source).toBe('basic');
    expect(analysis.relevantServiceCategories).toEqual(expect.arrayContaining(['networking', 'cybersecurity']));
    expect(analysis.projectSummary).toMatch(/basic keyword-based summary/);
  });

  test('uses basic analysis when the API key is missing', async () => {
    const { analysis, fallbackReason } = await analyzeRequirements(requirementInput(), {
      settings: { ...settings, provider: 'openai', apiKey: '' },
    });
    expect(fallbackReason).toBe('missing_api_key');
    expect(analysis.source).toBe('basic');
  });

  test('falls back when the provider throws', async () => {
    const provider = fakeProvider(async () => {
      throw new Error('500 from provider');
    });
    const { analysis, fallbackReason } = await analyzeRequirements(requirementInput(), { settings, provider });
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(fallbackReason).toBe('provider_error');
    expect(analysis.source).toBe('basic');
  });

  test('falls back on timeout', async () => {
    const provider = fakeProvider(async () => {
      const e = new Error('timed out');
      e.name = 'TimeoutError';
      throw e;
    });
    const { fallbackReason } = await analyzeRequirements(requirementInput(), { settings, provider });
    expect(fallbackReason).toBe('timeout');
  });

  test('falls back when the provider returns output that fails validation', async () => {
    const provider = fakeProvider(async () => ({ output: { nonsense: true }, model: 'm' }));
    const { analysis, fallbackReason } = await analyzeRequirements(requirementInput(), { settings, provider });
    expect(fallbackReason).toBe('provider_error');
    expect(analysis.source).toBe('basic');
  });

  test('returns validated AI output when the provider succeeds', async () => {
    const provider = fakeProvider(async () => ({ output: goodAiOutput(), model: 'fake-model-1' }));
    const { analysis, fallbackReason } = await analyzeRequirements(requirementInput(), { settings, provider });
    expect(fallbackReason).toBeNull();
    expect(analysis).toMatchObject({ source: 'ai', provider: 'fake', model: 'fake-model-1' });
    expect(analysis.suggestedComponents).toHaveLength(2);
  });

  test('never sends customer name, company, email or phone to the provider', async () => {
    const provider = fakeProvider(async () => ({ output: goodAiOutput(), model: 'm' }));
    const input = enquiryInput();
    input.requirements += ' Call me on +91 99887 76655 or mail ops@school.example.';
    await analyzeRequirements(input, { settings, provider });

    const { system, user } = provider.generate.mock.calls[0][0];
    const sent = `${system}\n${user}`;
    expect(sent).not.toContain(input.name);
    expect(sent).not.toContain(input.company);
    expect(sent).not.toContain(input.email);
    expect(sent).not.toContain('99887 76655');
    expect(sent).not.toContain('ops@school.example');
    expect(sent).toContain('[email removed]');
  });
});

describe('AI output sanitisation', () => {
  test('removes prices, stock claims, warranties and delivery promises', () => {
    const raw = goodAiOutput();
    raw.projectSummary = 'The school needs Wi-Fi. This will cost about ₹4,50,000. Delivery within 3 days is guaranteed.';
    raw.identifiedRequirements.push('Firewall is in stock and priced at Rs. 80000');
    raw.suggestedComponents.push({ name: 'Firewall with 3-year warranty', category: 'cybersecurity', purpose: 'x' });
    raw.followUpQuestions.push('Budget of 5 lakh is enough');

    const out = sanitizeAnalysis(raw);
    expect(out.projectSummary).toBe('The school needs Wi-Fi.');
    expect(out.identifiedRequirements.join(' ')).not.toMatch(/stock|80000/);
    expect(out.suggestedComponents.map((c) => c.name)).not.toContain('Firewall with 3-year warranty');
    expect(out.followUpQuestions.join(' ')).not.toMatch(/lakh/);
  });

  test('drops categories that are not in the catalogue', () => {
    const raw = goodAiOutput();
    raw.relevantServiceCategories.push('blockchain-consulting');
    raw.suggestedComponents.push({ name: 'Mining rig', category: 'blockchain-consulting', purpose: '' });
    const out = sanitizeAnalysis(raw);
    expect(out.relevantServiceCategories).toEqual(['networking', 'cybersecurity']);
    expect(out.suggestedComponents.map((c) => c.name)).not.toContain('Mining rig');
  });

  test('caps list length at 8', () => {
    const raw = goodAiOutput();
    raw.followUpQuestions = Array.from({ length: 20 }, (_, i) => `Question ${i}?`);
    expect(sanitizeAnalysis(raw).followUpQuestions).toHaveLength(8);
  });

  test('hasForbiddenClaim does not flag ordinary text', () => {
    expect(hasForbiddenClaim('Wi-Fi for 400 students across 3 floors')).toBe(false);
    expect(hasForbiddenClaim('Costs Rs 5000')).toBe(true);
  });
});

describe('analysis token', () => {
  test('round-trips for the same input', async () => {
    const input = requirementInput();
    const { analysis } = await analyzeRequirements(input);
    const token = signAnalysis(analysis, input);
    expect(verifyAnalysis(token, input)).toEqual(analysis);
  });

  test('is rejected after the requirements are edited', async () => {
    const input = requirementInput();
    const { analysis } = await analyzeRequirements(input);
    const token = signAnalysis(analysis, input);
    expect(verifyAnalysis(token, { ...input, requirements: `${input.requirements} Also CCTV.` })).toBeNull();
  });

  test('is rejected when tampered with', async () => {
    const input = requirementInput();
    const { analysis } = await analyzeRequirements(input);
    const token = signAnalysis(analysis, input);
    const [h, p, s] = token.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.analysis.projectSummary = 'Price: Rs 1';
    const forged = [h, Buffer.from(JSON.stringify(payload)).toString('base64url'), s].join('.');
    expect(verifyAnalysis(forged, input)).toBeNull();
  });
});
