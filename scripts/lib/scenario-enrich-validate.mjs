/**
 * Validate enriched raw.html still satisfies benchmark ground truth.
 */
import { JSDOM } from 'jsdom';

const LEGACY_IDS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
]);

/**
 * @param {string} rawHtml
 * @param {object} meta — scenario meta.json
 * @param {{ legacy?: boolean }} [opts]
 * @returns {{ ok: boolean; errors: string[]; warnings: string[] }}
 */
export function validateEnrichedHtml(rawHtml, meta, opts = {}) {
  const errors = [];
  const warnings = [];
  const doc = new JSDOM(rawHtml).window.document;
  const isLegacy = opts.legacy ?? LEGACY_IDS.has(meta.id);

  if (!doc.querySelector('html')) {
    errors.push('Missing <html> root');
  }

  const pageRoot = doc.querySelector(`[data-page="${meta.id}"]`);
  if (!pageRoot && !isLegacy) {
    errors.push(`Missing [data-page="${meta.id}"] on app root`);
  }

  const gt = meta.groundTruth ?? {};
  let anyGroundTruthMatched = false;
  let hadQueryableSelector = false;
  for (const sel of gt.rawSelectors ?? []) {
    try {
      const n = doc.querySelectorAll(sel).length;
      hadQueryableSelector = true;
      if (n > 0) {
        anyGroundTruthMatched = true;
        if (n > 1) warnings.push(`Ground-truth selector matches ${n} nodes: ${sel}`);
      }
    } catch (e) {
      // Legacy selectors may include Playwright-only pseudo selectors (e.g. :has-text()).
      warnings.push(`Skipped non-DOM selector check: ${sel}`);
      continue;
    }
  }
  if (!anyGroundTruthMatched && hadQueryableSelector) {
    errors.push('No queryable ground-truth selector matched any node');
  }

  if (!isLegacy) {
    for (const decoyId of gt.decoyNodeIds ?? []) {
      const sel = `[data-decoy="${decoyId}"]`;
      if (!doc.querySelector(sel)) {
        errors.push(`Decoy missing: ${sel}`);
      }
    }
  }

  const primary = gt.rawSelectors?.[0];
  if (primary) {
    const el = doc.querySelector(primary);
    if (el) {
      const tag = el.tagName.toLowerCase();
      if (!['button', 'a', 'input', 'select', 'textarea', 'label'].includes(tag)) {
        warnings.push(`Primary target is <${tag}> — ensure it remains actionable`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * @param {string} text
 * @returns {string}
 */
export function extractHtmlFromModel(text) {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const htmlStart = text.indexOf('<!DOCTYPE');
  const htmlStart2 = text.indexOf('<html');
  const start = htmlStart >= 0 ? htmlStart : htmlStart2;
  if (start >= 0) return text.slice(start).trim();
  return text.trim();
}
