// ─────────────────────────────────────────────────────────────────────────────
// WCI React — annotation props
//
// Hand-writing `data-wci-state={JSON.stringify(...)}` on every element is where
// annotation bugs come from: forgotten quotes, stale state, typo'd attribute
// names that TypeScript never sees. These helpers make the annotation a typed
// object and produce the attributes from it.
// ─────────────────────────────────────────────────────────────────────────────

import type { WciAction, WciRole } from '@webcontextinterface/spec';

/** Typed description of a node's WCI annotation. */
export interface WciAnnotation {
  /** Stable identifier — required, and unique within the page. */
  id: string;
  /** Semantic role. */
  role: WciRole;
  /** Description written for a model: purpose and effect, not appearance. */
  desc: string;
  /** Action verb an agent may dispatch on this node. */
  action?: WciAction;
  /** Observable state snapshot; serialised to JSON. */
  state?: Record<string, unknown>;
  /** Natural-language guard the agent must satisfy first. */
  precondition?: string;
  /** Whether the input must be satisfied before its form submits. */
  required?: boolean;
  /** Enumerated choices for selects, radios, and checkbox groups. */
  options?: readonly string[];
  /** Custom DOM event fired after a successful interaction. */
  emits?: string;
  /** Parent landmark scope id. */
  scope?: string;
  /** Hide from distillation without removing from the DOM. */
  hidden?: boolean;
  /** 1 (primary) → 5 (low). Omit for the default of 3. */
  priority?: 1 | 2 | 3 | 4 | 5;
}

/** The `data-wci-*` attributes React will spread onto an element. */
export interface WciDataAttributes {
  'data-wci-id': string;
  'data-wci-role': WciRole;
  'data-wci-desc': string;
  'data-wci-action'?: WciAction;
  'data-wci-state'?: string;
  'data-wci-precondition'?: string;
  'data-wci-required'?: 'true';
  'data-wci-options'?: string;
  'data-wci-emit'?: string;
  'data-wci-scope'?: string;
  'data-wci-hidden'?: 'true';
  'data-wci-priority'?: string;
}

/**
 * Turn a typed annotation into spreadable `data-wci-*` props.
 *
 * Absent optionals are omitted rather than rendered as "undefined", which is
 * what a naive template produces and what then reaches the distiller as a
 * literal string.
 */
export function wciProps(annotation: WciAnnotation): WciDataAttributes {
  const props: WciDataAttributes = {
    'data-wci-id': annotation.id,
    'data-wci-role': annotation.role,
    'data-wci-desc': annotation.desc,
  };

  if (annotation.action) props['data-wci-action'] = annotation.action;
  if (annotation.state && Object.keys(annotation.state).length > 0) {
    props['data-wci-state'] = JSON.stringify(annotation.state);
  }
  if (annotation.precondition) props['data-wci-precondition'] = annotation.precondition;
  if (annotation.required) props['data-wci-required'] = 'true';
  if (annotation.options?.length) props['data-wci-options'] = JSON.stringify([...annotation.options]);
  if (annotation.emits) props['data-wci-emit'] = annotation.emits;
  if (annotation.scope) props['data-wci-scope'] = annotation.scope;
  if (annotation.hidden) props['data-wci-hidden'] = 'true';
  if (annotation.priority !== undefined) props['data-wci-priority'] = String(annotation.priority);

  return props;
}
