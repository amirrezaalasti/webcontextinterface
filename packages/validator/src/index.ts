/**
 * @webcontextinterface/validator — lint WCI markup and site files.
 * @packageDocumentation
 */

export { validateMarkup } from './markup';
export { validateWciTxt, validateManifest } from './site-files';
export { formatReport, formatReportJSON, formatReportGitHub } from './format';
export type { FormatOptions } from './format';
export { buildReport, mergeReports } from './types';
export type {
  IssueLevel,
  RuleId,
  ValidateOptions,
  ValidationIssue,
  ValidationReport,
} from './types';
