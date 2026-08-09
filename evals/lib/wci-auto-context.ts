/**
 * The `wci-auto` condition — WCI structure without operator curation.
 *
 * This is the matched-information control: it holds the framework fixed and
 * removes the human.
 *
 *   raw-html / dom-outline / candidates   no WCI structure, no curation
 *   wci-auto                              WCI structure, no curation   ← this
 *   wci-grounding                         WCI structure + curation
 *
 * The first gap isolates what the framework contributes on its own; the second
 * isolates what curated annotations add on top.
 *
 * Two design points keep the comparison honest:
 *
 *  1. Nodes are built from `raw.html`, never `annotated.html`. No operator
 *     signal reaches this condition.
 *  2. Node ids are opaque (`a1`, `a2`, …). Curated ids such as `submit-order`
 *     are themselves a semantic hint, so reusing them would smuggle curation
 *     back in through the identifier. Scoring resolves the opaque id to a CSS
 *     selector and validates it in Playwright, exactly as the raw-html
 *     baseline is scored.
 */
import { JSDOM } from 'jsdom';
import { inferAnnotations, type InferredNode } from '../../packages/annotator/src/index';

export interface WciAutoView {
  /** Serialised view handed to the model. */
  json: string;
  /** Opaque node id → CSS selector into raw.html, for scoring. */
  selectorById: Record<string, string>;
  nodeCount: number;
  meanConfidence: number;
}

export interface WciAutoOptions {
  /** Keep only nodes the agent can act on (default true). */
  actionableOnly?: boolean;
  /** Drop inferences below this confidence (default 0.4). */
  minConfidence?: number;
  /** Node ceiling, applied after priority sorting (default 60). */
  maxNodes?: number;
}

function isActionable(node: InferredNode): boolean {
  if (!node.action) return false;
  return node.role === 'action' || node.role === 'form' || node.role === 'nav';
}

/**
 * Build the agent-facing view for a page that was never annotated.
 */
export function buildWciAutoView(rawHtml: string, options: WciAutoOptions = {}): WciAutoView {
  const actionableOnly = options.actionableOnly ?? true;
  const minConfidence = options.minConfidence ?? 0.4;
  const maxNodes = options.maxNodes ?? 60;

  const doc = new JSDOM(rawHtml).window.document;
  const report = inferAnnotations(doc);

  const selected = report.nodes
    .filter(n => n.confidence >= minConfidence)
    .filter(n => (actionableOnly ? isActionable(n) : true))
    .filter(n => n.state?.disabled !== true)
    .slice(0, maxNodes);

  const selectorById: Record<string, string> = {};
  const nodes = selected.map((n, i) => {
    const opaqueId = `a${i + 1}`;
    selectorById[opaqueId] = n.selector;
    return {
      id: opaqueId,
      role: n.role,
      desc: n.desc,
      ...(n.action ? { action: n.action } : {}),
      ...(n.required ? { required: true } : {}),
      ...(n.options ? { options: n.options } : {}),
      ...(n.scope ? { scope: n.scope } : {}),
      state: n.state,
      priority: n.priority,
    };
  });

  const json = JSON.stringify(
    {
      wci_version: '1.0',
      page_title: report.pageTitle,
      view: 'auto',
      node_count: nodes.length,
      grounding_hint:
        'Annotations on this page were derived automatically from HTML and ARIA — ' +
        'no site operator wrote them. Descriptions are terser than a curated site would provide. ' +
        'Reply with one node "id".',
      nodes,
    },
    null,
    2,
  );

  return {
    json,
    selectorById,
    nodeCount: nodes.length,
    meanConfidence: selected.length
      ? Number((selected.reduce((s, n) => s + n.confidence, 0) / selected.length).toFixed(3))
      : 0,
  };
}

/**
 * Resolve a model's predicted opaque id back to a CSS selector.
 *
 * Returns null when the model invented an id, which is scored as a miss rather
 * than silently passed over — hallucinated ids are a real failure mode and
 * should not be hidden by a lenient resolver.
 */
export function resolveAutoNodeId(view: WciAutoView, predicted: string): string | null {
  const cleaned = predicted.trim().replace(/^["'`]|["'`]$/g, '');
  return view.selectorById[cleaned] ?? null;
}
