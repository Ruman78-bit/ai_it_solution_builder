/**
 * OpenAI Chat Completions provider using Structured Outputs (json_schema, strict).
 * Works with any OpenAI-compatible endpoint via AI_BASE_URL.
 */
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

async function generate({ system, user, jsonSchema, settings }) {
  const baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = settings.model || DEFAULT_MODEL;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    signal: AbortSignal.timeout(settings.timeoutMs),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: settings.maxOutputTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'requirement_analysis', strict: true, schema: jsonSchema },
      },
    }),
  });

  if (!res.ok) {
    // Only the status goes into the error: provider bodies can echo the prompt.
    throw new Error(`OpenAI request failed with status ${res.status}`);
  }

  const data = await res.json();
  const message = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!message || message.refusal) throw new Error('OpenAI returned no usable content');
  return { output: JSON.parse(message.content), model: data.model || model };
}

module.exports = { name: 'openai', generate };
