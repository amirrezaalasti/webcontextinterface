/**
 * Minimal OpenRouter chat for scenario enrichment scripts.
 */

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, '') ?? 'https://openrouter.ai/api/v1';

export const DEFAULT_ENRICH_MODEL =
  process.env.SCENARIO_ENRICH_MODEL ?? 'openai/gpt-5.4-mini';

export async function chatCompletion(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required. Add it to .env or export it.');
  }

  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/amirrezaalasti/webcontextinterface',
      'X-Title': 'WCI scenario enrich',
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_ENRICH_MODEL,
      messages,
      temperature: options.temperature ?? 0.35,
      max_tokens: options.maxTokens ?? 16_000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Empty model response');
  }

  return {
    content: content.trim(),
    usage: data.usage,
    model: data.model ?? options.model,
  };
}
