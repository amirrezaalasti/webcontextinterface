// ─────────────────────────────────────────────────────────────────────────────
// WCI Specification — Attribute Types & Role Enum
// packages/spec/src/index.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic role of a DOM node in agent context */
export type WciRole =
  | 'action'    // clickable CTA (button, link with side-effect)
  | 'form'      // input, textarea, select, checkbox, radio
  | 'display'   // read-only data shown to the agent (price, status, label)
  | 'nav'       // navigation link (changes page/route)
  | 'status'    // async status indicator (loading, error, success)
  | 'landmark'; // scope root — wraps a bounded task zone

/** Action verbs the agent can dispatch on a node */
export type WciAction =
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'upload'
  | 'submit'
  | 'navigate'
  | 'focus'
  | 'clear';

/** All valid WciRole values (for runtime validation) */
export const VALID_WCI_ROLES: readonly WciRole[] = [
  'action', 'form', 'display', 'nav', 'status', 'landmark',
] as const;

/** All valid WciAction values (for runtime validation) */
export const VALID_WCI_ACTIONS: readonly WciAction[] = [
  'click', 'fill', 'select', 'check', 'upload', 'submit', 'navigate', 'focus', 'clear',
] as const;

/** Sensitivity levels for scopes */
export type ScopeSensitivity =
  | 'low'
  | 'medium'
  | 'high'      // requires human confirmation
  | 'critical'; // never auto-execute

/**
 * Full typed interface for a single WCI-annotated node.
 * Maps 1:1 to the `data-wci-*` HTML attributes.
 */
export interface WciNodeSpec {
  /** Stable, unique identifier for this node across sessions */
  id: string;
  /** Semantic role */
  role: WciRole;
  /** Human-readable description optimised for LLM context */
  desc: string;
  /** Action verb the agent can call on this node */
  action?: WciAction;
  /** Current observable state (JSON snapshot) */
  state: Record<string, unknown>;
  /** Natural language guard condition */
  precondition?: string;
  /** Whether this input must be satisfied before its form is submittable */
  required?: boolean;
  /** Enumerated options for select/radio/checkbox groups */
  options?: string[];
  /** Custom DOM event fired after interaction */
  emits?: string;
  /** Parent landmark scope ID */
  scope?: string;
  /** Whether the Distiller should prune this node */
  hidden?: boolean;
  /** 1 (primary CTA) → 5 (low-priority). Defaults to 3 (medium) when unset. */
  priority?: number;
}

/** A distilled, flat representation of an entire page or scope */
export interface WciView {
  wci_version: string;
  page_title: string;
  scope?: string;
  scope_desc?: string;
  distilled_at: string;
  node_count: number;
  site_context?: SiteContextSummary;
  nodes: WciNodeSpec[];
}

/** Abbreviated site-level context embedded in every distilled view */
export interface SiteContextSummary {
  name: string;
  purpose: string;
  auth_required_for: string[];
  denied_scopes: string[];
  active_task_flow?: string;
  current_step?: number;
}

/** Parsed wci.txt policy rules */
export interface WciPolicy {
  siteName?: string;
  sitePurpose?: string;
  contact?: string;
  wciVersion?: string;
  manifestUrl?: string;
  contextUrl?: string;
  allowedScopes: string[];   // empty = all allowed unless explicitly denied
  deniedScopes: string[];
  rateLimitActions: number;  // per minute
  rateLimitDistil: number;   // per minute
  authRequired: string[];
  authMethod?: string;
  authFlowScope?: string;
  requireHumanConfirmation: string[];
  lastUpdated?: string;
}

/** Full site manifest from wci.json */
export interface SiteManifest {
  wci_version: string;
  site: {
    name: string;
    base_url: string;
    purpose: string;
    language?: string;
    contact?: string;
  };
  capabilities: {
    wci_supported: boolean;
    distiller_endpoint?: string;
    server_side_distil?: boolean;
    action_protocol_version?: string;
  };
  authentication?: {
    required_for: string[];
    method: string;
    auth_flow_scope?: string;
    auth_flow_url?: string;
  };
  task_flows?: TaskFlow[];
  scopes?: ScopeDescriptor[];
  denied_scopes?: string[];
  rate_limits?: {
    actions_per_minute: number;
    distil_requests_per_minute: number;
  };
  last_updated?: string;
}

export interface TaskFlow {
  id: string;
  description: string;
  steps: Array<{
    scope: string;
    url_pattern: string;
    requires_auth?: boolean;
    requires_human_confirmation?: boolean;
  }>;
}

export interface ScopeDescriptor {
  id: string;
  desc: string;
  url_pattern?: string;
  sensitivity?: ScopeSensitivity;
  requires_human_confirmation?: boolean;
  key_actions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM helper — read all data-wci-* attrs from an HTMLElement
// ─────────────────────────────────────────────────────────────────────────────

export function readWciNodeSpec(el: HTMLElement): WciNodeSpec | null {
  const id   = el.dataset.wciId;
  const rawRole = el.dataset.wciRole;

  // A node must have at least an id OR a role to be included
  if (!id && !rawRole) return null;

  // Validate role — reject unknown values with a console warning
  let role: WciRole | undefined;
  if (rawRole) {
    if ((VALID_WCI_ROLES as readonly string[]).includes(rawRole)) {
      role = rawRole as WciRole;
    } else {
      console.warn(`[WCI] Unknown role "${rawRole}" on element "${id ?? el.id}". Falling back to "display".`);
      role = 'display';
    }
  }

  // Validate action — reject unknown values with a console warning
  let action: WciAction | undefined;
  const rawAction = el.dataset.wciAction;
  if (rawAction) {
    if ((VALID_WCI_ACTIONS as readonly string[]).includes(rawAction)) {
      action = rawAction as WciAction;
    } else {
      console.warn(`[WCI] Unknown action "${rawAction}" on element "${id ?? el.id}". Ignoring.`);
    }
  }

  let state: Record<string, unknown> = {};
  try { state = JSON.parse(el.dataset.wciState ?? '{}'); } catch { /* ignore */ }

  let options: string[] | undefined;
  try {
    const raw = el.dataset.wciOptions;
    if (raw) options = JSON.parse(raw);
  } catch { /* ignore */ }

  return {
    id:           id ?? el.id ?? crypto.randomUUID(),
    role:         role ?? 'display',
    desc:         el.dataset.wciDesc ?? el.textContent?.trim().slice(0, 120) ?? '',
    action,
    state,
    precondition: el.dataset.wciPrecondition,
    required:     el.dataset.wciRequired === 'true',
    options,
    emits:        el.dataset.wciEmit,
    scope:        el.dataset.wciScope,
    hidden:       el.dataset.wciHidden === 'true',
    priority:     parseInt(el.dataset.wciPriority ?? '3', 10),
  };
}
