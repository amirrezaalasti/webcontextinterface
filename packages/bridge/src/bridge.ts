// ─────────────────────────────────────────────────────────────────────────────
// WCI Bridge — WciBridge class
// ─────────────────────────────────────────────────────────────────────────────

import type { ActionRequest, ActionResult } from './result';
import { dispatchAction } from './dispatcher';

export type StateChangeHandler = (payload: {
  nodeId: string;
  action: string;
  stateAfter: Record<string, unknown>;
}) => void;

export class WciBridge {
  private root: Element;
  private history: ActionResult[] = [];
  private stateChangeHandlers: StateChangeHandler[] = [];

  constructor(root: Element = document.body) {
    this.root = root;

    // Subscribe to wci:state-change events from the DOM
    document.addEventListener('wci:state-change', ((e: CustomEvent) => {
      for (const handler of this.stateChangeHandlers) handler(e.detail);
    }) as EventListener);
  }

  /** Dispatch an action and return a typed ActionResult */
  async dispatch(req: ActionRequest): Promise<ActionResult> {
    const result = await dispatchAction(req, this.root);
    this.history.push(result);
    return result;
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

  /** Subscribe to state-change events from any node */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.push(handler);
    return () => {
      this.stateChangeHandlers = this.stateChangeHandlers.filter(h => h !== handler);
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
}

export type { ActionRequest, ActionResult } from './result';
