import { JSDOM } from 'jsdom';
import type { BenchmarkScenario } from '../../demo/benchmark';
import { applyEvalStatePatches } from './eval-snapshot';

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'path', 'line', 'circle', 'rect', 'polyline', 'polygon']);

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Compact DOM outline (Mind2Web / SeeAct-style structural context) */
export function buildDomOutline(html: string, maxLines = 80): string {
  const doc = new JSDOM(html).window.document;
  const root = doc.body ?? doc.documentElement;
  const lines: string[] = [];

  const walk = (el: Element, depth: number): void => {
    if (lines.length >= maxLines) return;
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;

    const id = el.getAttribute('id') ? `#${el.getAttribute('id')}` : '';
    const cls = (el.getAttribute('class') || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('');
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const interactive =
      ['a', 'button', 'input', 'select', 'textarea'].includes(tag) ||
      el.getAttribute('role') === 'button' ||
      el.hasAttribute('onclick');

    const marker = interactive ? ' [interactive]' : '';
    lines.push(`${'  '.repeat(depth)}<${tag}${id}${cls}>${text ? ` ${text}` : ''}${marker}`);

    for (const child of Array.from(el.children)) {
      if (lines.length >= maxLines) break;
      walk(child, depth + 1);
    }
  };

  walk(root, 0);
  if (lines.length >= maxLines) lines.push('  ... (truncated)');
  return lines.join('\n');
}

/** WCI annotated view (matches demo BenchmarkEngine.buildDistilledView) */
/** All data-wci-id node ids in annotated HTML */
export function listAnnotatedNodeIds(html: string): string[] {
  const doc = new JSDOM(html).window.document;
  const ids: string[] = [];
  doc.querySelectorAll('[data-wci-id]').forEach((el) => {
    const id = el.getAttribute('data-wci-id');
    if (id) ids.push(id);
  });
  return ids;
}

export interface WciDistillNode {
  id: string;
  role: string | null;
  desc: string | null;
  action?: string;
  required?: boolean;
  precondition?: string;
  options?: string[];
  scope?: string;
  state: Record<string, unknown>;
  scope_context?: Record<string, unknown>;
  priority: number;
}

function parseAnnotatedNodes(html: string): { pageTitle: string; nodes: WciDistillNode[] } {
  const doc = new JSDOM(html).window.document;
  const nodes: WciDistillNode[] = [];

  doc.querySelectorAll('[data-wci-id]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    let state: Record<string, unknown> = {};
    try {
      state = JSON.parse(htmlEl.getAttribute('data-wci-state') ?? '{}');
    } catch {
      /* ignore */
    }
    let options: string[] | undefined;
    try {
      const raw = htmlEl.getAttribute('data-wci-options');
      if (raw) options = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    const scope = htmlEl.getAttribute('data-wci-scope') ?? undefined;
    nodes.push({
      id: htmlEl.getAttribute('data-wci-id') ?? '',
      role: htmlEl.getAttribute('data-wci-role'),
      desc: htmlEl.getAttribute('data-wci-desc'),
      ...(htmlEl.getAttribute('data-wci-action')
        ? { action: htmlEl.getAttribute('data-wci-action')! }
        : {}),
      ...(htmlEl.getAttribute('data-wci-required') === 'true' ? { required: true } : {}),
      ...(htmlEl.getAttribute('data-wci-precondition')
        ? { precondition: htmlEl.getAttribute('data-wci-precondition')! }
        : {}),
      ...(options ? { options } : {}),
      ...(scope ? { scope } : {}),
      state,
      priority: parseInt(htmlEl.getAttribute('data-wci-priority') ?? '3', 10),
    });
  });

  return { pageTitle: doc.title || '(untitled)', nodes };
}

/** Merge parent landmark state (stops, flightId, etc.) into scoped child nodes. */
function mergeScopeContext(nodes: WciDistillNode[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    if (!node.scope) continue;
    const parent = byId.get(node.scope);
    if (!parent?.state || Object.keys(parent.state).length === 0) continue;
    node.scope_context = parent.state;
    if (node.action === 'click' && node.state.fare === 'economy') {
      node.state = {
        ...node.state,
        ...(parent.state.flightId !== undefined ? { flightId: parent.state.flightId } : {}),
        ...(parent.state.stops !== undefined ? { stops: parent.state.stops } : {}),
        ...(parent.state.airline !== undefined ? { airline: parent.state.airline } : {}),
      };
    }
  }
}

function isGroundingNode(node: WciDistillNode): boolean {
  if (!node.id || !node.action) return false;
  if (node.role === 'action') return true;
  if (node.role === 'form') return true;
  if (node.role === 'nav' && node.action === 'navigate') return true;
  return false;
}

function serializeWciView(
  pageTitle: string,
  nodes: WciDistillNode[],
  meta: { view: 'full' | 'grounding'; grounding_hint: string }
): string {
  return JSON.stringify(
    {
      wci_version: '1.0',
      page_title: pageTitle,
      view: meta.view,
      node_count: nodes.length,
      grounding_hint: meta.grounding_hint,
      nodes,
    },
    null,
    2
  );
}

/**
 * Full annotated graph — all roles, no eval snapshot patches.
 * Ablation: shows landmark/container confusion without production filtering.
 */
export function buildWciFullJson(html: string): string {
  const { pageTitle, nodes } = parseAnnotatedNodes(html);
  mergeScopeContext(nodes);
  nodes.sort((a, b) => a.priority - b.priority);
  return serializeWciView(pageTitle, nodes, {
    view: 'full',
    grounding_hint:
      'Full WCI graph (landmarks, displays, forms, actions). Reply with one node "id". Prefer actionable nodes (with "action") over landmarks when they complete the goal.',
  });
}

/** Full graph with eval patches (optional debug). */
export function buildAgentDomJson(html: string, scenarioId?: string): string {
  const { pageTitle, nodes } = parseAnnotatedNodes(html);
  if (scenarioId) applyEvalStatePatches(scenarioId, nodes);
  mergeScopeContext(nodes);
  nodes.sort((a, b) => a.priority - b.priority);
  return serializeWciView(pageTitle, nodes, {
    view: 'full',
    grounding_hint: 'Full WCI graph (patched eval state).',
  });
}

/**
 * Actionable-only view for element grounding — excludes landmarks/displays so
 * models cannot answer with container ids like quick-transfer.
 */
export function buildWciGroundingJson(html: string, scenarioId: string): string {
  const { pageTitle, nodes } = parseAnnotatedNodes(html);
  applyEvalStatePatches(scenarioId, nodes);
  mergeScopeContext(nodes);

  const actionable = nodes
    .filter(isGroundingNode)
    .filter((n) => n.state?.disabled !== true)
    .sort((a, b) => a.priority - b.priority);

  return serializeWciView(pageTitle, actionable, {
    view: 'grounding',
    grounding_hint:
      'Actionable nodes only (no landmarks). Use scope_context and state to satisfy every part of the goal.',
  });
}

export const WCI_CONTEXT_KINDS = ['wci-full', 'wci-grounding'] as const;
export type WciContextKind = (typeof WCI_CONTEXT_KINDS)[number];

export function isWciContextKind(kind: string): kind is WciContextKind | 'wci-distilled' {
  return kind === 'wci-full' || kind === 'wci-grounding' || kind === 'wci-distilled';
}

/** Numbered interactive candidate list (accessibility-style, no LLM) */
export function buildInteractiveCandidates(html: string, max = 40): string {
  const doc = new JSDOM(html).window.document;
  const candidates: string[] = [];
  const selector =
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [onclick]';

  doc.querySelectorAll(selector).forEach((el, index) => {
    if (candidates.length >= max) return;
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = (el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.');
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const name = el.getAttribute('name');
    const type = el.getAttribute('type');
    const href = el.getAttribute('href');
    const parts = [
      `[${index}] <${tag}${id}${cls ? '.' + cls : ''}>`,
      text && `"${text}"`,
      name && `name=${name}`,
      type && `type=${type}`,
      href && `href=${href.slice(0, 40)}`,
    ].filter(Boolean);
    candidates.push(parts.join(' '));
  });

  return candidates.join('\n');
}

export type ContextKind =
  | 'raw-html'
  | 'dom-outline'
  | 'interactive-candidates'
  | 'wci-full'
  | 'wci-grounding'
  /** @deprecated alias for wci-grounding */
  | 'wci-distilled';

export interface EvalContext {
  kind: ContextKind;
  content: string;
  tokenEstimate: number;
  systemPrompt: string;
  userPromptPrefix: string;
}

export function buildEvalContext(
  scenario: BenchmarkScenario,
  kind: ContextKind,
  options: { rawHtmlMaxChars?: number } = {}
): EvalContext {
  const maxRaw = options.rawHtmlMaxChars ?? 28_000;
  const goal = scenario.task.goal;

  switch (kind) {
    case 'raw-html': {
      const truncated =
        scenario.rawHtml.length > maxRaw
          ? scenario.rawHtml.slice(0, maxRaw) + '\n<!-- TRUNCATED -->'
          : scenario.rawHtml;
      const content = `GOAL: ${goal}\n\nHTML:\n${truncated}`;
      return {
        kind,
        content,
        tokenEstimate: estimateTokens(content),
        systemPrompt:
          'You are a web automation agent. Reply with ONE line only: a valid CSS selector for the element that achieves the goal. No markdown, no quotes, no explanation.',
        userPromptPrefix: '',
      };
    }
    case 'dom-outline': {
      const outline = buildDomOutline(scenario.rawHtml, 100);
      const content = `GOAL: ${goal}\n\nDOM OUTLINE (interactive nodes marked):\n${outline}`;
      return {
        kind,
        content,
        tokenEstimate: estimateTokens(content),
        systemPrompt:
          'You are a web agent using a DOM outline. Output ONLY one CSS selector for the element that best achieves the goal. No explanation.',
        userPromptPrefix: '',
      };
    }
    case 'interactive-candidates': {
      const list = buildInteractiveCandidates(scenario.rawHtml, 50);
      const content = `GOAL: ${goal}\n\nINTERACTIVE CANDIDATES:\n${list}`;
      return {
        kind,
        content,
        tokenEstimate: estimateTokens(content),
        systemPrompt:
          'You are a Mind2Web-style agent. Output ONLY the candidate index number (e.g. 12) OR a CSS selector for the best match. No explanation.',
        userPromptPrefix: '',
      };
    }
    case 'wci-full': {
      const json = buildWciFullJson(scenario.annotatedHtml);
      const content = `GOAL: ${goal}\n\nWCI FULL VIEW (all annotated nodes — reply with one "id"):\n${json}`;
      return {
        kind,
        content,
        tokenEstimate: estimateTokens(content),
        systemPrompt:
          'You are a WCI agent on the full distilled graph (landmarks, forms, actions). ' +
          'Apply every constraint in the GOAL. Prefer node ids that have an "action" field (click/select/fill) over landmarks or displays. ' +
          'Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.',
        userPromptPrefix: '',
      };
    }
    case 'wci-grounding':
    case 'wci-distilled': {
      const json = buildWciGroundingJson(scenario.annotatedHtml, scenario.id);
      const content = `GOAL: ${goal}\n\nWCI GROUNDING VIEW (actionable nodes only — reply with one "id"):\n${json}`;
      return {
        kind: kind === 'wci-distilled' ? 'wci-grounding' : kind,
        content,
        tokenEstimate: estimateTokens(content),
        systemPrompt:
          'You are a WCI grounding agent. The JSON lists only actionable nodes (click/select/fill), with state and scope_context (e.g. stops, price). ' +
          'Apply every constraint in the GOAL. Pick the single node id that completes the goal given current state. ' +
          'Do not invent ids. Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.',
        userPromptPrefix: '',
      };
    }
    default:
      throw new Error(`Unknown context kind: ${kind}`);
  }
}
