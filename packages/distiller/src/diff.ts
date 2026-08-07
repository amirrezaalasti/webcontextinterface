// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — incremental view diffing
//
// An agent loop re-distils after every action. Resending the whole view each
// turn costs tokens proportional to page size even when a single field changed;
// a diff costs tokens proportional to what actually moved.
// ─────────────────────────────────────────────────────────────────────────────

import type { WciNodeSpec, WciView } from '@webcontextinterface/spec';
import { estimateJsonTokens } from './tokens';

/** Field-level change on a node that exists in both views. */
export interface WciNodeDelta {
  id: string;
  /** Only the fields whose values differ, with their new values. */
  changed: Partial<WciNodeSpec>;
  /** Previous values for the same fields, for agent-visible before/after. */
  previous: Partial<WciNodeSpec>;
}

export interface WciViewDiff {
  wci_version: string;
  kind: 'diff';
  from: string;
  to: string;
  scope?: string;
  /** Nodes present in the new view but not the old one. */
  added: WciNodeSpec[];
  /** Ids present in the old view but not the new one. */
  removed: string[];
  /** Nodes present in both, with differing fields. */
  updated: WciNodeDelta[];
  /** True when nothing changed between the two views. */
  unchanged: boolean;
}

const COMPARED_FIELDS: readonly (keyof WciNodeSpec)[] = [
  'role', 'desc', 'action', 'state', 'precondition',
  'required', 'options', 'emits', 'scope', 'hidden', 'priority',
];

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function indexById(nodes: WciNodeSpec[]): Map<string, WciNodeSpec> {
  const map = new Map<string, WciNodeSpec>();
  for (const n of nodes) map.set(n.id, n);
  return map;
}

/**
 * Compute the change set between two distilled views.
 *
 * Node identity is `data-wci-id`, which the spec defines as stable across
 * sessions — that is exactly the property a diff needs.
 */
export function diffViews(previous: WciView, next: WciView): WciViewDiff {
  const prevNodes = indexById(previous.nodes);
  const nextNodes = indexById(next.nodes);

  const added: WciNodeSpec[] = [];
  const updated: WciNodeDelta[] = [];
  const removed: string[] = [];

  for (const [id, nextNode] of nextNodes) {
    const prevNode = prevNodes.get(id);
    if (!prevNode) {
      added.push(nextNode);
      continue;
    }

    const changed: Partial<WciNodeSpec> = {};
    const before: Partial<WciNodeSpec> = {};
    for (const field of COMPARED_FIELDS) {
      if (!sameValue(prevNode[field], nextNode[field])) {
        (changed as Record<string, unknown>)[field] = nextNode[field];
        (before as Record<string, unknown>)[field] = prevNode[field];
      }
    }
    if (Object.keys(changed).length > 0) {
      updated.push({ id, changed, previous: before });
    }
  }

  for (const id of prevNodes.keys()) {
    if (!nextNodes.has(id)) removed.push(id);
  }

  return {
    wci_version: next.wci_version,
    kind: 'diff',
    from: previous.distilled_at,
    to: next.distilled_at,
    scope: next.scope,
    added,
    removed,
    updated,
    unchanged: added.length === 0 && removed.length === 0 && updated.length === 0,
  };
}

/**
 * Choose whichever of the diff or the full view is cheaper to send.
 *
 * A diff is not always smaller — a page that re-renders wholesale produces a
 * diff carrying both old and new values, i.e. more tokens than just resending
 * the view. Measuring beats assuming.
 */
export function chooseCheaperPayload(
  previous: WciView,
  next: WciView,
): { payload: WciView | WciViewDiff; kind: 'full' | 'diff'; savedTokens: number } {
  const diff = diffViews(previous, next);
  const fullTokens = estimateJsonTokens(next);
  const diffTokens = estimateJsonTokens(diff);

  if (diffTokens < fullTokens) {
    return { payload: diff, kind: 'diff', savedTokens: fullTokens - diffTokens };
  }
  return { payload: next, kind: 'full', savedTokens: 0 };
}

/** Render a diff as compact Markdown for chat-style agents. */
export function serializeDiffMarkdown(diff: WciViewDiff): string {
  if (diff.unchanged) return '_No changes since the previous view._';

  const lines: string[] = ['### Changes since last view', ''];

  if (diff.added.length) {
    lines.push('**Added**');
    for (const n of diff.added) {
      lines.push(`- \`${n.id}\` (${n.role}) — ${n.desc}`);
    }
    lines.push('');
  }

  if (diff.updated.length) {
    lines.push('**Updated**');
    for (const d of diff.updated) {
      const fields = Object.keys(d.changed)
        .map(f => `${f}: ${JSON.stringify(d.previous[f as keyof WciNodeSpec])} → ${JSON.stringify(d.changed[f as keyof WciNodeSpec])}`)
        .join('; ');
      lines.push(`- \`${d.id}\` — ${fields}`);
    }
    lines.push('');
  }

  if (diff.removed.length) {
    lines.push(`**Removed** — ${diff.removed.map(id => `\`${id}\``).join(', ')}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
