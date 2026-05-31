/**
 * Sanitize multi-step flow text before it reaches prompts or distill scoring.
 * Prevents ground-truth WCI ids / selectors from leaking via wciFlow metadata.
 */

const SELECTOR_IN_TEXT =
  /(\[[\w-]+(?:="[^"]*")?\]|#[\w-]+|\.[\w.-]+(?:\s|$)|button[\w\[\]="':.\s-]+|final action uses ground-truth selector)/gi;

/** Tokens that look like WCI node ids (hyphenated identifiers). */
const NODE_ID_LIKE = /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b/gi;

export function sanitizeFlowStepForPrompt(step: string): string {
  return step
    .replace(SELECTOR_IN_TEXT, '[target]')
    .replace(/\bnode id\s+[a-z][a-z0-9_-]+/gi, 'node id [from graph]')
    .replace(
      /\b(?:click|select|invoke|execute|fill):\s*[a-z][a-z0-9_-]+/gi,
      (m) => `${m.split(':')[0]}: [target]`
    )
    .replace(NODE_ID_LIKE, '[target]')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizeFlowSteps(
  flow: Array<{ step: string; type: string }> | undefined
): Array<{ step: string; type: string }> {
  return (flow ?? []).map((f) => ({
    type: f.type,
    step: sanitizeFlowStepForPrompt(f.step),
  }));
}

const STOP = new Set(
  'the a an and or to for on in at of with from by is are be this that your you target'.split(' ')
);

/** Goal/prereq/flow tokens for distill ranking — excludes id-like tokens. */
export function focusTokensFromText(parts: string[]): Set<string> {
  const text = parts.join(' ').toLowerCase();
  const out = new Set<string>();
  for (const m of text.match(/[a-z][a-z0-9]{2,}/g) ?? []) {
    if (STOP.has(m)) continue;
    if (m.includes('-') && m.length >= 8) continue;
    out.add(m);
  }
  return out;
}

/** Standard suffix so models know which control is scored. */
export const SCORED_FINAL_ACTION_SUFFIX =
  'Scored final_action: the one control that completes this goal (not a later confirmation, checkout, or competitor trap).';
