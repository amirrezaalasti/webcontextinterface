// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — JSON Serializer
// ─────────────────────────────────────────────────────────────────────────────

import { WciNodeSpec, WciView, SiteContextSummary } from '@wci/spec';

export function serializeJSON(
  nodes: WciNodeSpec[],
  meta: {
    pageTitle: string;
    scope?: string;
    scopeDesc?: string;
    siteContext?: SiteContextSummary;
  }
): WciView {
  return {
    wci_version: '1.0',
    page_title: meta.pageTitle,
    scope: meta.scope,
    scope_desc: meta.scopeDesc,
    distilled_at: new Date().toISOString(),
    node_count: nodes.length,
    site_context: meta.siteContext,
    nodes,
  };
}
