// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Main WciDistiller class
// ─────────────────────────────────────────────────────────────────────────────

import {
  findWciElement,
  isDocument,
  type SiteContextSummary,
  type WciNodeSpec,
  type WciView,
} from '@webcontextinterface/spec';
import { pruneDOM, type PrunerOptions } from './pruner';
import { serializeJSON, type SerializeMeta } from './serializer-json';
import { serializeMarkdown } from './serializer-md';
import { chooseCheaperPayload, diffViews, type WciViewDiff } from './diff';
import { estimateJsonTokens, estimateTokens } from './tokens';

export type DistillerFormat = 'json' | 'markdown';

export interface DistillerOptions extends PrunerOptions {
  /** Output format — 'json' for tool-calling agents, 'markdown' for chat/RAG */
  format?: DistillerFormat;
  /** Attach site-level context summary to every distilled view */
  siteContext?: SiteContextSummary;
  /** Include full state snapshots (default: true) */
  includeState?: boolean;
  /** Omit no-information fields from JSON output (default: true) */
  compact?: boolean;
  /**
   * Approximate token ceiling for the serialized view. Lowest-priority nodes
   * are dropped until the estimate fits.
   */
  maxTokens?: number;
}

/** What a budget-constrained distillation had to leave out. */
export interface DistillStats {
  nodeCount: number;
  droppedForBudget: number;
  estimatedTokens: number;
}

export class WciDistiller {
  private opts: Required<Pick<DistillerOptions,
    'format' | 'maxNodes' | 'includeState' | 'compact'>> & DistillerOptions;

  private lastStats: DistillStats = { nodeCount: 0, droppedForBudget: 0, estimatedTokens: 0 };

  constructor(opts: DistillerOptions = {}) {
    this.opts = {
      ...opts,
      format: opts.format ?? 'json',
      maxNodes: opts.maxNodes ?? 128,
      includeState: opts.includeState ?? true,
      compact: opts.compact ?? true,
    };
  }

  /** Stats from the most recent distillation. */
  getStats(): DistillStats {
    return { ...this.lastStats };
  }

  /** Collect the pruned, budget-trimmed node list for a root. */
  private collectNodes(root: Document | Element): { nodes: WciNodeSpec[]; meta: SerializeMeta } {
    const el = isDocument(root) ? root.body : root;
    const searchRoot = isDocument(root) ? root : el;

    let nodes = pruneDOM(el, {
      scope: this.opts.scope,
      maxNodes: this.opts.maxNodes,
      includeHidden: this.opts.includeHidden,
      roles: this.opts.roles,
      maxPriority: this.opts.maxPriority,
      onWarn: this.opts.onWarn,
    });

    if (!this.opts.includeState) {
      nodes = nodes.map(n => ({ ...n, state: {} }));
    }

    // Find the active landmark descriptor for metadata
    const landmarkEl = this.opts.scope ? findWciElement(searchRoot, this.opts.scope) : null;

    const meta: SerializeMeta = {
      pageTitle: isDocument(root)
        ? root.title
        : (el as HTMLElement).dataset?.wciDesc ?? '',
      scope: this.opts.scope,
      scopeDesc: landmarkEl?.dataset?.wciDesc,
      siteContext: this.opts.siteContext,
    };

    const total = nodes.length;
    if (this.opts.maxTokens !== undefined) {
      nodes = this.trimToBudget(nodes, meta, this.opts.maxTokens);
    }

    this.lastStats = {
      nodeCount: nodes.length,
      droppedForBudget: total - nodes.length,
      estimatedTokens: this.opts.format === 'markdown'
        ? estimateTokens(serializeMarkdown(nodes, meta))
        : estimateJsonTokens(serializeJSON(nodes, meta, { compact: this.opts.compact })),
    };

    return { nodes, meta };
  }

  /**
   * Drop the least important nodes until the view fits `maxTokens`.
   *
   * pruneDOM already sorted by priority, so the tail is by definition the
   * least useful context — binary search finds the longest prefix that fits
   * without re-serialising once per candidate node.
   */
  private trimToBudget(nodes: WciNodeSpec[], meta: SerializeMeta, maxTokens: number): WciNodeSpec[] {
    const cost = (subset: WciNodeSpec[]): number =>
      this.opts.format === 'markdown'
        ? estimateTokens(serializeMarkdown(subset, meta))
        : estimateJsonTokens(serializeJSON(subset, meta, { compact: this.opts.compact }));

    if (cost(nodes) <= maxTokens) return nodes;

    let lo = 0;
    let hi = nodes.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (cost(nodes.slice(0, mid)) <= maxTokens) lo = mid;
      else hi = mid - 1;
    }
    return nodes.slice(0, lo);
  }

  /**
   * Distil the given document (or element) into a WciView or Markdown string.
   * Prefer `distilJSON()` / `distilMarkdown()` for a precise return type.
   */
  distil(root: Document | Element = document): WciView | string {
    return this.opts.format === 'markdown' ? this.distilMarkdown(root) : this.toView(root);
  }

  /** Distil to a structured WciView object. */
  toView(root: Document | Element = document): WciView {
    const saved = this.opts.format;
    this.opts.format = 'json';
    try {
      const { nodes, meta } = this.collectNodes(root);
      return serializeJSON(nodes, meta, { compact: this.opts.compact });
    } finally {
      this.opts.format = saved;
    }
  }

  /** Convenience: distil and return a pretty-printed JSON string */
  distilJSON(root: Document | Element = document): string {
    return JSON.stringify(this.toView(root), null, 2);
  }

  /** Convenience: distil and return Markdown */
  distilMarkdown(root: Document | Element = document): string {
    const saved = this.opts.format;
    this.opts.format = 'markdown';
    try {
      const { nodes, meta } = this.collectNodes(root);
      return serializeMarkdown(nodes, meta);
    } finally {
      this.opts.format = saved;
    }
  }
}

/**
 * A distiller that remembers the previous view and can emit only what changed.
 *
 * This is the shape an agent loop wants: `next()` after every action, sending
 * a payload whose size tracks the change rather than the page.
 */
export class WciDistillerSession {
  private previous: WciView | null = null;

  constructor(private readonly distiller: WciDistiller = new WciDistiller()) {}

  /** Full view, and the baseline for subsequent diffs. */
  start(root: Document | Element = document): WciView {
    this.previous = this.distiller.toView(root);
    return this.previous;
  }

  /** Diff against the previous view; a full view on the first call. */
  next(root: Document | Element = document): WciView | WciViewDiff {
    const view = this.distiller.toView(root);
    if (!this.previous) {
      this.previous = view;
      return view;
    }
    const diff = diffViews(this.previous, view);
    this.previous = view;
    return diff;
  }

  /** Like `next()`, but falls back to a full view when the diff is larger. */
  nextCheapest(root: Document | Element = document): {
    payload: WciView | WciViewDiff;
    kind: 'full' | 'diff';
    savedTokens: number;
  } {
    const view = this.distiller.toView(root);
    if (!this.previous) {
      this.previous = view;
      return { payload: view, kind: 'full', savedTokens: 0 };
    }
    const chosen = chooseCheaperPayload(this.previous, view);
    this.previous = view;
    return chosen;
  }

  /** Drop the baseline so the next call returns a full view. */
  reset(): void {
    this.previous = null;
  }
}

export { pruneDOM } from './pruner';
export type { PrunerOptions } from './pruner';
export { serializeJSON, WCI_VIEW_VERSION } from './serializer-json';
export type { SerializeMeta, SerializeJsonOptions } from './serializer-json';
export { serializeMarkdown, escapeTableCell } from './serializer-md';
export { diffViews, chooseCheaperPayload, serializeDiffMarkdown } from './diff';
export type { WciViewDiff, WciNodeDelta } from './diff';
export { estimateTokens, estimateJsonTokens } from './tokens';
