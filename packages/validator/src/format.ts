// ─────────────────────────────────────────────────────────────────────────────
// WCI Validator — report formatters
// ─────────────────────────────────────────────────────────────────────────────

import type { IssueLevel, ValidationReport } from './types';

const SYMBOLS: Record<IssueLevel, string> = { error: '✖', warning: '⚠', info: 'ℹ' };
const ANSI: Record<IssueLevel, string> = { error: '[31m', warning: '[33m', info: '[36m' };
const RESET = '[0m';
const DIM = '[2m';

export interface FormatOptions {
  /** Emit ANSI colour codes (default: off, so piped output stays clean). */
  color?: boolean;
  /** Include `hint` lines (default: true). */
  hints?: boolean;
}

/** Human-readable console output. */
export function formatReport(
  report: ValidationReport,
  { color = false, hints = true }: FormatOptions = {},
): string {
  const paint = (level: IssueLevel, text: string): string =>
    color ? `${ANSI[level]}${text}${RESET}` : text;
  const dim = (text: string): string => (color ? `${DIM}${text}${RESET}` : text);

  if (report.issues.length === 0) {
    return `✔ No issues found (${report.nodesChecked} node${report.nodesChecked === 1 ? '' : 's'} checked).`;
  }

  const lines: string[] = [];
  for (const issue of report.issues) {
    const where = issue.nodeId
      ? `#${issue.nodeId}`
      : issue.line !== undefined
        ? `line ${issue.line}`
        : '';

    lines.push(
      `${paint(issue.level, SYMBOLS[issue.level])} ${paint(issue.level, issue.level.padEnd(7))}` +
      `${where ? `${where}  ` : ''}${issue.message} ${dim(`(${issue.rule})`)}`,
    );
    if (issue.path && !issue.nodeId) lines.push(dim(`    at ${issue.path}`));
    if (hints && issue.hint) lines.push(dim(`    → ${issue.hint}`));
  }

  lines.push('');
  lines.push(
    `${report.counts.error} error(s), ${report.counts.warning} warning(s), ` +
    `${report.counts.info} info — ${report.nodesChecked} node(s) checked.`,
  );

  return lines.join('\n');
}

/** Machine-readable JSON, for CI pipelines and editor integrations. */
export function formatReportJSON(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * GitHub Actions workflow-command output, so issues surface as inline
 * annotations on the pull request diff rather than buried in the log.
 */
export function formatReportGitHub(report: ValidationReport, file?: string): string {
  return report.issues
    .map(issue => {
      const kind = issue.level === 'info' ? 'notice' : issue.level;
      const props = [
        file ? `file=${file}` : '',
        issue.line !== undefined ? `line=${issue.line}` : '',
        `title=WCI ${issue.rule}`,
      ].filter(Boolean).join(',');
      const where = issue.nodeId ? `[#${issue.nodeId}] ` : '';
      return `::${kind} ${props}::${where}${issue.message}`;
    })
    .join('\n');
}
