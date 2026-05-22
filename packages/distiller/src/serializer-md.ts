// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Markdown Serializer
// Produces a compact Markdown representation for chat/RAG agents.
// ─────────────────────────────────────────────────────────────────────────────

import { WciNodeSpec, SiteContextSummary } from '@wci/spec';

function stateStr(state: Record<string, unknown>): string {
  return Object.entries(state)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ');
}

export function serializeMarkdown(
  nodes: WciNodeSpec[],
  meta: {
    pageTitle: string;
    scope?: string;
    scopeDesc?: string;
    siteContext?: SiteContextSummary;
  }
): string {
  const lines: string[] = [];

  // ── Site context header ──────────────────────────────────────────────────
  if (meta.siteContext) {
    const sc = meta.siteContext;
    lines.push(`> **Site:** ${sc.name} — ${sc.purpose}`);
    if (sc.denied_scopes.length) {
      lines.push(`> **Denied scopes:** ${sc.denied_scopes.join(', ')}`);
    }
    if (sc.auth_required_for.length) {
      lines.push(`> **Auth required for:** ${sc.auth_required_for.join(', ')}`);
    }
    if (sc.active_task_flow) {
      lines.push(`> **Active task flow:** ${sc.active_task_flow} (step ${sc.current_step ?? '?'})`);
    }
    lines.push('');
  }

  // ── Page header ───────────────────────────────────────────────────────────
  lines.push(`## Page: ${meta.pageTitle}`);
  if (meta.scope) {
    lines.push(`**Scope:** \`${meta.scope}\`${meta.scopeDesc ? ` — ${meta.scopeDesc}` : ''}`);
  }
  lines.push('');

  // Split into actionable vs status/display nodes
  const actionable = nodes.filter(n => n.role !== 'status' && n.role !== 'display');
  const statusNodes = nodes.filter(n => n.role === 'status' || n.role === 'display');

  // ── Actionable table ──────────────────────────────────────────────────────
  if (actionable.length) {
    lines.push('### Actionable Nodes');
    lines.push('');
    lines.push('| ID | Role | Description | Action | Required | State |');
    lines.push('|----|------|-------------|--------|----------|-------|');
    for (const n of actionable) {
      const req  = n.required ? '✅' : '—';
      const st   = stateStr(n.state);
      const act  = n.action ? `\`${n.action}\`` : '—';
      lines.push(`| \`${n.id}\` | ${n.role} | ${n.desc} | ${act} | ${req} | ${st} |`);
      if (n.options?.length) {
        lines.push(`| | | *Options:* ${n.options.map(o => `\`${o}\``).join(', ')} | | | |`);
      }
    }
    lines.push('');
  }

  // ── Status / display table ────────────────────────────────────────────────
  if (statusNodes.length) {
    lines.push('### Status & Display Nodes');
    lines.push('');
    lines.push('| ID | Description | State |');
    lines.push('|----|-------------|-------|');
    for (const n of statusNodes) {
      lines.push(`| \`${n.id}\` | ${n.desc} | ${stateStr(n.state)} |`);
    }
    lines.push('');
  }

  // ── Precondition warnings ─────────────────────────────────────────────────
  const preconditioned = nodes.filter(n => n.precondition);
  for (const n of preconditioned) {
    lines.push(`> ⚠️ **Precondition on \`${n.id}\`:** ${n.precondition}`);
  }

  if (preconditioned.length) lines.push('');

  lines.push(`*Distilled at ${new Date().toISOString()} · WCI v1.0*`);

  return lines.join('\n');
}
