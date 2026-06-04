// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Pruner
// Strips decorative / invisible nodes, leaving only semantic WCI nodes.
// ─────────────────────────────────────────────────────────────────────────────

import { WciNodeSpec, readWciNodeSpec } from '@webcontextinterface/spec';

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

    // Try to read a spec from this element
    const spec = readWciNodeSpec(htmlEl);

    if (spec) {
      // If a scope filter is active, only include nodes in that scope.
      // Nodes marked data-wci-hidden="true" are excluded but their children
      // are still visited (hiding is per-node, not per-subtree).
      if (!spec.hidden) {
        if (!opts.scope || spec.scope === opts.scope || spec.id === opts.scope) {
          nodes.push(spec);
        }
      }
    }

    // Always recurse into children (even for hidden or landmark nodes)
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
