import type { BenchmarkScenario } from '../../demo/benchmark';
import {
  buildDomOutline,
  buildEvalContext,
  buildInteractiveCandidates,
  estimateTokens,
  isWciContextKind,
  type ContextKind,
  type EvalContext,
} from './contexts';
import { buildWciMultistepPayload } from './wci-eval-distill';

const SELECTOR_IN_TEXT =
  /(\[[\w-]+(?:="[^"]*")?\]|#[\w-]+|\.[\w.-]+(?:\s|$)|button[\w\[\]="':.\s-]+|final action uses ground-truth selector)/gi;

export type MultiStepTaskLike = {
  id: string;
  goal: string;
  prerequisites: string[];
  completionCriteria: string[];
  standardFlow: Array<{ type: string; step: string }>;
  wciFlow: Array<{ type: string; step: string }>;
};

/** Remove ground-truth selectors and WCI ids from flow step text shown to the model. */
export function sanitizeFlowStepForPrompt(step: string): string {
  return step
    .replace(SELECTOR_IN_TEXT, '[target]')
    .replace(/\bnode id\s+[a-z][a-z0-9_-]+/gi, 'node id [from graph]')
    .replace(/\b(?:click|select|invoke|execute):\s*[a-z][a-z0-9_-]+/gi, (m) => m.split(':')[0] + ': [target]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Completion criteria without answer leakage — scoring still uses ground truth separately. */
export function filterCompletionCriteria(criteria: string[], approach: ContextKind): string[] {
  const out: string[] = [];
  for (const line of criteria) {
    const lower = line.toLowerCase();
    if (isWciContextKind(approach)) {
      if (lower.includes('ground-truth selector')) continue;
      if (lower.includes('primary wci action id')) {
        out.push('Pick final_action: one nodes[].id that completes the goal (not a decoy)');
        continue;
      }
      if (lower.includes('no decoy')) {
        out.push('Do not use decoy ids (priority 5 / decoy controls)');
        continue;
      }
      if (!lower.includes('selector') && !lower.includes('#') && !lower.includes('[')) {
        out.push(line);
      }
      continue;
    }

    if (lower.includes('ground-truth selector')) continue;
    if (lower.includes('wci action id')) continue;
    if (lower.includes('no decoy')) {
      out.push('Avoid decoy controls listed on the page');
      continue;
    }
    if (!lower.includes('selector:') && !line.includes('#') && !line.includes('[data-')) {
      out.push(line);
    }
  }

  if (!out.length) {
    out.push(
      isWciContextKind(approach)
        ? 'Complete the task using a valid WCI node id from nodes[]'
        : 'Complete the task using the correct interactive element for the goal'
    );
  }
  return out;
}

function flowTypeSummary(flow: Array<{ type: string }>): string {
  const types: string[] = [];
  for (const f of flow) {
    const t = f.type.toLowerCase();
    if (!types.includes(t)) types.push(t);
  }
  return types.join(' → ');
}

function multistepContextBody(
  scenario: BenchmarkScenario,
  task: MultiStepTaskLike,
  approach: ContextKind
): string {
  if (isWciContextKind(approach)) {
    const view = approach === 'wci-full' ? 'full' : 'grounding';
    const json = buildWciMultistepPayload(scenario.annotatedHtml, scenario.id, view, {
      goal: task.goal,
      prerequisites: task.prerequisites,
      wciFlow: task.wciFlow,
    });
    return `WCI_NODES:\n${json}`;
  }
  if (approach === 'dom-outline') {
    return `DOM_OUTLINE:\n${buildDomOutline(scenario.rawHtml, 55)}`;
  }
  if (approach === 'interactive-candidates') {
    return `CANDIDATES:\n${buildInteractiveCandidates(scenario.rawHtml, 40)}`;
  }
  const maxRaw = 12_000;
  const truncated =
    scenario.rawHtml.length > maxRaw
      ? scenario.rawHtml.slice(0, maxRaw) + '\n<!-- TRUNCATED -->'
      : scenario.rawHtml;
  return `HTML:\n${truncated}`;
}

/**
 * Compact multistep prompt — much smaller than single-shot context + duplicated task block.
 */
export function buildMultistepEvalContext(
  scenario: BenchmarkScenario,
  task: MultiStepTaskLike,
  approach: ContextKind
): EvalContext {
  const flow = isWciContextKind(approach) ? task.wciFlow : task.standardFlow;
  const criteria = filterCompletionCriteria(task.completionCriteria, approach);
  const finalHint = isWciContextKind(approach)
    ? 'WCI node id from nodes[]'
    : approach === 'interactive-candidates'
      ? 'index or CSS selector'
      : 'CSS selector';

  const payload = [
    `GOAL: ${task.goal}`,
    `FLOW: ${flowTypeSummary(flow)}`,
    ...task.prerequisites.slice(0, 3).map((p) => `PREREQ: ${p}`),
    ...criteria.map((c) => `RULE: ${c}`),
    multistepContextBody(scenario, task, approach),
    `Reply JSON only: {"actions":[{"type":"observe|reason|act|verify","step":"brief","target":"..."}],"final_action":"<${finalHint}>"}`,
  ].join('\n');

  const singleShot = buildEvalContext(scenario, approach);

  return {
    kind: isWciContextKind(approach) ? approach : singleShot.kind,
    content: payload,
    tokenEstimate: estimateTokens(payload),
    systemPrompt: isWciContextKind(approach)
      ? 'WCI agent. WCI_NODES v2: N[]=pipe rows id|a|d|p|s|r (omit empty). a: c=click f=fill s=select S=submit. s: k:v (!=disabled). r: L/D=landmark/display. final_action=row id, p=1 primary. Never CSS.'
      : singleShot.systemPrompt +
        ' Plan briefly, then set final_action to the one element that completes the task.',
    userPromptPrefix: '',
  };
}
