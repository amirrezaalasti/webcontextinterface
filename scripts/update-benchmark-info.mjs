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
const pages = info.suite.pageElements ?? info.suite.totalElements;
const share = info.suite.wciNodeSharePct;
const handmade = info.byTier.handmade;
const synthetic = info.byTier.synthetic;
console.log(
  `Updated ${manifest.scenarios.length} sites → benchmark-info.json\n` +
    `  Pages (DOM elements per website): mean ${pages.mean} ± ${pages.stdDev} (median ${pages.median})\n` +
    `  WCI nodes per page: mean ${pieces.mean} ± ${pieces.stdDev} (median ${pieces.median})\n` +
    `  Annotated share: mean ${share.mean}% ± ${share.stdDev}% (median ${share.median}%)\n` +
    `  Labels: median ${labels.median} (mean ${labels.mean} ± ${labels.stdDev})\n` +
    `  Handmade (${handmade.count}): ${handmade.pageElements.mean} ± ${handmade.pageElements.stdDev} elements, ${handmade.wciNodes.mean} ± ${handmade.wciNodes.stdDev} WCI nodes\n` +
    `  Synthetic (${synthetic.count}): ${synthetic.pageElements.mean} ± ${synthetic.pageElements.stdDev} elements, ${synthetic.wciNodes.mean} ± ${synthetic.wciNodes.stdDev} WCI nodes`
);
