/**
 * @webcontextinterface/core — WCI SDK (spec, distiller, bridge, context, validator)
 * @packageDocumentation
 */

export * from '@webcontextinterface/spec';

export {
  WciDistiller,
  WciDistillerSession,
  pruneDOM,
  serializeJSON,
  serializeMarkdown,
  escapeTableCell,
  diffViews,
  chooseCheaperPayload,
  serializeDiffMarkdown,
  estimateTokens,
  estimateJsonTokens,
  WCI_VIEW_VERSION,
} from '@webcontextinterface/distiller';
export type {
  DistillerFormat,
  DistillerOptions,
  DistillStats,
  PrunerOptions,
  SerializeMeta,
  SerializeJsonOptions,
  WciViewDiff,
  WciNodeDelta,
} from '@webcontextinterface/distiller';

export { WciBridge, dispatchAction, DispatchError } from '@webcontextinterface/bridge';
export {
  resolveScopeId,
  enforcePolicyForDispatch,
  checkPolicyBeforeDispatch,
} from '@webcontextinterface/bridge';
export type {
  ActionRequest,
  ActionResult,
  ActionValue,
  ActionError,
  ActionErrorCode,
  SideEffect,
  UploadFileSpec,
  StateChangeHandler,
  ResultHandler,
  WciBridgeOptions,
  DispatchOptions,
} from '@webcontextinterface/bridge';

export {
  WciContextLoader,
  PolicyEngine,
  ScopeDeniedError,
} from '@webcontextinterface/context';
export type { SiteContext } from '@webcontextinterface/context';

export {
  validateMarkup,
  validateWciTxt,
  validateManifest,
  formatReport,
  formatReportJSON,
  formatReportGitHub,
  mergeReports,
} from '@webcontextinterface/validator';
export type {
  IssueLevel,
  RuleId,
  ValidateOptions,
  ValidationIssue,
  ValidationReport,
  FormatOptions,
} from '@webcontextinterface/validator';

export {
  inferAnnotations,
  applyInferredAnnotations,
  inferView,
} from '@webcontextinterface/annotator';
export type {
  InferOptions,
  InferredNode,
  InferenceReport,
  ApplyOptions,
  ApplyResult,
} from '@webcontextinterface/annotator';
