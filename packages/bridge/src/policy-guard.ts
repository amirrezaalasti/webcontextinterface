// ─────────────────────────────────────────────────────────────────────────────
// Policy guard — validate wci.txt rules before DOM dispatch
// ─────────────────────────────────────────────────────────────────────────────

import type { PolicyEngine } from '@webcontextinterface/context';
import type { ActionRequest, ActionResult } from './result';

/** Resolve the scope id used for wci.txt Allow/Deny/Auth rules. */
export function resolveScopeId(target: HTMLElement, fallbackNodeId: string): string {
  let cur: HTMLElement | null = target;
  while (cur) {
    const scoped = cur.dataset.wciScope?.trim();
    if (scoped) return scoped;
    if (cur.dataset.wciRole === 'landmark' && cur.dataset.wciId) {
      return cur.dataset.wciId;
    }
    cur = cur.parentElement;
  }
  return fallbackNodeId;
}

/**
 * Enforce PolicyEngine rules for a target node. Returns an ActionResult on violation,
 * or null when dispatch may proceed.
 */
export function enforcePolicyForDispatch(
  policy: PolicyEngine,
  req: ActionRequest,
  target: HTMLElement
): ActionResult | null {
  const timestamp = new Date().toISOString();
  const scopeId = resolveScopeId(target, req.nodeId);

  if (policy.isScopeDenied(scopeId)) {
    return {
      success: false,
      nodeId: req.nodeId,
      action: req.action,
      timestamp,
      error: {
        code: 'SCOPE_DENIED',
        message: `Scope "${scopeId}" is denied by wci.txt.`,
        hint: 'Do not retry this scope; choose an allowed scope or inform the user.',
      },
    };
  }

  if (policy.requiresAuth(scopeId)) {
    return {
      success: false,
      nodeId: req.nodeId,
      action: req.action,
      timestamp,
      error: {
        code: 'AUTH_REQUIRED',
        message: `Scope "${scopeId}" requires authentication before "${req.action}" on "${req.nodeId}".`,
        hint: 'Complete the auth flow (see Auth-Flow-Scope in wci.txt) before dispatching.',
      },
    };
  }

  if (policy.requiresHumanConfirmation(scopeId)) {
    return {
      success: false,
      nodeId: req.nodeId,
      action: req.action,
      timestamp,
      error: {
        code: 'HUMAN_CONFIRMATION_REQUIRED',
        message: `Scope "${scopeId}" requires explicit human confirmation before "${req.action}" on "${req.nodeId}".`,
        hint: 'Obtain user approval, then dispatch with confirmation recorded in your agent state.',
      },
    };
  }

  return null;
}

/**
 * Look up the target element and run policy checks. Returns ActionResult when the
 * node is missing or policy blocks the action; null when dispatch may proceed.
 */
export function checkPolicyBeforeDispatch(
  policy: PolicyEngine | undefined,
  req: ActionRequest,
  root: Element
): ActionResult | null {
  if (!policy) return null;

  const target = root.querySelector<HTMLElement>(`[data-wci-id="${req.nodeId}"]`);
  if (!target) return null;

  return enforcePolicyForDispatch(policy, req, target);
}
