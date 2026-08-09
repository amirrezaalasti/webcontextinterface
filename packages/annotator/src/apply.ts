// ─────────────────────────────────────────────────────────────────────────────
// WCI Annotator — write inferred annotations back into a document
// ─────────────────────────────────────────────────────────────────────────────

import type { WciNodeSpec, WciView } from '@webcontextinterface/spec';
import { inferAnnotations, type InferenceReport, type InferOptions } from './infer';

export interface ApplyOptions extends InferOptions {
  /**
   * Skip nodes below this confidence (0–1, default 0).
   *
   * Raising it trades coverage for precision — useful when the output is a
   * starting point a developer will edit rather than something an agent
   * consumes directly.
   */
  minConfidence?: number;
  /** Leave existing data-wci-* attributes untouched (default true). */
  preserveExisting?: boolean;
}

export interface ApplyResult {
  report: InferenceReport;
  /** Elements that received attributes. */
  annotated: number;
  /** Elements skipped because they were already annotated. */
  preserved: number;
  /** Elements skipped for falling below `minConfidence`. */
  belowThreshold: number;
}

/**
 * Write inferred `data-wci-*` attributes onto the live document.
 *
 * Mutates in place so the caller controls serialisation — the CLI writes the
 * result to a file, the eval harness distils straight from the mutated DOM.
 */
export function applyInferredAnnotations(
  root: Document | Element,
  options: ApplyOptions = {},
): ApplyResult {
  const minConfidence = options.minConfidence ?? 0;
  const preserveExisting = options.preserveExisting ?? true;

  const report = inferAnnotations(root, options);
  const searchRoot: ParentNode = 'body' in root
    ? ((root as Document).body ?? (root as Document))
    : (root as Element);

  let annotated = 0;
  let preserved = 0;
  let belowThreshold = 0;

  for (const node of report.nodes) {
    if (node.confidence < minConfidence) { belowThreshold += 1; continue; }

    let el: Element | null = null;
    try {
      el = searchRoot.querySelector(node.selector);
    } catch {
      el = null;
    }
    if (!el) continue;

    if (preserveExisting && (el as HTMLElement).dataset.wciId) { preserved += 1; continue; }

    const ds = (el as HTMLElement).dataset;
    ds.wciId = node.id;
    ds.wciRole = node.role;
    ds.wciDesc = node.desc;
    if (node.action) ds.wciAction = node.action;
    if (Object.keys(node.state).length > 0) ds.wciState = JSON.stringify(node.state);
    if (node.required) ds.wciRequired = 'true';
    if (node.options?.length) ds.wciOptions = JSON.stringify(node.options);
    if (node.scope) ds.wciScope = node.scope;
    if (node.priority !== undefined) ds.wciPriority = String(node.priority);

    annotated += 1;
  }

  return { report, annotated, preserved, belowThreshold };
}

/**
 * Build a distilled view directly from inference, skipping the DOM round trip.
 *
 * This is what an agent uses on a site that never adopted WCI: the same view
 * shape the distiller produces from real annotations, so every downstream
 * consumer works unchanged.
 */
export function inferView(
  root: Document | Element,
  options: ApplyOptions = {},
): WciView {
  const minConfidence = options.minConfidence ?? 0;
  const report = inferAnnotations(root, options);

  const nodes: WciNodeSpec[] = report.nodes
    .filter(n => n.confidence >= minConfidence)
    .map(({ confidence: _c, evidence: _e, selector: _s, ...node }) => node);

  return {
    wci_version: '1.0',
    page_title: report.pageTitle,
    distilled_at: new Date().toISOString(),
    node_count: nodes.length,
    nodes,
  };
}
