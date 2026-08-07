// ─────────────────────────────────────────────────────────────────────────────
// WCI Bridge — Action Dispatcher
// Translates an ActionRequest into real DOM interactions and captures results.
// ─────────────────────────────────────────────────────────────────────────────

import type { PolicyEngine } from '@webcontextinterface/context';
import {
  findWciElement,
  isCheckableElement,
  isFileInputElement,
  isFormElement,
  isInputElement,
  isSelectElement,
  isTextAreaElement,
  isTextEntryElement,
  parseWciState,
  windowOf,
} from '@webcontextinterface/spec';
import { enforcePolicyForDispatch } from './policy-guard';
import { ActionRequest, ActionResult, DispatchError, SideEffect } from './result';

/** Tuning knobs for a single dispatch. */
export interface DispatchOptions {
  /** Detect state changes on other nodes caused by this action (default true). */
  collectSideEffects?: boolean;
  /**
   * Stop reporting side effects past this many nodes, so one action on a huge
   * page cannot produce an unbounded result payload (default 64).
   */
  maxSideEffects?: number;
}

const DEFAULT_MAX_SIDE_EFFECTS = 64;

/** Snapshot the current data-wci-state of an element */
function captureState(el: HTMLElement): Record<string, unknown> {
  return parseWciState(el.dataset.wciState);
}

/** Update the data-wci-state attribute on an element */
function patchState(el: HTMLElement, patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...captureState(el), ...patch };
  el.dataset.wciState = JSON.stringify(next);
  return next;
}

/**
 * Raw `data-wci-state` strings keyed by node id.
 *
 * Storing the unparsed attribute keeps the pre-action snapshot at one string
 * read per node; comparison is then a single string compare rather than a
 * parse plus a per-key `JSON.stringify` on both sides.
 */
type StateSnapshot = Map<string, string>;

function snapshotStates(root: Element): StateSnapshot {
  const snapshot: StateSnapshot = new Map();
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-wci-id]'))) {
    snapshot.set(el.dataset.wciId!, el.dataset.wciState ?? '');
  }
  return snapshot;
}

function collectSideEffects(
  before: StateSnapshot,
  root: Element,
  excludeNodeId: string,
  limit: number,
): SideEffect[] {
  const effects: SideEffect[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-wci-id]'))) {
    if (effects.length >= limit) break;
    const id = el.dataset.wciId!;
    if (id === excludeNodeId) continue;

    const curr = el.dataset.wciState ?? '';
    const prev = before.get(id);

    // `prev === undefined` means the node appeared as a result of the action;
    // report its initial state so the agent learns the node now exists.
    if (prev === undefined || prev !== curr) {
      effects.push({ nodeId: id, change: captureState(el) });
    }
  }
  return effects;
}

/**
 * Fire a DOM event built from the target's own realm.
 *
 * `new Event(...)` resolves against globalThis, which does not exist under
 * jsdom-in-Node and is the wrong realm for an element inside an iframe.
 */
function fireEvent(target: Element, type: string, detail?: unknown): void {
  const view = windowOf(target);
  if (!view) return;
  const event = detail === undefined
    ? new view.Event(type, { bubbles: true })
    : new view.CustomEvent(type, { bubbles: true, detail });
  target.dispatchEvent(event);
}

/** Best-effort navigation that degrades to a no-op where it is unavailable. */
function navigateTo(target: Element, href: string): void {
  // jsdom and sandboxed frames throw on cross-document navigation; the action
  // still succeeded from the agent's point of view, so swallow the failure.
  const view = windowOf(target);
  if (!view) return;
  try {
    view.location.assign(href);
  } catch {
    try { view.location.href = href; } catch { /* navigation unavailable */ }
  }
}

/**
 * Attach a File array to an input's `files` property.
 *
 * `DataTransfer` is the only spec-blessed way to build a FileList, and it is
 * what real browsers need for the files to survive form submission. It is
 * absent in jsdom and other headless DOMs, so those fall back to shadowing
 * the prototype accessor with a FileList-shaped object — enough for
 * annotation-driven tests and server-side rendering checks.
 */
function assignFiles(target: HTMLInputElement, files: File[]): void {
  const DT = windowOf(target)?.DataTransfer;
  if (typeof DT === 'function') {
    try {
      const dt = new DT();
      for (const f of files) dt.items.add(f);
      target.files = dt.files;
      return;
    } catch { /* fall through to the shim below */ }
  }

  const shim = {
    length: files.length,
    item: (i: number): File | null => files[i] ?? null,
    [Symbol.iterator]: () => files[Symbol.iterator](),
  } as unknown as FileList;
  files.forEach((f, i) => { (shim as unknown as Record<number, File>)[i] = f; });

  Object.defineProperty(target, 'files', {
    value: shim, configurable: true, writable: true,
  });
}

/** Attach files to a file input without requiring a real user gesture. */
function applyUpload(target: HTMLInputElement, value: ActionRequest['value']): string[] {
  const FileCtor = windowOf(target)?.File;
  if (typeof FileCtor !== 'function') {
    throw new DispatchError(
      'ACTION_NOT_SUPPORTED',
      'File upload requires File support in this environment.',
      'Run in a browser or a DOM environment that implements the File API.',
    );
  }

  const specs = Array.isArray(value) ? value : [value];
  const files: File[] = [];

  for (const spec of specs) {
    if (spec instanceof FileCtor) {
      files.push(spec as File);
      continue;
    }
    if (spec && typeof spec === 'object' && 'name' in spec) {
      const f = spec as { name: string; content?: string; type?: string };
      files.push(new FileCtor([f.content ?? ''], f.name, { type: f.type ?? 'text/plain' }));
      continue;
    }
    throw new DispatchError(
      'VALIDATION_FAILED',
      'Upload value must be a File, or { name, content?, type? }, or an array of them.',
      'Pass { name, content } objects when running outside a browser.',
    );
  }

  assignFiles(target, files);
  fireEvent(target, 'input');
  fireEvent(target, 'change');
  return files.map(f => f.name);
}

export async function dispatchAction(
  req: ActionRequest,
  root: Element = document.body,
  policy?: PolicyEngine,
  options: DispatchOptions = {},
): Promise<ActionResult> {
  const timestamp = new Date().toISOString();
  const target = findWciElement(root, req.nodeId);

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

  // Check precondition — block if precondition is declared and the element
  // signals it is unmet via disabled or aria-disabled.
  const precondition = target.dataset.wciPrecondition;
  if (precondition && (
    target.hasAttribute('disabled') ||
    target.getAttribute('aria-disabled') === 'true'
  )) {
    return {
      success: false, nodeId: req.nodeId, action: req.action, timestamp,
      error: {
        code: 'PRECONDITION_UNMET',
        message: `Precondition not met for "${req.nodeId}": ${precondition}`,
        hint: 'Satisfy the listed precondition before dispatching this action.',
      },
    };
  }

  const wantSideEffects = options.collectSideEffects ?? true;
  const before = wantSideEffects ? snapshotStates(root) : null;
  const stateBefore = captureState(target);

  try {
    let stateAfter: Record<string, unknown> = { ...stateBefore };

    switch (req.action) {
      case 'click': {
        target.click();
        if (isCheckableElement(target)) {
          stateAfter = patchState(target, { checked: target.checked });
        } else {
          stateAfter = patchState(target, { clicked: true });
        }
        break;
      }

      case 'fill': {
        if (!isTextEntryElement(target)) {
          throw new DispatchError(
            'ACTION_NOT_SUPPORTED',
            `Node "${req.nodeId}" does not support "fill".`,
            'Only <input> and <textarea> accept "fill".',
          );
        }
        // Use the correct native setter for the element type
        const view = windowOf(target);
        const proto = isTextAreaElement(target)
          ? view?.HTMLTextAreaElement?.prototype
          : view?.HTMLInputElement?.prototype;
        const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        nativeValueSetter?.call(target, String(req.value ?? ''));
        fireEvent(target, 'input');
        fireEvent(target, 'change');
        stateAfter = patchState(target, { value: req.value });
        break;
      }

      case 'select': {
        if (!isSelectElement(target)) {
          throw new DispatchError(
            'ACTION_NOT_SUPPORTED',
            `Node "${req.nodeId}" does not support "select".`,
            'Only <select> accepts "select"; use "fill" or "check" instead.',
          );
        }
        const wanted = String(req.value ?? '');
        const hasOption = Array.from(target.options).some(o => o.value === wanted);
        if (!hasOption) {
          throw new DispatchError(
            'VALIDATION_FAILED',
            `Option "${wanted}" is not available on "${req.nodeId}". ` +
            `Valid options: ${Array.from(target.options).map(o => o.value).join(', ') || '(none)'}.`,
            'Choose one of the listed option values.',
          );
        }
        target.value = wanted;
        fireEvent(target, 'change');
        stateAfter = patchState(target, { value: wanted });
        break;
      }

      case 'check': {
        if (!isInputElement(target)) {
          throw new DispatchError(
            'ACTION_NOT_SUPPORTED',
            `Node "${req.nodeId}" does not support "check".`,
            'Only <input type="checkbox"> and <input type="radio"> accept "check".',
          );
        }
        target.checked = Boolean(req.value ?? true);
        fireEvent(target, 'change');
        stateAfter = patchState(target, { checked: target.checked });
        break;
      }

      case 'focus': {
        target.focus();
        stateAfter = patchState(target, { focused: true });
        break;
      }

      case 'clear': {
        if (isTextEntryElement(target)) {
          target.value = '';
          fireEvent(target, 'input');
          fireEvent(target, 'change');
        }
        stateAfter = patchState(target, { value: '' });
        break;
      }

      case 'submit': {
        const form = isFormElement(target) ? target : target.closest('form');
        if (!form) {
          throw new DispatchError(
            'ACTION_NOT_SUPPORTED',
            `No form ancestor found for "${req.nodeId}".`,
            'Target a node inside a <form>, or dispatch "click" on the submit button.',
          );
        }
        // requestSubmit is absent in some embedded engines; submit() is the fallback.
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
        stateAfter = patchState(target, { submitted: true });
        break;
      }

      case 'navigate': {
        const href = target.getAttribute('href') ?? String(req.value ?? '');
        if (!href) {
          throw new DispatchError(
            'VALIDATION_FAILED',
            `Cannot navigate: no href on "${req.nodeId}".`,
            'Supply a destination via the request value, or add an href attribute.',
          );
        }
        navigateTo(target, href);
        stateAfter = patchState(target, { navigating: href });
        break;
      }

      case 'upload': {
        if (!isFileInputElement(target)) {
          throw new DispatchError(
            'ACTION_NOT_SUPPORTED',
            `Node "${req.nodeId}" is not a file input; "upload" is unsupported.`,
            'Target an <input type="file"> node.',
          );
        }
        const names = applyUpload(target, req.value);
        stateAfter = patchState(target, { files: names });
        break;
      }

      default: {
        throw new DispatchError(
          'ACTION_NOT_SUPPORTED',
          `Unknown action "${req.action}" on node "${req.nodeId}". ` +
          `Supported actions: click, fill, select, check, upload, focus, clear, submit, navigate.`,
          'Use one of the listed action verbs.',
        );
      }
    }

    // Emit custom wci event
    const emitName = target.dataset.wciEmit;
    if (emitName) {
      fireEvent(target, emitName, {
        nodeId: req.nodeId, action: req.action, value: req.value, stateAfter,
      });
    }

    // Also emit the generic state-change bus event. It bubbles from the target,
    // so document-level listeners still receive it without this module needing
    // a reference to a global `document`.
    fireEvent(target, 'wci:state-change', {
      nodeId: req.nodeId, action: req.action, stateAfter,
    });

    // Wait one microtask for React/Vue reactive state to flush
    await Promise.resolve();

    const sideEffects = before
      ? collectSideEffects(
          before,
          root,
          req.nodeId,
          options.maxSideEffects ?? DEFAULT_MAX_SIDE_EFFECTS,
        )
      : [];

    // Record the action for rate-limit tracking
    if (policy) policy.recordAction();

    return {
      success: true, nodeId: req.nodeId, action: req.action,
      value: req.value, timestamp,
      stateChange: { before: stateBefore, after: stateAfter },
      sideEffects: sideEffects.length ? sideEffects : undefined,
    };

  } catch (err) {
    return {
      success: false, nodeId: req.nodeId, action: req.action, timestamp,
      error: err instanceof DispatchError
        ? { code: err.code, message: err.message, hint: err.hint }
        : {
            code: 'UNKNOWN_ERROR',
            message: err instanceof Error ? err.message : String(err),
            hint: 'Check that the action is supported for this element type.',
          },
    };
  }
}
