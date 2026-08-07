// ─────────────────────────────────────────────────────────────────────────────
// WCI Validator — issue and report types
// ─────────────────────────────────────────────────────────────────────────────

export type IssueLevel = 'error' | 'warning' | 'info';

/** Stable rule identifiers, so CI configs can ignore individual rules. */
export type RuleId =
  // markup
  | 'duplicate-id'
  | 'missing-id'
  | 'invalid-role'
  | 'invalid-action'
  | 'missing-desc'
  | 'weak-desc'
  | 'action-without-role'
  | 'action-element-mismatch'
  | 'unknown-scope'
  | 'landmark-without-id'
  | 'malformed-state'
  | 'malformed-options'
  | 'invalid-priority'
  | 'required-without-form-role'
  | 'options-without-choice-element'
  | 'unknown-attribute'
  | 'precondition-without-action'
  | 'empty-document'
  // wci.txt
  | 'txt-unknown-directive'
  | 'txt-malformed-line'
  | 'txt-invalid-number'
  | 'txt-missing-recommended'
  | 'txt-conflicting-scope'
  // wci.json
  | 'json-parse-error'
  | 'json-missing-field'
  | 'json-invalid-type'
  | 'json-unknown-scope-reference'
  | 'json-invalid-sensitivity';

export interface ValidationIssue {
  level: IssueLevel;
  rule: RuleId;
  message: string;
  /** `data-wci-id` of the offending node, when the issue is node-scoped. */
  nodeId?: string;
  /** A CSS-ish path to the element, to locate it in a large document. */
  path?: string;
  /** 1-indexed source line, when validating text formats. */
  line?: number;
  /** Actionable next step for whoever has to fix it. */
  hint?: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  counts: Record<IssueLevel, number>;
  /** Number of WCI nodes examined (markup validation only). */
  nodesChecked: number;
}

export interface ValidateOptions {
  /** Rules to skip entirely. */
  ignore?: readonly RuleId[];
  /** Promote warnings to errors, so CI fails on them. */
  strict?: boolean;
  /** Minimum useful description length before `weak-desc` fires (default 10). */
  minDescLength?: number;
  /**
   * Extra `data-wci-*` attributes this project defines, so first-party
   * extensions do not each raise `unknown-attribute`. Give the full attribute
   * name, e.g. `['data-wci-competitor']`.
   */
  allowAttributes?: readonly string[];
}

/** Build a report from a raw issue list, applying ignore/strict options. */
export function buildReport(
  issues: ValidationIssue[],
  nodesChecked: number,
  options: ValidateOptions = {},
): ValidationReport {
  const ignore = new Set(options.ignore ?? []);
  const kept = issues
    .filter(i => !ignore.has(i.rule))
    .map(i => (options.strict && i.level === 'warning' ? { ...i, level: 'error' as const } : i));

  const counts: Record<IssueLevel, number> = { error: 0, warning: 0, info: 0 };
  for (const i of kept) counts[i.level] += 1;

  return { valid: counts.error === 0, issues: kept, counts, nodesChecked };
}

/** Merge several reports into one (e.g. markup + wci.txt + wci.json). */
export function mergeReports(...reports: ValidationReport[]): ValidationReport {
  const issues = reports.flatMap(r => r.issues);
  const counts: Record<IssueLevel, number> = { error: 0, warning: 0, info: 0 };
  for (const r of reports) {
    counts.error += r.counts.error;
    counts.warning += r.counts.warning;
    counts.info += r.counts.info;
  }
  return {
    valid: counts.error === 0,
    issues,
    counts,
    nodesChecked: reports.reduce((sum, r) => sum + r.nodesChecked, 0),
  };
}
