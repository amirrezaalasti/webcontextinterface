// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM Specification — Attribute Types & Role Enum
// packages/spec/src/index.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic role of a DOM node in agent context */
export type AgentRole =
  | 'action'    // clickable CTA (button, link with side-effect)
  | 'form'      // input, textarea, select, checkbox, radio
  | 'display'   // read-only data shown to the agent (price, status, label)
  | 'nav'       // navigation link (changes page/route)
  | 'status'    // async status indicator (loading, error, success)
  | 'landmark'; // scope root — wraps a bounded task zone

/** Action verbs the agent can dispatch on a node */
export type AgentAction =
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'upload'
  | 'submit'
  | 'navigate'
  | 'focus'
  | 'clear';

/** Sensitivity levels for scopes */
export type ScopeSensitivity =
  | 'low'
  | 'medium'
  | 'high'      // requires human confirmation
  | 'critical'; // never auto-execute

/**
 * Full typed interface for a single AgentDOM-annotated node.
 * Maps 1:1 to the `data-agent-*` HTML attributes.
 */
export interface AgentNodeSpec {
  /** Stable, unique identifier for this node across sessions */
  id: string;
  /** Semantic role */
  role: AgentRole;
  /** Human-readable description optimised for LLM context */
  desc: string;
  /** Action verb the agent can call on this node */
  action?: AgentAction;
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
  /** 1 (primary CTA) → 5 (low-priority) */
  priority?: number;
}

/** A distilled, flat representation of an entire page or scope */
export interface AgentView {
  agentdom_version: string;
  page_title: string;
  scope?: string;
  scope_desc?: string;
  distilled_at: string;
  node_count: number;
  site_context?: SiteContextSummary;
  nodes: AgentNodeSpec[];
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

/** Parsed agents.txt policy rules */
export interface AgentPolicy {
  siteName?: string;
  sitePurpose?: string;
  contact?: string;
  agentdomVersion?: string;
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

/** Full site manifest from agents.json */
export interface SiteManifest {
  agentdom_version: string;
  site: {
    name: string;
    base_url: string;
    purpose: string;
    language?: string;
    contact?: string;
  };
  capabilities: {
    agentdom_supported: boolean;
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
// DOM helper — read all data-agent-* attrs from an HTMLElement
// ─────────────────────────────────────────────────────────────────────────────

export function readNodeSpec(el: HTMLElement): AgentNodeSpec | null {
  const id   = el.dataset.agentId;
  const role = el.dataset.agentRole as AgentRole | undefined;

  // A node must have at least an id OR a role to be included
  if (!id && !role) return null;

  let state: Record<string, unknown> = {};
  try { state = JSON.parse(el.dataset.agentState ?? '{}'); } catch { /* ignore */ }

  let options: string[] | undefined;
  try {
    const raw = el.dataset.agentOptions;
    if (raw) options = JSON.parse(raw);
  } catch { /* ignore */ }

  return {
    id:           id ?? el.id ?? crypto.randomUUID(),
    role:         role ?? 'display',
    desc:         el.dataset.agentDesc ?? el.textContent?.trim().slice(0, 120) ?? '',
    action:       el.dataset.agentAction as AgentAction | undefined,
    state,
    precondition: el.dataset.agentPrecondition,
    required:     el.dataset.agentRequired === 'true',
    options,
    emits:        el.dataset.agentEmit,
    scope:        el.dataset.agentScope,
    hidden:       el.dataset.agentHidden === 'true',
    priority:     parseInt(el.dataset.agentPriority ?? '3', 10),
  };
}
