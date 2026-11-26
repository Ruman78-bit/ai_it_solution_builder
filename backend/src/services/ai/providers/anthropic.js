/**
 * Anthropic Messages API provider. Structured output is obtained by forcing a
 * single tool call whose input_schema is our analysis JSON schema.
 */
const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-haiku-5-5';

async function generate({ system, user, jsonSchema, settings }) {
  const baseUrl = (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = settings.model || DEFAULT_MODEL;

  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(settings.timeoutMs),
    body: JSON.stringify({
      model,
      max_tokens: settings.maxOutputTokens,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [
        {
          name: 'submit_analysis',
          description: 'Submit the structured requirement analysis.',
          input_schema: jsonSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    }),
  });

  if (!res.ok) throw new Error(`Anthropic request failed with status ${res.status}`);

  const data = await res.json();
  const block = Array.isArray(data.content) && data.content.find((b) => b.type === 'tool_use');
  if (!block || !block.input) throw new Error('Anthropic returned no structured output');
  return { output: block.input, model: data.model || model };
}

module.exports = { name: 'anthropic', generate };
