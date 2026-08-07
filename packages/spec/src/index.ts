// ─────────────────────────────────────────────────────────────────────────────
// WCI Specification — public entry point
// packages/spec/src/index.ts
// ─────────────────────────────────────────────────────────────────────────────

export {
  VALID_WCI_ROLES,
  VALID_WCI_ACTIONS,
  MIN_WCI_PRIORITY,
  MAX_WCI_PRIORITY,
  DEFAULT_WCI_PRIORITY,
} from './types';

export type {
  WciRole,
  WciAction,
  ScopeSensitivity,
  WciNodeSpec,
  WciView,
  SiteContextSummary,
  WciPolicy,
  SiteManifest,
  TaskFlow,
  ScopeDescriptor,
} from './types';

export {
  readWciNodeSpec,
  escapeCssString,
  wciIdSelector,
  findWciElement,
  findAllWciElements,
  parseWciState,
  parseWciOptions,
  parseWciPriority,
} from './dom';

export type { ReadWciNodeOptions } from './dom';

export {
  isDocument,
  isElement,
  tagNameOf,
  isInputElement,
  isTextAreaElement,
  isSelectElement,
  isFormElement,
  isTextEntryElement,
  isCheckableElement,
  isFileInputElement,
  windowOf,
} from './guards';
