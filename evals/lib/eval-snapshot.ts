/**
 * Patches WCI node state for benchmark eval so each scenario is scored at the
 * decisive action (form filled, shipping selected) — matching agentdomSteps finale.
 */
export const EVAL_NODE_STATE_PATCHES: Record<
  string,
  Record<string, Record<string, unknown>>
> = {
  banking: {
    'transfer-amount': { value: '500', valid: true },
    'review-transfer-btn': { disabled: false },
  },
  checkout: {
    'shipping-option': { selected: 'Express (2–3 days, $12.99)' },
    'continue-payment-btn': { disabled: false },
  },
};

export function applyEvalStatePatches(
  scenarioId: string,
  nodes: Array<{ id: string; state?: Record<string, unknown> }>
): void {
  const patches = EVAL_NODE_STATE_PATCHES[scenarioId];
  if (!patches) return;
  for (const node of nodes) {
    const patch = patches[node.id];
    if (patch) {
      node.state = { ...(node.state ?? {}), ...patch };
    }
  }
}
