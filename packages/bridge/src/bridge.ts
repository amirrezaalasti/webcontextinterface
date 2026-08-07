// ─────────────────────────────────────────────────────────────────────────────
// WCI Bridge — WciBridge class
// ─────────────────────────────────────────────────────────────────────────────

import type { PolicyEngine } from '@webcontextinterface/context';
import type { ActionRequest, ActionResult, ActionValue, UploadFileSpec } from './result';
import { dispatchAction, type DispatchOptions } from './dispatcher';

export type StateChangeHandler = (payload: {
  nodeId: string;
  action: string;
  stateAfter: Record<string, unknown>;
}) => void;

/** Called after a dispatch completes and its result has been recorded. */
export type ResultHandler = (result: ActionResult, history: readonly ActionResult[]) => void;

export interface WciBridgeOptions extends DispatchOptions {
  /** When set, wci.txt rules are enforced before every dispatch (scope, auth, human confirm). */
  policy?: PolicyEngine;
  /**
   * Cap on retained ActionResults (default 500). Long-running agent sessions
   * would otherwise grow the history array without bound.
   */
  maxHistory?: number;
}

const DEFAULT_MAX_HISTORY = 500;

export class WciBridge {
  private root: Element;
  private history: ActionResult[] = [];
  private stateChangeHandlers = new Set<StateChangeHandler>();
  private resultHandlers = new Set<ResultHandler>();
  private policy?: PolicyEngine;
  private readonly maxHistory: number;
  private readonly dispatchOptions: DispatchOptions;
  private readonly onDocumentStateChange: EventListener;
  private disposed = false;

  constructor(root: Element = document.body, options: WciBridgeOptions = {}) {
    this.root = root;
    this.policy = options.policy;
    this.maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
    this.dispatchOptions = {
      collectSideEffects: options.collectSideEffects,
      maxSideEffects: options.maxSideEffects,
    };

    // Subscribe to wci:state-change events from the DOM. The reference is
    // retained so destroy() can detach it — without that, every bridge ever
    // constructed stays reachable from the document for the page's lifetime.
    this.onDocumentStateChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      for (const handler of this.stateChangeHandlers) handler(detail);
    };
    document.addEventListener('wci:state-change', this.onDocumentStateChange);
  }

  /** Attach or replace the site PolicyEngine (e.g. from WciContextLoader). */
  setPolicy(policy: PolicyEngine | undefined): void {
    this.policy = policy;
  }

  getPolicy(): PolicyEngine | undefined {
    return this.policy;
  }

  /** Retarget the bridge at a different subtree (e.g. after a route change). */
  setRoot(root: Element): void {
    this.root = root;
  }

  getRoot(): Element {
    return this.root;
  }

  /** Dispatch an action and return a typed ActionResult */
  async dispatch(req: ActionRequest): Promise<ActionResult> {
    if (this.disposed) {
      return {
        success: false,
        nodeId: req.nodeId,
        action: req.action,
        timestamp: new Date().toISOString(),
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'This WciBridge has been destroyed and can no longer dispatch.',
          hint: 'Construct a new WciBridge for the current document.',
        },
      };
    }

    const result = await dispatchAction(req, this.root, this.policy, this.dispatchOptions);
    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }

    // Fired here rather than from the DOM event inside dispatchAction: that
    // event is emitted mid-dispatch, before the result exists, so a subscriber
    // reading getHistory() from it would always be one action behind.
    for (const handler of this.resultHandlers) handler(result, this.history);

    return result;
  }

  /** Dispatch a sequence of actions, stopping at the first failure. */
  async dispatchSequence(requests: ActionRequest[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const req of requests) {
      const result = await this.dispatch(req);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }

  /** Convenience: fill a node */
  async fill(nodeId: string, value: string): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'fill', value });
  }

  /** Convenience: click a node */
  async click(nodeId: string): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'click' });
  }

  /** Convenience: check/uncheck a checkbox node */
  async check(nodeId: string, checked = true): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'check', value: checked });
  }

  /** Convenience: select a value in a dropdown node */
  async select(nodeId: string, value: string): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'select', value });
  }

  /** Convenience: submit the form containing a node */
  async submit(nodeId: string): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'submit' });
  }

  /** Convenience: clear an input node */
  async clear(nodeId: string): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'clear' });
  }

  /** Convenience: attach files to a file input node */
  async upload(
    nodeId: string,
    files: UploadFileSpec | UploadFileSpec[] | File | File[],
  ): Promise<ActionResult> {
    return this.dispatch({ nodeId, action: 'upload', value: files as ActionValue });
  }

  /**
   * Subscribe to completed dispatch results, in order, with the history that
   * already includes them. Prefer this over `onStateChange` when you need the
   * ActionResult itself rather than the raw DOM state change.
   */
  onResult(handler: ResultHandler): () => void {
    this.resultHandlers.add(handler);
    return () => {
      this.resultHandlers.delete(handler);
    };
  }

  /** Subscribe to state-change events from any node */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  /** Get the full interaction history of this session */
  getHistory(): ActionResult[] {
    return [...this.history];
  }

  /** Clear the interaction history */
  clearHistory(): void {
    this.history = [];
  }

  /** Detach the document listener and drop handlers. Idempotent. */
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener('wci:state-change', this.onDocumentStateChange);
    this.stateChangeHandlers.clear();
    this.resultHandlers.clear();
    this.history = [];
  }
}

export type {
  ActionRequest,
  ActionResult,
  ActionValue,
  UploadFileSpec,
} from './result';
