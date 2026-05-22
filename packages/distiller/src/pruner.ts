// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Pruner
// Strips decorative / invisible nodes, leaving only semantic WCI nodes.
// ─────────────────────────────────────────────────────────────────────────────

import { WciNodeSpec, readWciNodeSpec } from '@wci/spec';

export interface PrunerOptions {
  /** If set, only collect nodes belonging to this landmark scope */
  scope?: string;
  /** Hard cap on returned nodes (to respect context-window budgets) */
  maxNodes?: number;
}

/**
 * Walk the DOM tree starting from `root`, collecting all nodes that carry
 * WCI attributes, pruning hidden subtrees and layout-only wrappers.
 */
export function pruneDOM(root: Element = document.body, opts: PrunerOptions = {}): WciNodeSpec[] {
  const nodes: WciNodeSpec[] = [];

  function walk(el: Element): void {
    const htmlEl = el as HTMLElement;

    // Skip hidden subtrees
    if (htmlEl.dataset?.agentHidden === 'true') return;

    // Try to read a spec from this element
    const spec = readWciNodeSpec(htmlEl);

    if (spec) {
      // If a scope filter is active, only include nodes in that scope
      if (!opts.scope || spec.scope === opts.scope || spec.id === opts.scope) {
        if (!spec.hidden) {
          nodes.push(spec);
        }
      }
      // If this element IS the landmark we're scoping to, still recurse
      if (spec.role === 'landmark') {
        for (const child of Array.from(el.children)) walk(child);
        return;
      }
      // Non-landmark annotated nodes: recurse for nested annotated children
    }

    // Always recurse into children
    for (const child of Array.from(el.children)) walk(child);
  }

  walk(root);

  // Sort by priority (ascending — 1 is highest importance)
  nodes.sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));

  if (opts.maxNodes && nodes.length > opts.maxNodes) {
    return nodes.slice(0, opts.maxNodes);
  }

  return nodes;
}
