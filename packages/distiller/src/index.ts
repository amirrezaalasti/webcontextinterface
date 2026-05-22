// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Main WciDistiller class
// ─────────────────────────────────────────────────────────────────────────────

import { WciView, SiteContextSummary } from '@wci/spec';
import { pruneDOM, PrunerOptions } from './pruner';
import { serializeJSON } from './serializer-json';
import { serializeMarkdown } from './serializer-md';

export type DistillerFormat = 'json' | 'markdown';

export interface DistillerOptions extends PrunerOptions {
  /** Output format — 'json' for tool-calling agents, 'markdown' for chat/RAG */
  format?: DistillerFormat;
  /** Attach site-level context summary to every distilled view */
  siteContext?: SiteContextSummary;
  /** Include full state snapshots (default: true) */
  includeState?: boolean;
}

export class WciDistiller {
  private opts: {
    format: DistillerFormat;
    scope: string | undefined;
    maxNodes: number;
    siteContext: SiteContextSummary | undefined;
    includeState: boolean;
  };

  constructor(opts: DistillerOptions = {}) {
    this.opts = {
      format:       opts.format       ?? 'json',
      scope:        opts.scope,
      maxNodes:     opts.maxNodes     ?? 128,
      siteContext:  opts.siteContext,
      includeState: opts.includeState ?? true,
    };
  }

  /**
   * Distil the given document (or element) into an WciView or Markdown string.
   */
  distil(root: Document | Element = document): WciView | string {
    const el = root instanceof Document ? root.body : root;
    const nodes = pruneDOM(el, { scope: this.opts.scope, maxNodes: this.opts.maxNodes });

    // Optionally strip state snapshots to save tokens
    const finalNodes = this.opts.includeState
      ? nodes
      : nodes.map(n => ({ ...n, state: {} }));

    // Find the active landmark descriptor for metadata
    const landmarkEl = this.opts.scope
      ? (root instanceof Document ? root : el).querySelector(`[data-wci-id="${this.opts.scope}"]`) as HTMLElement | null
      : null;

    const meta = {
      pageTitle:   root instanceof Document ? document.title : (el as HTMLElement).dataset?.agentDesc ?? '',
      scope:       this.opts.scope,
      scopeDesc:   landmarkEl?.dataset?.wciDesc,
      siteContext: this.opts.siteContext,
    };

    if (this.opts.format === 'markdown') {
      return serializeMarkdown(finalNodes, meta);
    }

    return serializeJSON(finalNodes, meta);
  }

  /** Convenience: distil and return a pretty-printed JSON string */
  distilJSON(root: Document | Element = document): string {
    const view = this.distil(root) as WciView;
    return JSON.stringify(view, null, 2);
  }

  /** Convenience: distil and return Markdown */
  distilMarkdown(root: Document | Element = document): string {
    const saved = this.opts.format;
    this.opts.format = 'markdown';
    const result = this.distil(root) as string;
    this.opts.format = saved;
    return result;
  }
}

export { pruneDOM } from './pruner';
export { serializeJSON } from './serializer-json';
export { serializeMarkdown } from './serializer-md';
