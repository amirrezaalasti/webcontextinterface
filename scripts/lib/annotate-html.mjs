/**
 * Overlay data-agent-* attributes on raw HTML (same DOM tree).
 */
import { JSDOM } from 'jsdom';

const AGENT_ATTR_PREFIX = 'data-agent-';

/**
 * @typedef {Object} AnnotTarget
 * @property {string} selector
 * @property {string} wciId
 * @property {string} desc
 * @property {'landmark'|'action'|'form'|'display'|'nav'|'status'} [role]
 * @property {string} [action]
 * @property {Record<string, unknown>} [state]
 * @property {string} [scope]
 * @property {number} [priority]
 */

/**
 * @typedef {Object} AnnotationPlan
 * @property {AnnotTarget} pageLandmark
 * @property {AnnotTarget} primary
 * @property {AnnotTarget[]} [decoys]
 * @property {AnnotTarget[]} [landmarks]
 */

/** Collect data-agent-* attributes from an element */
export function collectAgentAttrs(el) {
  const attrs = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith(AGENT_ATTR_PREFIX)) {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

/**
 * Parse a stub annotated.html (ghost nodes) into { nodeId, attrs } specs.
 */
export function extractAnnotationSpecs(stubHtml) {
  const doc = new JSDOM(stubHtml).window.document;
  const specs = [];
  doc.querySelectorAll('[data-agent-id]').forEach((el) => {
    const nodeId = el.getAttribute('data-agent-id');
    if (!nodeId) return;
    specs.push({ nodeId, attrs: collectAgentAttrs(el) });
  });
  return specs;
}

/**
 * Apply annotation specs to raw HTML via CSS selectors keyed by nodeId.
 */
export function injectAnnotations(rawHtml, specs, selectorByNodeId, opts = {}) {
  const dom = new JSDOM(rawHtml);
  const doc = dom.window.document;
  const missing = [];

  for (const { nodeId, attrs } of specs) {
    const selector = selectorByNodeId[nodeId];
    if (!selector) {
      missing.push(`${nodeId}: no selector`);
      continue;
    }
    const el = doc.querySelector(selector);
    if (!el) {
      missing.push(`${nodeId}: ${selector}`);
      continue;
    }
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  }

  if (missing.length) {
    const label = opts.scenarioId ? ` (${opts.scenarioId})` : '';
    throw new Error(`Annotation injection failed${label}:\n  ${missing.join('\n  ')}`);
  }

  return dom.serialize();
}

/**
 * Apply targets that already include selector + attrs.
 */
export function injectAnnotationTargets(rawHtml, targets, opts = {}) {
  const dom = new JSDOM(rawHtml);
  const doc = dom.window.document;
  const missing = [];

  for (const { selector, attrs } of targets) {
    const el = doc.querySelector(selector);
    if (!el) {
      missing.push(selector);
      continue;
    }
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  }

  if (missing.length) {
    const label = opts.scenarioId ? ` (${opts.scenarioId})` : '';
    throw new Error(`Annotation injection failed${label}:\n  ${missing.join('\n  ')}`);
  }

  return dom.serialize();
}

/**
 * @param {string} rawHtml
 * @param {AnnotationPlan} plan
 * @returns {string}
 */
export function buildAnnotatedFromRaw(rawHtml, plan) {
  const dom = new JSDOM(rawHtml);
  const doc = dom.window.document;

  const apply = (target, defaults) => {
    const el = doc.querySelector(target.selector);
    if (!el) {
      throw new Error(`Annotation target not found: ${target.selector} (${target.wciId})`);
    }
    const role = target.role ?? defaults.role;
    el.setAttribute('data-agent-role', role);
    el.setAttribute('data-agent-id', target.wciId);
    el.setAttribute('data-agent-desc', target.desc);
    if (target.action) el.setAttribute('data-agent-action', target.action);
    if (target.state) el.setAttribute('data-agent-state', JSON.stringify(target.state));
    if (target.scope) el.setAttribute('data-agent-scope', target.scope);
    el.setAttribute('data-agent-priority', String(target.priority ?? defaults.priority));
  };

  apply(plan.pageLandmark, { role: 'landmark', priority: 2 });
  apply(plan.primary, { role: 'action', priority: 1 });
  if (!plan.primary.action) {
    const el = doc.querySelector(plan.primary.selector);
    el?.setAttribute('data-agent-action', 'click');
    el?.setAttribute('data-agent-state', JSON.stringify(plan.primary.state ?? { ready: true }));
  }

  for (const d of plan.decoys ?? []) {
    apply(d, { role: 'action', priority: 5 });
    const el = doc.querySelector(d.selector);
    el?.setAttribute('data-agent-action', d.action ?? 'click');
  }

  for (const lm of plan.landmarks ?? []) {
    apply(lm, { role: 'landmark', priority: lm.priority ?? 3 });
  }

  return dom.serialize();
}

/** True when annotated preserves the same DOM element count as raw. */
export function sameDomSkeleton(rawHtml, annotatedHtml) {
  const rawDoc = new JSDOM(rawHtml).window.document;
  const annDoc = new JSDOM(annotatedHtml).window.document;
  const rawRoot = rawDoc.body?.firstElementChild;
  const annRoot = annDoc.body?.firstElementChild;
  if (!rawRoot || !annRoot) return false;
  if (rawRoot.tagName !== annRoot.tagName) return false;
  if (rawRoot.id && annRoot.id !== rawRoot.id) return false;
  const rawPage = rawRoot.getAttribute('data-page');
  if (rawPage && annRoot.getAttribute('data-page') !== rawPage) return false;
  const rawClass = rawRoot.getAttribute('class');
  if (rawClass && annRoot.getAttribute('class') !== rawClass) return false;
  return rawDoc.querySelectorAll('*').length === annDoc.querySelectorAll('*').length;
}
