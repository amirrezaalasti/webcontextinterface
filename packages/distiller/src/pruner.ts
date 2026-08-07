// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Pruner
// Strips decorative / invisible nodes, leaving only semantic WCI nodes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WCI_PRIORITY,
  readWciNodeSpec,
  type WciNodeSpec,
  type WciRole,
} from '@webcontextinterface/spec';

/** Matches any element carrying WCI markup. */
const WCI_ELEMENT_SELECTOR = '[data-wci-id],[data-wci-role]';

export interface PrunerOptions {
  /** If set, only collect nodes belonging to this landmark scope */
  scope?: string;
  /** Hard cap on returned nodes (to respect context-window budgets) */
  maxNodes?: number;
  /** Include nodes marked `data-wci-hidden="true"` (default false) */
  includeHidden?: boolean;
  /** If set, only collect nodes whose role is in this list */
  roles?: readonly WciRole[];
  /** Drop nodes whose priority is numerically greater than this (5 = keep all) */
  maxPriority?: number;
  /** Called instead of `console.warn` for invalid markup */
  onWarn?: (message: string) => void;
}

/**
 * Collect all WCI nodes under `root`, pruning hidden nodes and layout wrappers.
 *
 * Traversal uses `querySelectorAll` rather than a hand-rolled recursive walk:
 * the engine's native tree walk is markedly faster on large documents, and it
 * yields the same document-ordered result set.
 */
export function pruneDOM(root: Element = document.body, opts: PrunerOptions = {}): WciNodeSpec[] {
  const nodes: WciNodeSpec[] = [];
  const readOptions = { onWarn: opts.onWarn };

  const consider = (el: Element): void => {
    const spec = readWciNodeSpec(el as HTMLElement, readOptions);
    if (!spec) return;

    // Hiding is per-node, not per-subtree: children of a hidden node are still
    // eligible, which is why the flat selector scan matches the old walk.
    if (spec.hidden && !opts.includeHidden) return;
    if (opts.scope && spec.scope !== opts.scope && spec.id !== opts.scope) return;
    if (opts.roles && !opts.roles.includes(spec.role)) return;
    if (opts.maxPriority !== undefined && (spec.priority ?? DEFAULT_WCI_PRIORITY) > opts.maxPriority) return;

    nodes.push(spec);
  };

  // querySelectorAll only reaches descendants, so the root is checked directly.
  if (root.matches?.(WCI_ELEMENT_SELECTOR)) consider(root);
  for (const el of Array.from(root.querySelectorAll(WCI_ELEMENT_SELECTOR))) consider(el);

  // Sort by priority (ascending — 1 is highest importance). Array#sort is
  // stable, so nodes of equal priority stay in document order.
  nodes.sort((a, b) => (a.priority ?? DEFAULT_WCI_PRIORITY) - (b.priority ?? DEFAULT_WCI_PRIORITY));

  if (opts.maxNodes !== undefined && nodes.length > opts.maxNodes) {
    return nodes.slice(0, Math.max(0, opts.maxNodes));
  }

  return nodes;
}
