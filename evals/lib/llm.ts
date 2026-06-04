import type { EvalContext } from './contexts';
import { EVAL_INFERENCE, EVAL_MODELS, EVAL_PROVIDER } from './eval-config';

/**
 * LLM configs for element-grounding evaluation via OpenRouter.
 * Same prompts for every model — not proprietary agent SDKs.
 */
import type { EvalModelConfig } from './eval-config';

export type ModelConfig = EvalModelConfig;

export { EVAL_MODELS };

export const EVAL_MODEL_BY_ID = Object.fromEntries(EVAL_MODELS.map((m) => [m.id, m])) as Record<
  string,
  ModelConfig
>;

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, '') ?? EVAL_PROVIDER.chatCompletionsUrl.replace(/\/chat\/completions$/, '');

/** Extract assistant text from OpenRouter / OpenAI chat completion JSON */
export function extractAssistantText(data: {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning?: string | null;
    };
    finish_reason?: string | null;
  }>;
}): string {
  const choice = data.choices?.[0];
  const msg = choice?.message;
  const content = typeof msg?.content === 'string' ? msg.content.trim() : '';
  if (content) return content;

  const reasoning = typeof msg?.reasoning === 'string' ? msg.reasoning.trim() : '';
  if (reasoning) {
    const lines = reasoning.split('\n').map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] ?? '';
    if (last.length <= 120 && !last.includes(' ')) return last;
    return reasoning.slice(-200).trim();
  }

  return '';
}

export async function queryModel(
  model: string,
  ctx: EvalContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{
  raw: string;
  usageTokens: number;
  promptTokens: number;
  completionTokens: number;
  finishReason?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is required for LLM evaluation. Use --heuristic-only to skip API calls.'
    );
  }

  const maxTokens = options.maxTokens ?? EVAL_INFERENCE.singleShot.maxTokens;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: ctx.systemPrompt },
      { role: 'user', content: ctx.content },
    ],
    temperature: options.temperature ?? EVAL_INFERENCE.singleShot.temperature,
    max_tokens: maxTokens,
    reasoning: EVAL_INFERENCE.singleShot.reasoning,
  };

  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? EVAL_PROVIDER.httpReferer,
      'X-Title': EVAL_PROVIDER.xTitle,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null; reasoning?: string | null };
      finish_reason?: string | null;
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const raw = extractAssistantText(data);
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const usageTokens =
    data.usage?.total_tokens ??
    (promptTokens + completionTokens || Math.ceil((ctx.content.length + raw.length) / 4));

  return {
    raw,
    usageTokens,
    promptTokens,
    completionTokens,
    finishReason: data.choices?.[0]?.finish_reason ?? undefined,
  };
}
