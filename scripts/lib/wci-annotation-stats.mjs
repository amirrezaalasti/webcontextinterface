/**
 * Count data-wci-* annotations on benchmark annotated.html pages.
 */
import { JSDOM } from 'jsdom';

/** Styling injection marker — not a semantic WCI annotation. */
export const WCI_STYLE_ATTR = 'data-wci-legacy-styles';

/**
 * @typedef {Object} WciAnnotationCounts
 * @property {number} wciNodes Elements with at least one semantic data-wci-* attribute
 * @property {number} wciAttributes Total data-wci-* attribute instances (excludes legacy-styles)
 * @property {number} wciIds Elements with data-wci-id (equals wciNodes in this benchmark)
 * @property {number} totalElements All DOM elements on the page (same tree as raw.html)
 * @property {number} wciNodeSharePct wciNodes as % of totalElements (0–100, one decimal)
 */

/**
 * @param {string} html annotated.html (or any HTML fragment)
 * @returns {WciAnnotationCounts}
 */
export function countWciAnnotations(html) {
  const doc = new JSDOM(html).window.document;
  const allElements = doc.querySelectorAll('*');
  const totalElements = allElements.length;
  let wciNodes = 0;
  let wciAttributes = 0;
  let wciIds = 0;

  allElements.forEach((el) => {
    let hasWci = false;
    for (const attr of el.attributes) {
      if (!attr.name.startsWith('data-wci-') || attr.name === WCI_STYLE_ATTR) continue;
      wciAttributes++;
      hasWci = true;
    }
    if (hasWci) wciNodes++;
    if (el.hasAttribute('data-wci-id')) wciIds++;
  });

  const wciNodeSharePct =
    totalElements > 0
      ? Math.round((wciNodes / totalElements) * 1000) / 10
      : 0;

  return { wciNodes, wciAttributes, wciIds, totalElements, wciNodeSharePct };
}

/** @param {WciAnnotationCounts} counts */
export function enrichBenchmarkMeta(counts) {
  return {
    ...counts,
    attrsPerNode: Math.round((counts.wciAttributes / counts.wciNodes) * 100) / 100,
  };
}

/**
 * @param {number[]} values
 */
export function summarizeCounts(values) {
  if (!values.length) {
    return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, x) => s + x, 0);
  const mean = sum / sorted.length;
  const variance =
    sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    mean: Math.round(mean * 10) / 10,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
  };
}

/** @param {number} value @param {number} mean @param {number} stdDev */
function deltaFromMean(value, mean, stdDev) {
  const delta = value - mean;
  return {
    delta: Math.round(delta * 10) / 10,
    zScore: stdDev > 0 ? Math.round((delta / stdDev) * 100) / 100 : 0,
  };
}

const HANDMADE_IDS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
]);

/**
 * Build suite-level benchmark annotation statistics.
 * @param {Array<{ id: string, wciNodes: number, wciAttributes: number, totalElements: number, wciNodeSharePct: number, legacy?: boolean }>} rows
 */
export function buildBenchmarkInfo(rows) {
  const nodeValues = rows.map((r) => r.wciNodes);
  const attrValues = rows.map((r) => r.wciAttributes);
  const totalValues = rows.map((r) => r.totalElements);
  const shareValues = rows.map((r) => r.wciNodeSharePct);
  const handmade = rows.filter((r) => HANDMADE_IDS.has(r.id) || r.legacy);
  const synthetic = rows.filter((r) => !HANDMADE_IDS.has(r.id) && !r.legacy);

  const suite = {
    wciAttributes: summarizeCounts(attrValues),
    wciNodes: summarizeCounts(nodeValues),
    /** One static HTML page per scenario; count = all DOM nodes on that page. */
    pageElements: summarizeCounts(totalValues),
    totalElements: summarizeCounts(totalValues),
    wciNodeSharePct: summarizeCounts(shareValues),
  };

  const perScenario = Object.fromEntries(
    rows.map((r) => [
      r.id,
      {
        wciNodes: r.wciNodes,
        wciAttributes: r.wciAttributes,
        pageElements: r.totalElements,
        totalElements: r.totalElements,
        wciNodeSharePct: r.wciNodeSharePct,
        vsSuiteMean: {
          pageElements: deltaFromMean(
            r.totalElements,
            suite.pageElements.mean,
            suite.pageElements.stdDev
          ),
          wciNodes: deltaFromMean(r.wciNodes, suite.wciNodes.mean, suite.wciNodes.stdDev),
          wciNodeSharePct: deltaFromMean(
            r.wciNodeSharePct,
            suite.wciNodeSharePct.mean,
            suite.wciNodeSharePct.stdDev
          ),
          wciAttributes: deltaFromMean(
            r.wciAttributes,
            suite.wciAttributes.mean,
            suite.wciAttributes.stdDev
          ),
        },
      },
    ])
  );

  const fmt = (n) => Math.round(n);
  const methodology =
    'Each scenario is one fake website (one annotated.html page). pageElements is every DOM node on that page; wciNodes is how many carry semantic data-wci-* labels (excluding data-wci-legacy-styles). wciNodeSharePct = wciNodes ÷ pageElements. Per-site vsSuiteMean reports delta and z-score from the suite mean. ' +
    `Suite mean ± σ (${rows.length} sites): ~${fmt(suite.wciNodes.mean)} ± ${fmt(suite.wciNodes.stdDev)} WCI nodes per page among ~${fmt(suite.pageElements.mean)} ± ${fmt(suite.pageElements.stdDev)} DOM elements per page (~${fmt(suite.wciNodeSharePct.mean)}% ± ${fmt(suite.wciNodeSharePct.stdDev)}% of the DOM annotated), plus ~${fmt(suite.wciAttributes.mean)} ± ${fmt(suite.wciAttributes.stdDev)} labels on those nodes.`;

  return {
    generatedAt: new Date().toISOString(),
    scenarioCount: rows.length,
    methodology,
    suite,
    byTier: {
      handmade: {
        count: handmade.length,
        pageElements: summarizeCounts(handmade.map((r) => r.totalElements)),
        wciAttributes: summarizeCounts(handmade.map((r) => r.wciAttributes)),
        wciNodes: summarizeCounts(handmade.map((r) => r.wciNodes)),
        wciNodeSharePct: summarizeCounts(handmade.map((r) => r.wciNodeSharePct)),
      },
      synthetic: {
        count: synthetic.length,
        pageElements: summarizeCounts(synthetic.map((r) => r.totalElements)),
        wciAttributes: summarizeCounts(synthetic.map((r) => r.wciAttributes)),
        wciNodes: summarizeCounts(synthetic.map((r) => r.wciNodes)),
        wciNodeSharePct: summarizeCounts(synthetic.map((r) => r.wciNodeSharePct)),
      },
    },
    scenarios: perScenario,
  };
}

/**
 * @param {import('node:fs').PathLike} scenariosDir
 * @param {string[]} scenarioIds
 * @param {import('node:fs')} fs
 * @param {import('node:path')} path
 */
export function refreshBenchmarkAnnotationArtifacts(scenariosDir, scenarioIds, fs, path) {
  const rows = [];
  for (const id of scenarioIds) {
    const annPath = path.join(scenariosDir, id, 'annotated.html');
    const metaPath = path.join(scenariosDir, id, 'meta.json');
    const annotatedHtml = fs.readFileSync(annPath, 'utf8');
    const counts = countWciAnnotations(annotatedHtml);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta.benchmark = enrichBenchmarkMeta(counts);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
    rows.push({
      id,
      wciNodes: counts.wciNodes,
      wciAttributes: counts.wciAttributes,
      totalElements: counts.totalElements,
      wciNodeSharePct: counts.wciNodeSharePct,
      legacy: HANDMADE_IDS.has(id),
    });
  }

  const info = buildBenchmarkInfo(rows);
  fs.writeFileSync(
    path.join(scenariosDir, 'benchmark-info.json'),
    JSON.stringify(info, null, 2) + '\n',
    'utf8'
  );
  return info;
}
