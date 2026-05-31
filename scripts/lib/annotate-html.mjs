/**
 * Overlay data-wci-* attributes on raw HTML (same DOM tree).
 */
import { JSDOM } from 'jsdom';

const WCI_ATTR_PREFIX = 'data-wci-';

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

/** Collect data-wci-* attributes from an element */
export function collectWciAttrs(el) {
  const attrs = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith(WCI_ATTR_PREFIX)) {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

/** @deprecated use collectWciAttrs */
export const collectAgentAttrs = collectWciAttrs;

/**
 * Parse annotated.html into { nodeId, attrs } specs.
 */
export function extractAnnotationSpecs(stubHtml) {
  const doc = new JSDOM(stubHtml).window.document;
  const specs = [];
  doc.querySelectorAll('[data-wci-id]').forEach((el) => {
    const nodeId = el.getAttribute('data-wci-id');
    if (!nodeId) return;
    specs.push({ nodeId, attrs: collectWciAttrs(el) });
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

function findScopeContainer(el) {
  let node = el.parentElement;
  while (node && node.tagName !== 'BODY') {
    const dataAttrs = [...node.attributes].filter(
      (a) =>
        a.name.startsWith('data-') &&
        !a.name.startsWith('data-wci-') &&
        a.name !== 'data-decoy' &&
        a.name !== 'data-page'
    );
    if (dataAttrs.length >= 1 && /^(ARTICLE|SECTION|TR|LI|DIV)$/i.test(node.tagName)) {
      return {
        el: node,
        state: Object.fromEntries(dataAttrs.map((a) => [a.name.replace(/^data-/, ''), a.value])),
      };
    }
    node = node.parentElement;
  }
  return null;
}

function applyWciTarget(el, target, defaults) {
  const role = target.role ?? defaults.role;
  el.setAttribute('data-wci-role', role);
  el.setAttribute('data-wci-id', target.wciId);
  el.setAttribute('data-wci-desc', target.desc);
  if (target.action) el.setAttribute('data-wci-action', target.action);
  if (target.state) el.setAttribute('data-wci-state', JSON.stringify(target.state));
  if (target.scope) el.setAttribute('data-wci-scope', target.scope);
  el.setAttribute('data-wci-priority', String(target.priority ?? defaults.priority));
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
    applyWciTarget(el, target, defaults);
    return el;
  };

  apply(plan.pageLandmark, { role: 'landmark', priority: 2 });

  const primaryEl = apply(plan.primary, { role: 'action', priority: 1 });
  if (!plan.primary.action) {
    primaryEl.setAttribute('data-wci-action', 'click');
    primaryEl.setAttribute(
      'data-wci-state',
      JSON.stringify(plan.primary.state ?? { ready: true })
    );
  }

  const scopeFromPlan = plan.landmarks?.find((lm) => lm.wciId === plan.primary.scope);
  if (!scopeFromPlan && !plan.primary.scope) {
    const scopeContainer = findScopeContainer(primaryEl);
    if (scopeContainer) {
      const scopeId = `${plan.primary.wciId}-scope`;
      applyWciTarget(scopeContainer.el, {
        wciId: scopeId,
        desc: `Target scope for ${plan.primary.wciId}`,
        state: scopeContainer.state,
        role: 'landmark',
        priority: 2,
      }, { role: 'landmark', priority: 2 });
      primaryEl.setAttribute('data-wci-scope', scopeId);
    }
  } else if (plan.primary.scope) {
    primaryEl.setAttribute('data-wci-scope', plan.primary.scope);
  }

  for (const d of plan.decoys ?? []) {
    apply(d, { role: 'action', priority: 5 });
    const el = doc.querySelector(d.selector);
    el?.setAttribute('data-wci-action', d.action ?? 'click');
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
