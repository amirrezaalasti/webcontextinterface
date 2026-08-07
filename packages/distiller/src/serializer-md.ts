// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — Markdown Serializer
// Produces a compact Markdown representation for chat/RAG agents.
// ─────────────────────────────────────────────────────────────────────────────

import type { WciNodeSpec } from '@webcontextinterface/spec';
import type { SerializeMeta } from './serializer-json';
import { WCI_VIEW_VERSION } from './serializer-json';

/**
 * Make arbitrary author text safe inside a Markdown table cell.
 *
 * An unescaped `|` in a description silently splits the row into extra
 * columns, which shifts every later field and hands the model a garbled table.
 */
export function escapeTableCell(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function stateStr(state: Record<string, unknown>): string {
  return Object.entries(state)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ');
}

export function serializeMarkdown(
  nodes: WciNodeSpec[],
  meta: SerializeMeta,
): string {
  const lines: string[] = [];

  // ── Site context header ──────────────────────────────────────────────────
  if (meta.siteContext) {
    const sc = meta.siteContext;
    lines.push(`> **Site:** ${sc.name} — ${sc.purpose}`);
    if (sc.denied_scopes?.length) {
      lines.push(`> **Denied scopes:** ${sc.denied_scopes.join(', ')}`);
    }
    if (sc.auth_required_for?.length) {
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
      const req = n.required ? '✅' : '—';
      const st = escapeTableCell(stateStr(n.state));
      const act = n.action ? `\`${n.action}\`` : '—';
      lines.push(
        `| \`${escapeTableCell(n.id)}\` | ${n.role} | ${escapeTableCell(n.desc)} | ${act} | ${req} | ${st} |`,
      );
      if (n.options?.length) {
        const opts = n.options.map(o => `\`${escapeTableCell(o)}\``).join(', ');
        lines.push(`| | | *Options:* ${opts} | | | |`);
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
      lines.push(
        `| \`${escapeTableCell(n.id)}\` | ${escapeTableCell(n.desc)} | ${escapeTableCell(stateStr(n.state))} |`,
      );
    }
    lines.push('');
  }

  // ── Precondition warnings ─────────────────────────────────────────────────
  const preconditioned = nodes.filter(n => n.precondition);
  for (const n of preconditioned) {
    lines.push(`> ⚠️ **Precondition on \`${n.id}\`:** ${n.precondition}`);
  }

  if (preconditioned.length) lines.push('');

  const at = meta.distilledAt ?? new Date().toISOString();
  lines.push(`*Distilled at ${at} · WCI v${WCI_VIEW_VERSION}*`);

  return lines.join('\n');
}
