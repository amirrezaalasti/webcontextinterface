/**
 * Canonical benchmark configuration: models, inference settings, and exact prompts.
 * Imported by eval harnesses and exported to demo/public/eval-config.json.
 */

import { SCORED_FINAL_ACTION_SUFFIX } from './flow-sanitize';

export const EVAL_PROVIDER = {
  name: 'OpenRouter',
  chatCompletionsUrl: 'https://openrouter.ai/api/v1/chat/completions',
  httpReferer: 'https://github.com/wci-framework',
  xTitle: 'WCI Benchmark Eval',
} as const;

export interface EvalModelConfig {
  id: string;
  name: string;
  model: string;
  inputPricePer1M?: number;
}

/** Published multi-step runs (demo leaderboard). */
export const EVAL_MODELS: EvalModelConfig[] = [
  { id: 'gpt5Nano', name: 'GPT-5 Nano', model: 'openai/gpt-5.4-nano', inputPricePer1M: 0.05 },
  { id: 'gpt5', name: 'GPT-5', model: 'openai/gpt-5.4', inputPricePer1M: 1.25 },
  { id: 'gemini35Flash', name: 'Gemini 3.5 Flash', model: 'google/gemini-3.5-flash', inputPricePer1M: 0.2 },
  { id: 'qwen25_7b', name: 'Qwen 2.5 7B', model: 'qwen/qwen-2.5-7b-instruct', inputPricePer1M: 0.04 },
  { id: 'llama31_8b', name: 'Llama 3.1 8B', model: 'meta-llama/llama-3.1-8b-instruct', inputPricePer1M: 0.03 },
  { id: 'gptoss20B', name: 'GPT-OSS 20B', model: 'openai/gpt-oss-20b', inputPricePer1M: 0.04 },
];

export const EVAL_INFERENCE = {
  /** eval:benchmark — single-shot element grounding */
  singleShot: {
    temperature: 0,
    maxTokens: 1000,
    reasoning: { effort: 'low' as const },
    defaultQueryOptions: { temperature: 0, maxTokens: 1000 },
  },
  /** eval:multistep — published leaderboard */
  multistep: {
    temperature: 0,
    maxTokens: 800,
    reasoning: { effort: 'low' as const },
    minCoverageDefault: 0.6,
    passRule: 'unified' as const,
    rateLimitPauseMs: 250,
    defaultQueryOptions: { temperature: 0, maxTokens: 800 },
  },
} as const;

export const EVAL_CONTEXT_LIMITS = {
  singleShot: {
    rawHtmlMaxChars: 28_000,
    domOutlineMaxLines: 100,
    interactiveCandidatesMax: 60,
  },
  multistep: {
    rawHtmlMaxChars: 12_000,
    domOutlineMaxLines: 55,
    interactiveCandidatesMax: 40,
    wciPipeBudgetCharsGrounding: 2400,
    wciPipeBudgetCharsFull: 3200,
    prerequisitesMax: 3,
  },
} as const;

/** Exact system prompts for single-shot eval:benchmark (evals/lib/contexts.ts). */
export const EVAL_SINGLE_SHOT_SYSTEM_PROMPTS = {
  'raw-html':
    'You are a web automation agent. Reply with ONE line only: a valid CSS selector for the element that achieves the goal. No markdown, no quotes, no explanation.',
  'dom-outline':
    'You are a web agent using a DOM outline. Output ONLY one CSS selector for the element that best achieves the goal. No explanation.',
  'interactive-candidates':
    'You are a Mind2Web-style agent. Candidates omit #ids on purpose. Use button text, classes, and data-* context to disambiguate. ' +
    'Output ONLY the candidate index number (e.g. 12) OR a CSS selector for the best match. No explanation.',
  'wci-full':
    'You are a WCI agent on the full distilled graph (landmarks, forms, actions). ' +
    'Apply every constraint in the GOAL. Prefer node ids that have an "action" field (click/select/fill) over landmarks or displays. ' +
    'Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.',
  'wci-grounding':
    'You are a WCI grounding agent. The JSON lists only actionable nodes (click/select/fill), with state and scope_context (e.g. stops, price). ' +
    'Apply every constraint in the GOAL. Pick the single node id that completes the goal given current state. ' +
    'Do not invent ids. Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.',
} as const;

/** WCI full/grounding JSON hints embedded in user context (not model system role). */
export const EVAL_WCI_VIEW_HINTS = {
  full: 'Full WCI graph (landmarks, displays, forms, actions). Reply with one node "id". Prefer actionable nodes (with "action") over landmarks when they complete the goal.',
  grounding:
    'Actionable nodes only (no landmarks). Use scope_context and state to satisfy every part of the goal.',
} as const;

/** Exact multistep system prompts (evals/lib/multistep-prompt.ts). */
export const EVAL_MULTISTEP_SYSTEM_PROMPTS = {
  wci:
    'WCI agent. WCI_NODES v2: N[]=pipe rows id|a|d|p|x|s|r (omit empty). a: c=click f=fill s=select S=submit. s: k:v (!=disabled). x=competitor trap — never final_action. p=1 is high salience but may include traps; use desc+goal. final_action=exact row id that completes the goal. Never CSS.',
  baselineSuffix:
    ' Plan briefly. final_action is the single scored control that completes the goal (not a follow-up confirm/checkout step).',
} as const;

export const EVAL_MULTISTEP_USER_FORMAT = {
  replyJson:
    'Reply JSON only: {"actions":[{"type":"observe|reason|act|verify","step":"brief","target":"..."}],"final_action":"<hint>"}',
  finalActionHints: {
    wci: 'WCI node id from nodes[]',
    'interactive-candidates': 'index or CSS selector',
    default: 'CSS selector',
  },
  scoredFinalActionRule: SCORED_FINAL_ACTION_SUFFIX,
  userBlockPrefixes: {
    goal: 'GOAL:',
    flow: 'FLOW:',
    prereq: 'PREREQ:',
    rule: 'RULE:',
    wciNodes: 'WCI_NODES:',
    domOutline: 'DOM_OUTLINE:',
    candidates: 'CANDIDATES:',
    html: 'HTML:',
  },
} as const;

export const EVAL_METHODOLOGY = {
  publishedHarness: 'multistep',
  scenarioCount: 50,
  approaches: ['raw-html', 'dom-outline', 'interactive-candidates', 'wci-full', 'wci-grounding'] as const,
  taskSource: 'meta.tasks.multiStep (primary task only)',
  singleShotHarness: 'eval:benchmark (not on public demo leaderboard)',
} as const;

/** Full export payload for docs and demo/public/eval-config.json */
export function buildEvalConfigReport() {
  return {
    generatedAt: new Date().toISOString(),
    source: 'evals/lib/eval-config.ts',
    methodology: EVAL_METHODOLOGY,
    provider: EVAL_PROVIDER,
    inference: EVAL_INFERENCE,
    contextLimits: EVAL_CONTEXT_LIMITS,
    models: EVAL_MODELS.map((m) => ({
      id: m.id,
      displayName: m.name,
      openRouterModel: m.model,
      inputPricePer1M: m.inputPricePer1M,
    })),
    prompts: {
      singleShot: {
        description: 'One system + one user message per call (eval:benchmark).',
        systemByApproach: EVAL_SINGLE_SHOT_SYSTEM_PROMPTS,
        wciViewHintsInUserContext: EVAL_WCI_VIEW_HINTS,
        userTemplates: {
          'raw-html': 'GOAL: {goal}\\n\\nHTML:\\n{rawHtml}',
          'dom-outline': 'GOAL: {goal}\\n\\nDOM OUTLINE (interactive nodes marked):\\n{outline}',
          'interactive-candidates':
            'GOAL: {goal}\\n\\nINTERACTIVE CANDIDATES (numbered [0..n], no element ids — use data-* context and labels):\\n{list}',
          'wci-full': 'GOAL: {goal}\\n\\nWCI FULL VIEW (all annotated nodes — reply with one "id"):\\n{json}',
          'wci-grounding':
            'GOAL: {goal}\\n\\nWCI GROUNDING VIEW (actionable nodes only — reply with one "id"):\\n{json}',
        },
      },
      multistep: {
        description:
          'Published leaderboard (eval:multistep). System prompt is WCI-specific or baseline single-shot + suffix. User block is compact (goal, flow, rules, context).',
        systemByApproach: {
          'wci-full': EVAL_MULTISTEP_SYSTEM_PROMPTS.wci,
          'wci-grounding': EVAL_MULTISTEP_SYSTEM_PROMPTS.wci,
          'raw-html':
            EVAL_SINGLE_SHOT_SYSTEM_PROMPTS['raw-html'] + EVAL_MULTISTEP_SYSTEM_PROMPTS.baselineSuffix,
          'dom-outline':
            EVAL_SINGLE_SHOT_SYSTEM_PROMPTS['dom-outline'] + EVAL_MULTISTEP_SYSTEM_PROMPTS.baselineSuffix,
          'interactive-candidates':
            EVAL_SINGLE_SHOT_SYSTEM_PROMPTS['interactive-candidates'] +
            EVAL_MULTISTEP_SYSTEM_PROMPTS.baselineSuffix,
        },
        userBlockFormat: EVAL_MULTISTEP_USER_FORMAT,
        flowSanitization:
          'wciFlow/standardFlow step text sanitized (no ground-truth ids/selectors); completion criteria filtered in multistep-prompt.ts',
      },
    },
  };
}
