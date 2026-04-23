// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM Distiller — JSON Serializer
// ─────────────────────────────────────────────────────────────────────────────

import { AgentNodeSpec, AgentView, SiteContextSummary } from '@agentdom/spec';

export function serializeJSON(
  nodes: AgentNodeSpec[],
  meta: {
    pageTitle: string;
    scope?: string;
    scopeDesc?: string;
    siteContext?: SiteContextSummary;
  }
): AgentView {
  return {
    agentdom_version: '1.0',
    page_title: meta.pageTitle,
    scope: meta.scope,
    scope_desc: meta.scopeDesc,
    distilled_at: new Date().toISOString(),
    node_count: nodes.length,
    site_context: meta.siteContext,
    nodes,
  };
}
