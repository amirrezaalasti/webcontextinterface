// ─────────────────────────────────────────────────────────────────────────────
// WCI Specification — DOM reading and safe node lookup
// packages/spec/src/dom.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WCI_PRIORITY,
  MAX_WCI_PRIORITY,
  MIN_WCI_PRIORITY,
  VALID_WCI_ACTIONS,
  VALID_WCI_ROLES,
  type WciAction,
  type WciNodeSpec,
  type WciRole,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Safe attribute-selector construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escape a string for safe embedding inside a double-quoted CSS selector string.
 *
 * Node IDs routinely arrive from model output, so a raw `"` in an id would
 * otherwise terminate the selector early and let the remainder be parsed as
 * selector syntax — silently targeting the wrong element or throwing.
 */
export function escapeCssString(value: string): string {
  return value.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\A ');
}

/** Build a safe `[data-wci-id="…"]` selector for an arbitrary node id. */
export function wciIdSelector(nodeId: string): string {
  return `[data-wci-id="${escapeCssString(nodeId)}"]`;
}

/** Look up a single WCI node by id, immune to selector injection. */
export function findWciElement(root: ParentNode, nodeId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(wciIdSelector(nodeId));
}

/** Look up every WCI node carrying `nodeId` (duplicate ids are a markup error). */
export function findAllWciElements(root: ParentNode, nodeId: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(wciIdSelector(nodeId)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Cheap unique id for elements that carry WCI attributes but no stable id. */
let anonCounter = 0;
function generateAnonymousId(): string {
  const c: Partial<Crypto> | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  // randomUUID is unavailable in insecure browser contexts and older runtimes.
  if (typeof c?.randomUUID === 'function') return `wci-anon-${c.randomUUID()}`;
  anonCounter += 1;
  return `wci-anon-${Date.now().toString(36)}-${anonCounter}`;
}

/** Parse `data-wci-state`; only a plain JSON object is a valid state snapshot. */
export function parseWciState(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* malformed state is treated as empty, never fatal */ }
  return {};
}

/** Parse `data-wci-options`; accepts a JSON array, coercing members to strings. */
export function parseWciOptions(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* fall through to comma-separated form */ }
  // Authors frequently write `data-wci-options="a, b, c"` — accept it.
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Parse and clamp `data-wci-priority` into [1, 5], defaulting to 3. */
export function parseWciPriority(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_WCI_PRIORITY;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_WCI_PRIORITY;
  return Math.min(MAX_WCI_PRIORITY, Math.max(MIN_WCI_PRIORITY, n));
}

/** Parse a boolean-valued `data-wci-*` attribute; absent stays `undefined`. */
function parseWciBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  // A bare attribute (`data-wci-required`) reads as "" and means true.
  return raw === '' || raw.toLowerCase() === 'true';
}

// ─────────────────────────────────────────────────────────────────────────────
// Reader
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadWciNodeOptions {
  /** Called instead of `console.warn` when markup is invalid. */
  onWarn?: (message: string) => void;
  /** Max characters of fallback text used as `desc` (default 120). */
  maxFallbackDescLength?: number;
}

export function readWciNodeSpec(
  el: HTMLElement,
  options: ReadWciNodeOptions = {},
): WciNodeSpec | null {
  const warn = options.onWarn ?? ((m: string) => console.warn(m));
  const id = el.dataset.wciId;
  const rawRole = el.dataset.wciRole;

  // A node must have at least an id OR a role to be included
  if (!id && !rawRole) return null;

  // Validate role — reject unknown values with a warning
  let role: WciRole | undefined;
  if (rawRole) {
    if ((VALID_WCI_ROLES as readonly string[]).includes(rawRole)) {
      role = rawRole as WciRole;
    } else {
      warn(`[WCI] Unknown role "${rawRole}" on element "${id || el.id || '(anonymous)'}". Falling back to "display".`);
      role = 'display';
    }
  }

  // Validate action — reject unknown values with a warning
  let action: WciAction | undefined;
  const rawAction = el.dataset.wciAction;
  if (rawAction) {
    if ((VALID_WCI_ACTIONS as readonly string[]).includes(rawAction)) {
      action = rawAction as WciAction;
    } else {
      warn(`[WCI] Unknown action "${rawAction}" on element "${id || el.id || '(anonymous)'}". Ignoring.`);
    }
  }

  const maxDesc = options.maxFallbackDescLength ?? 120;

  return {
    // `el.id` is "" (not nullish) when absent, so `||` is required here.
    id:           id || el.id || generateAnonymousId(),
    role:         role ?? 'display',
    desc:         el.dataset.wciDesc ?? el.textContent?.trim().slice(0, maxDesc) ?? '',
    action,
    state:        parseWciState(el.dataset.wciState),
    precondition: el.dataset.wciPrecondition,
    required:     parseWciBoolean(el.dataset.wciRequired),
    options:      parseWciOptions(el.dataset.wciOptions),
    emits:        el.dataset.wciEmit,
    scope:        el.dataset.wciScope,
    hidden:       parseWciBoolean(el.dataset.wciHidden),
    priority:     parseWciPriority(el.dataset.wciPriority),
  };
}
