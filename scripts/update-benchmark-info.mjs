#!/usr/bin/env node
/**
 * Recompute benchmark-info.json and meta.json benchmark counts from annotated.html.
 * Does not regenerate HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { refreshBenchmarkAnnotationArtifacts } from './lib/wci-annotation-stats.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(__dirname, '../demo/scenarios');
const manifest = JSON.parse(
  fs.readFileSync(path.join(SCENARIOS_DIR, 'manifest.json'), 'utf8')
);

const info = refreshBenchmarkAnnotationArtifacts(
  SCENARIOS_DIR,
  manifest.scenarios,
  fs,
  path
);

const labels = info.suite.wciAttributes;
const pieces = info.suite.wciNodes;
const inApp = info.suite.inAppPages;
const dom = info.suite.domElements ?? info.suite.totalElements;
const share = info.suite.wciNodeSharePct;
const handmade = info.byTier.handmade;
const synthetic = info.byTier.synthetic;
console.log(
  `Updated ${manifest.scenarios.length} sites → benchmark-info.json\n` +
    `  In-app pages per website: mean ${inApp.mean} ± ${inApp.stdDev} (median ${inApp.median}; admin-dashboard=${info.scenarios['admin-dashboard'].inAppPages})\n` +
    `  DOM elements per site: mean ${dom.mean} ± ${dom.stdDev} (median ${dom.median})\n` +
    `  WCI nodes: mean ${pieces.mean} ± ${pieces.stdDev} (median ${pieces.median})\n` +
    `  Annotated share: mean ${share.mean}% ± ${share.stdDev}% (median ${share.median}%)\n` +
    `  Labels: median ${labels.median} (mean ${labels.mean} ± ${labels.stdDev})\n` +
    `  Handmade (${handmade.count}): ${handmade.inAppPages.mean} ± ${handmade.inAppPages.stdDev} in-app pages, ${handmade.domElements.mean} ± ${handmade.domElements.stdDev} DOM nodes\n` +
    `  Synthetic (${synthetic.count}): ${synthetic.inAppPages.mean} ± ${synthetic.inAppPages.stdDev} in-app pages, ${synthetic.domElements.mean} ± ${synthetic.domElements.stdDev} DOM nodes`
);
