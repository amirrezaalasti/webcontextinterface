/**
 * Rebuild annotated.html after raw enrichment.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  buildAnnotatedFromRaw,
  extractAnnotationSpecs,
  injectAnnotations,
} from './annotate-html.mjs';
import { LEGACY_ANNOTATION_SELECTORS } from './legacy-annotation-selectors.mjs';
import { injectLegacyStyles, LEGACY_STYLE_IDS } from './legacy-scenario-styles.mjs';

function slug(id) {
  return id.replace(/-/g, '_');
}

/**
 * @param {object} meta
 * @returns {import('./annotate-html.mjs').AnnotationPlan}
 */
export function planFromMeta(meta) {
  const primarySel = meta.groundTruth?.rawSelectors?.[0];
  if (!primarySel) throw new Error(`No rawSelectors in meta for ${meta.id}`);

  return {
    pageLandmark: {
      selector: `[data-page="${meta.id}"]`,
      wciId: `${slug(meta.id)}-page`,
      desc: `${meta.title} — ${meta.description ?? 'benchmark page'}`,
    },
    primary: {
      selector: primarySel,
      wciId: meta.groundTruth.wciNodeId,
      desc: meta.task?.goal ?? meta.description ?? '',
      action: 'click',
    },
    decoys: (meta.groundTruth.decoyNodeIds ?? []).map((id) => ({
      selector: `[data-decoy="${id}"]`,
      wciId: id,
      desc: `Decoy: ${id}`,
      action: 'click',
    })),
  };
}

/**
 * @param {string} scenarioId
 * @param {string} rawHtml
 * @param {object} meta
 * @param {string} previousAnnotated
 * @returns {string}
 */
export function rebuildAnnotated(scenarioId, rawHtml, meta, previousAnnotated) {
  if (LEGACY_ANNOTATION_SELECTORS[scenarioId]) {
    const specs = extractAnnotationSpecs(previousAnnotated);
    const selectorByNodeId = LEGACY_ANNOTATION_SELECTORS[scenarioId];
    return injectAnnotations(rawHtml, specs, selectorByNodeId, { scenarioId });
  }

  const plan = planFromMeta(meta);
  return buildAnnotatedFromRaw(rawHtml, plan);
}

/**
 * @param {string} dir
 * @param {string} rawHtml
 * @param {string} annotatedHtml
 * @param {string} scenarioId
 */
export function writeScenarioHtml(dir, rawHtml, annotatedHtml, scenarioId) {
  let raw = rawHtml;
  let ann = annotatedHtml;
  if (LEGACY_STYLE_IDS.includes(scenarioId)) {
    raw = injectLegacyStyles(raw, scenarioId);
    ann = injectLegacyStyles(ann, scenarioId);
  }
  fs.writeFileSync(`${dir}/raw.html`, raw, 'utf8');
  fs.writeFileSync(`${dir}/annotated.html`, ann, 'utf8');
}

/** @param {string} html */
export function countDomNodes(html) {
  return new JSDOM(html).window.document.querySelectorAll('*').length;
}
