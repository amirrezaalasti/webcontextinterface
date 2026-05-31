// ─────────────────────────────────────────────────────────────────────────────
// WCI Bridge — Action Dispatcher
// Translates an ActionRequest into real DOM interactions and captures results.
// ─────────────────────────────────────────────────────────────────────────────

import type { PolicyEngine } from '@webcontextinterface/context';
import { enforcePolicyForDispatch } from './policy-guard';
import { ActionRequest, ActionResult, SideEffect } from './result';

/** Snapshot the current data-wci-state of an element */
function captureState(el: HTMLElement): Record<string, unknown> {
  try {
    return JSON.parse(el.dataset.wciState ?? '{}');
  } catch {
    return {};
  }
}

/** Update the data-wci-state attribute on an element */
function patchState(el: HTMLElement, patch: Record<string, unknown>): Record<string, unknown> {
  let current: Record<string, unknown> = {};
  try { current = JSON.parse(el.dataset.wciState ?? '{}'); } catch { /* ignore */ }
  const next = { ...current, ...patch };
  el.dataset.wciState = JSON.stringify(next);
  return next;
}

/** Collect side effects — scan the DOM for nodes whose state changed after the action */
function collectSideEffects(
  before: Map<string, Record<string, unknown>>,
  root: Element
): SideEffect[] {
  const effects: SideEffect[] = [];
  const all = root.querySelectorAll<HTMLElement>('[data-wci-id]');
  for (const el of Array.from(all)) {
    const id = el.dataset.wciId!;
    const prev = before.get(id);
    if (!prev) continue;
    const curr = captureState(el);
    const changed = Object.entries(curr).some(([k, v]) => JSON.stringify(v) !== JSON.stringify(prev[k]));
    if (changed) effects.push({ nodeId: id, change: curr });
  }
  return effects;
}

export async function dispatchAction(
  req: ActionRequest,
  root: Element = document.body,
  policy?: PolicyEngine
): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  const target = root.querySelector<HTMLElement>(`[data-wci-id="${req.nodeId}"]`);

  if (!target) {
    return {
      success: false, nodeId: req.nodeId, action: req.action, timestamp,
      error: {
        code: 'NODE_NOT_FOUND',
        message: `No element with data-wci-id="${req.nodeId}" found in the DOM.`,
        hint: 'Verify the node ID from the distilled view. The page may have navigated.',
      },
    };
  }

  if (policy) {
    const blocked = enforcePolicyForDispatch(policy, req, target);
    if (blocked) return blocked;
  }

  // Check precondition
  const precondition = target.dataset.wciPrecondition;
  if (precondition && target.hasAttribute('disabled')) {
    return {
      success: false, nodeId: req.nodeId, action: req.action, timestamp,
      error: {
        code: 'PRECONDITION_UNMET',
        message: `Precondition not met for "${req.nodeId}": ${precondition}`,
        hint: 'Satisfy the listed precondition before dispatching this action.',
      },
    };
  }

  // Snapshot all current states for side-effect detection
  const allNodes = root.querySelectorAll<HTMLElement>('[data-wci-id]');
  const before = new Map<string, Record<string, unknown>>();
  for (const el of Array.from(allNodes)) before.set(el.dataset.wciId!, captureState(el));

  const stateBefore = captureState(target);

  try {
    let stateAfter: Record<string, unknown> = { ...stateBefore };

    switch (req.action) {
      case 'click': {
        target.click();
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          stateAfter = patchState(target, { checked: target.checked });
        } else {
          stateAfter = patchState(target, { clicked: true });
        }
        break;
      }

      case 'fill': {
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
          throw new Error(`Node "${req.nodeId}" does not support "fill".`);
        }
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        nativeInputValueSetter?.call(target, String(req.value ?? ''));
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        stateAfter = patchState(target, { value: req.value });
        break;
      }

      case 'select': {
        if (!(target instanceof HTMLSelectElement)) {
          throw new Error(`Node "${req.nodeId}" does not support "select".`);
        }
        target.value = String(req.value ?? '');
        target.dispatchEvent(new Event('change', { bubbles: true }));
        stateAfter = patchState(target, { value: req.value });
        break;
      }

      case 'check': {
        if (!(target instanceof HTMLInputElement)) {
          throw new Error(`Node "${req.nodeId}" does not support "check".`);
        }
        target.checked = Boolean(req.value ?? true);
        target.dispatchEvent(new Event('change', { bubbles: true }));
        stateAfter = patchState(target, { checked: target.checked });
        break;
      }

      case 'focus': {
        target.focus();
        stateAfter = patchState(target, { focused: true });
        break;
      }

      case 'clear': {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.value = '';
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        stateAfter = patchState(target, { value: '' });
        break;
      }

      case 'submit': {
        const form = target.closest('form') ?? (target instanceof HTMLFormElement ? target : null);
        if (!form) throw new Error(`No form ancestor found for "${req.nodeId}".`);
        form.requestSubmit();
        stateAfter = patchState(target, { submitted: true });
        break;
      }

      case 'navigate': {
        const href = target.getAttribute('href') ?? String(req.value ?? '');
        if (!href) throw new Error(`Cannot navigate: no href on "${req.nodeId}".`);
        window.location.href = href;
        stateAfter = patchState(target, { navigating: href });
        break;
      }
    }

    // Emit custom wci event
    const emitName = target.dataset.wciEmit;
    if (emitName) {
      target.dispatchEvent(new CustomEvent(emitName, {
        bubbles: true,
        detail: { nodeId: req.nodeId, action: req.action, value: req.value, stateAfter },
      }));
    }

    // Also emit the generic state-change bus event
    document.dispatchEvent(new CustomEvent('wci:state-change', {
      detail: { nodeId: req.nodeId, action: req.action, stateAfter },
    }));

    // Wait one microtask for React/Vue reactive state to flush
    await Promise.resolve();

    const sideEffects = collectSideEffects(before, root)
      .filter(se => se.nodeId !== req.nodeId);

    return {
      success: true, nodeId: req.nodeId, action: req.action,
      value: req.value, timestamp,
      stateChange: { before: stateBefore, after: stateAfter },
      sideEffects: sideEffects.length ? sideEffects : undefined,
    };

  } catch (err) {
    return {
      success: false, nodeId: req.nodeId, action: req.action, timestamp,
      error: {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : String(err),
        hint: 'Check that the action is supported for this element type.',
      },
    };
  }
}
