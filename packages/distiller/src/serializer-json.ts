// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — JSON Serializer
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WCI_PRIORITY,
  type SiteContextSummary,
  type WciNodeSpec,
  type WciView,
} from '@webcontextinterface/spec';

export const WCI_VIEW_VERSION = '1.0';

export interface SerializeMeta {
  pageTitle: string;
  scope?: string;
  scopeDesc?: string;
  siteContext?: SiteContextSummary;
  /** Fixed timestamp; defaults to now. Supplying it keeps output deterministic. */
  distilledAt?: string;
}

export interface SerializeJsonOptions {
  /**
   * Drop keys that carry no information (undefined, empty state, default
   * priority). Every dropped key is context-window budget returned to the
   * agent, which is the whole point of the distiller.
   */
  compact?: boolean;
}

/** Strip no-information keys from a node. */
function compactNode(node: WciNodeSpec): WciNodeSpec {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined) continue;
    if (key === 'state' && value && Object.keys(value as object).length === 0) continue;
    if (key === 'priority' && value === DEFAULT_WCI_PRIORITY) continue;
    if (key === 'required' && value === false) continue;
    if (key === 'hidden' && value === false) continue;
    if (key === 'desc' && value === '') continue;
    out[key] = value;
  }
  // `state` is required by WciNodeSpec; readers index it unconditionally.
  if (!('state' in out)) out.state = {};
  return out as unknown as WciNodeSpec;
}

export function serializeJSON(
  nodes: WciNodeSpec[],
  meta: SerializeMeta,
  options: SerializeJsonOptions = {},
): WciView {
  const view: WciView = {
    wci_version: WCI_VIEW_VERSION,
    page_title: meta.pageTitle,
    scope: meta.scope,
    scope_desc: meta.scopeDesc,
    distilled_at: meta.distilledAt ?? new Date().toISOString(),
    node_count: nodes.length,
    site_context: meta.siteContext,
    nodes: options.compact ? nodes.map(compactNode) : nodes,
  };

  if (options.compact) {
    for (const key of ['scope', 'scope_desc', 'site_context'] as const) {
      if (view[key] === undefined) delete view[key];
    }
  }

  return view;
}
