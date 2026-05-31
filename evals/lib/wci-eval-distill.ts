/**
 * Minimal WCI encoding for multistep eval prompts.
 *
 * agent.md full surface is for Bridge/runtime. Eval v2 uses pipe rows:
 *   {"v":2,"g":"g","N":["export-btn|c|1","deals-table|2|top:Fox|D"]}
 * Order: id|a|d|p|s|r — empty segments omitted. System prompt documents abbreviations.
 */

import { applyEvalStatePatches } from './eval-snapshot';
import type { WciDistillNode } from './contexts';
import { parseAnnotatedNodesForEval } from './contexts';

export type MultistepTaskFocus = {
  goal: string;
  prerequisites?: string[];
  wciFlow?: Array<{ step: string; type: string }>;
};

/** Match agent.md desc cap; do not over-truncate task semantics. */
const DESC_MAX = 120;
/** Enough for several state keys on display/table nodes. */
const STATE_MAX_CHARS = 96;
/** Soft char budget for WCI JSON body (pipe rows); not a hard node count. */
const BUDGET_CHARS_GROUNDING = 2400;
const BUDGET_CHARS_FULL = 3200;

const STOP = new Set(
  'the a an and or to for on in at of with from by is are be this that your you'.split(' ')
);

const ACTION_SHORT: Record<string, string> = {
  click: 'c',
  fill: 'f',
  select: 's',
  check: 'k',
  submit: 'S',
  navigate: 'n',
  focus: 'F',
  clear: 'C',
  upload: 'u',
};

const ROLE_SHORT: Record<string, string> = {
  landmark: 'L',
  display: 'D',
  action: 'A',
  form: 'm',
  nav: 'v',
  status: 't',
};

const STATE_KEY_SHORT: Record<string, string> = {
  disabled: '!',
  selected: 'sel',
  value: 'v',
  album: 'alb',
  targetAlbumId: 'albId',
  highestOpenProbabilityDeal: 'top',
  topOpenProbabilityDeal: 'top',
  stagedFileCount: 'stg',
  uploadEnabled: 'up',
  series: 'ser',
  time: 'tm',
  app: 'app',
  requiresAlbum: 'reqAlb',
};

const STATE_HINT_KEYS = Object.keys(STATE_KEY_SHORT);

function focusTokens(focus: MultistepTaskFocus): Set<string> {
  const text = [
    focus.goal,
    ...(focus.prerequisites ?? []),
    ...(focus.wciFlow ?? []).map((s) => s.step),
  ]
    .join(' ')
    .toLowerCase();
  const out = new Set<string>();
  for (const m of text.match(/[a-z][a-z0-9_-]{2,}/g) ?? []) {
    if (!STOP.has(m)) out.add(m);
  }
  return out;
}

function flowNodeIds(focus: MultistepTaskFocus): Set<string> {
  const ids = new Set<string>();
  for (const step of focus.wciFlow ?? []) {
    for (const m of step.step.match(/\b[a-z][a-z0-9_-]{4,}\b/g) ?? []) {
      if (m.includes('-') || m.length >= 8) ids.add(m);
    }
  }
  return ids;
}

function isGroundingNode(node: WciDistillNode): boolean {
  if (!node.id || !node.action) return false;
  if (node.role === 'action' || node.role === 'form') return true;
  if (node.role === 'nav' && node.action === 'navigate') return true;
  return false;
}

function goalNeedsReadSurface(goal: string): boolean {
  return /\b(find|read|compare|table|probability|state|highest|filter|locate|scan|inspect)\b/i.test(
    goal
  );
}

function scoreNode(node: WciDistillNode, tokens: Set<string>, flowIds: Set<string>): number {
  let score = 0;
  if (node.priority === 1) score += 100;
  else if (node.priority === 2) score += 60;
  else if (node.priority === 3) score += 20;
  else if (node.priority >= 5) return -1000;

  const blob = `${node.id} ${node.desc ?? ''} ${node.action ?? ''}`.toLowerCase();
  for (const t of tokens) {
    if (blob.includes(t)) score += 12;
  }
  if (flowIds.has(node.id)) score += 80;
  if (node.state?.disabled === true) score -= 30;
  return score;
}

function compactStateString(
  state: Record<string, unknown>,
  tokens: Set<string>,
  role: string | null
): string | null {
  if (!state || !Object.keys(state).length) return null;

  const parts: string[] = [];
  if (state.disabled === true) parts.push('!');

  for (const key of STATE_HINT_KEYS) {
    if (key === 'disabled' || state[key] === undefined) continue;
    const keyMatch = [...tokens].some((t) => key.toLowerCase().includes(t));
    const valStr = String(state[key]).toLowerCase();
    const valMatch = [...tokens].some((t) => valStr.includes(t));
    if (!keyMatch && !valMatch && role !== 'display') continue;

    const sk = STATE_KEY_SHORT[key] ?? key;
    const v = state[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      parts.push(`${sk}:${v}`);
    } else if (v !== null && JSON.stringify(v).length <= 24) {
      parts.push(`${sk}=${JSON.stringify(v)}`);
    }
  }

  if (!parts.length && (role === 'display' || role === 'landmark')) {
    for (const key of STATE_HINT_KEYS) {
      if (state[key] === undefined) continue;
      parts.push(`${STATE_KEY_SHORT[key] ?? key}:${state[key]}`);
      if (parts.length >= 4) break;
    }
  }

  if (!parts.length) return null;
  const raw = parts.join(',');
  if (raw.length <= STATE_MAX_CHARS) return raw;
  return parts.slice(0, 4).join(',');
}

/** Keep full desc unless it is clearly duplicated scenario goal copy. */
function compactDesc(id: string, desc: string | null, tokens: Set<string>): string | null {
  const d = desc?.replace(/\s+/g, ' ').trim();
  if (!d) return null;
  if (d.length > 90) {
    const dLow = d.toLowerCase();
    let hits = 0;
    for (const t of tokens) {
      if (t.length > 4 && dLow.includes(t)) hits++;
    }
    const idWords = id.toLowerCase().split(/[-_]+/).filter((w) => w.length > 3);
    const idCovered = idWords.filter((w) => dLow.includes(w)).length;
    if (hits >= 6 && idCovered >= Math.min(2, idWords.length)) return null;
  }
  return d.length <= DESC_MAX ? d : d.slice(0, DESC_MAX);
}

function shortAction(action: string | undefined): string | null {
  if (!action) return null;
  return ACTION_SHORT[action] ?? action.slice(0, 1);
}

function shortRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLE_SHORT[role] ?? role.slice(0, 1);
}

/** id|a|d|p|s|r — omit empty segments after id. */
function toPipeRow(n: WciDistillNode, tokens: Set<string>, view: 'grounding' | 'full'): string {
  const parts: string[] = [n.id];
  const a = isGroundingNode(n) ? shortAction(n.action) : null;
  const d = compactDesc(n.id, n.desc, tokens);
  const p = n.priority <= 2 ? String(n.priority) : null;
  const s = compactStateString(n.state, tokens, n.role);
  const r = view === 'full' && !isGroundingNode(n) ? shortRole(n.role) : null;

  if (a) parts.push(a);
  if (d) parts.push(d);
  if (p) parts.push(p);
  if (s) parts.push(s);
  if (r) parts.push(r);
  return parts.join('|');
}

function estimateRowChars(n: WciDistillNode, tokens: Set<string>, view: 'grounding' | 'full'): number {
  return toPipeRow(n, tokens, view).length + 3;
}

function selectNodes(
  nodes: WciDistillNode[],
  view: 'grounding' | 'full',
  focus: MultistepTaskFocus
): WciDistillNode[] {
  const tokens = focusTokens(focus);
  const flowIds = flowNodeIds(focus);
  const budget = view === 'grounding' ? BUDGET_CHARS_GROUNDING : BUDGET_CHARS_FULL;
  const readSurface = goalNeedsReadSurface(focus.goal);

  let pool: WciDistillNode[];
  if (view === 'grounding') {
    pool = nodes
      .filter(isGroundingNode)
      .filter((n) => n.primary === true || n.state?.disabled !== true);
  } else {
    pool = nodes.filter((n) => {
      if (n.priority >= 5) return false;
      if (isGroundingNode(n) && n.state?.disabled !== true) return true;
      if (readSurface && (n.role === 'display' || n.role === 'landmark') && n.priority <= 3) {
        return true;
      }
      return false;
    });
  }

  const ranked = [...pool]
    .map((n) => ({ n, score: scoreNode(n, tokens, flowIds) }))
    .filter((x) => x.score > -500)
    .sort((a, b) => b.score - a.score || a.n.priority - b.n.priority);

  const chosen: WciDistillNode[] = [];
  const seen = new Set<string>();
  let used = 20;

  const tryAdd = (n: WciDistillNode, force = false): void => {
    if (seen.has(n.id)) return;
    const cost = estimateRowChars(n, tokens, view);
    if (!force && used + cost > budget) return;
    chosen.push(n);
    seen.add(n.id);
    used += cost;
  };

  // Always include priority 1–2 (and key read surfaces for wci-full).
  for (const { n } of ranked) {
    if (n.priority > 2) continue;
    if (!isGroundingNode(n) && view === 'grounding') continue;
    if (
      view === 'full' &&
      !isGroundingNode(n) &&
      !(readSurface && (n.role === 'display' || n.role === 'landmark'))
    ) {
      continue;
    }
    tryAdd(n, true);
  }

  // Fill budget with task-relevant optional nodes (skip low-scoring p3+ noise).
  for (const { n, score } of ranked) {
    if (n.priority > 2 && score < 36) continue;
    tryAdd(n, false);
  }

  return chosen;
}

/**
 * Task-focused v2 WCI payload (pipe rows, no repeated JSON keys per node).
 */
export function buildWciMultistepPayload(
  html: string,
  scenarioId: string,
  view: 'grounding' | 'full',
  focus: MultistepTaskFocus
): string {
  const { nodes } = parseAnnotatedNodesForEval(html, { skipHidden: true });
  applyEvalStatePatches(scenarioId, nodes);

  const tokens = focusTokens(focus);
  const selected = shuffleForPromptOrder(selectNodes(nodes, view, focus), scenarioId);
  const rows = selected.map((n) => toPipeRow(n, tokens, view));

  return JSON.stringify({ v: 2, g: view === 'grounding' ? 'g' : 'f', N: rows });
}

/** Stable per-scenario order so the ground-truth id is not always first among p=1 rows. */
function shuffleForPromptOrder(nodes: WciDistillNode[], scenarioId: string): WciDistillNode[] {
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  return [...nodes].sort(
    (a, b) =>
      hash(`${scenarioId}:${a.id}`) - hash(`${scenarioId}:${b.id}`) || a.id.localeCompare(b.id)
  );
}
