// ─────────────────────────────────────────────────────────────────────────────
// WCI Bridge — ActionResult types
// ─────────────────────────────────────────────────────────────────────────────

import type { WciAction } from '@webcontextinterface/spec';

/** A file to attach via the `upload` action, as a plain serialisable object. */
export interface UploadFileSpec {
  name: string;
  content?: string;
  type?: string;
}

/** Every value shape an action may carry. */
export type ActionValue =
  | string
  | boolean
  | number
  | UploadFileSpec
  | UploadFileSpec[]
  | File
  | File[];

export interface ActionRequest {
  /** Target node's data-wci-id */
  nodeId: string;
  /** Action to perform */
  action: WciAction;
  /** Payload for the action ('fill'/'select' value, 'upload' files, …) */
  value?: ActionValue;
}

export interface SideEffect {
  nodeId: string;
  change: Record<string, unknown>;
}

export type ActionErrorCode =
  | 'NODE_NOT_FOUND'
  | 'SCOPE_DENIED'
  | 'ACTION_NOT_SUPPORTED'
  | 'PRECONDITION_UNMET'
  | 'VALIDATION_FAILED'
  | 'AUTH_REQUIRED'
  | 'HUMAN_CONFIRMATION_REQUIRED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  hint?: string;
}

export interface ActionResult {
  success: boolean;
  nodeId: string;
  action: string;
  value?: unknown;
  stateChange?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  sideEffects?: SideEffect[];
  error?: ActionError;
  timestamp: string;
}

/**
 * Thrown when an action cannot apply to the targeted element.
 *
 * Carrying the code on the error lets the dispatcher return a precise
 * `ActionErrorCode` instead of collapsing every throw into UNKNOWN_ERROR —
 * agents branch on that code to decide whether a retry is worth attempting.
 */
export class DispatchError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'DispatchError';
  }
}
