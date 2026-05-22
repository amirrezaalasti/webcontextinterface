import type { EvalContext } from './contexts';

/**
 * LLM configs for element-grounding evaluation via OpenRouter.
 * Same prompts for every model — not proprietary agent SDKs.
 */
export interface ModelConfig {
  id: string;
  name: string;
  model: string;
  inputPricePer1M?: number;
}

export const EVAL_MODELS: ModelConfig[] = [
  { id: 'gpt5Nano', name: 'GPT-5 Nano', model: 'openai/gpt-5-nano', inputPricePer1M: 0.05 },
  { id: 'gpt5Mini', name: 'GPT-5 Mini', model: 'openai/gpt-5-mini', inputPricePer1M: 0.25 },
  { id: 'gpt5', name: 'GPT-5', model: 'openai/gpt-5', inputPricePer1M: 1.25 },
  { id: 'gemini3Flash', name: 'Gemini 3 Flash', model: 'google/gemini-3-flash-preview', inputPricePer1M: 0.15 },
  { id: 'gemini35Flash', name: 'Gemini 3.5 Flash', model: 'google/gemini-3.5-flash', inputPricePer1M: 0.2 },
  { id: 'gemini2FlashLite', name: 'Gemini 2.0 Flash Lite', model: 'google/gemini-2.0-flash-lite-001', inputPricePer1M: 0.075 },
  { id: 'qwen35Flash', name: 'Qwen 3.5 Flash', model: 'qwen/qwen3.5-flash-02-23', inputPricePer1M: 0.065 },
  { id: 'qwen25_7b', name: 'Qwen 2.5 7B', model: 'qwen/qwen-2.5-7b-instruct', inputPricePer1M: 0.04 },
  { id: 'llama31_8b', name: 'Llama 3.1 8B', model: 'meta-llama/llama-3.1-8b-instruct', inputPricePer1M: 0.03 },
  { id: 'deepseekV3', name: 'DeepSeek V3', model: 'deepseek/deepseek-chat-v3-0324', inputPricePer1M: 0.25 },
];

export const EVAL_MODEL_BY_ID = Object.fromEntries(EVAL_MODELS.map((m) => [m.id, m])) as Record<
  string,
  ModelConfig
>;

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, '') ?? 'https://openrouter.ai/api/v1';

/** Default reasoning effort for all OpenRouter chat calls (GPT-5 requires reasoning). */
const DEFAULT_REASONING_EFFORT = 'low' as const;

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

  const maxTokens = options.maxTokens ?? 1000;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: ctx.systemPrompt },
      { role: 'user', content: ctx.content },
    ],
    temperature: options.temperature ?? 0,
    max_tokens: maxTokens,
    reasoning: { effort: DEFAULT_REASONING_EFFORT },
  };

  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://github.com/wci-framework',
      'X-Title': 'WCI Benchmark Eval',
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
