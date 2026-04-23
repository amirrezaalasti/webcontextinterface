// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM Bridge — ActionResult types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionRequest {
  /** Target node's data-agent-id */
  nodeId: string;
  /** Action to perform */
  action: 'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear';
  /** Fill value (for 'fill', 'select') */
  value?: string | boolean | number;
}

export interface SideEffect {
  nodeId: string;
  change: Record<string, unknown>;
}

export interface ActionError {
  code:
    | 'NODE_NOT_FOUND'
    | 'SCOPE_DENIED'
    | 'ACTION_NOT_SUPPORTED'
    | 'PRECONDITION_UNMET'
    | 'VALIDATION_FAILED'
    | 'AUTH_REQUIRED'
    | 'RATE_LIMITED'
    | 'UNKNOWN_ERROR';
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
