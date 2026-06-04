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
const total = info.suite.totalElements;
const share = info.suite.wciNodeSharePct;
console.log(
  `Updated ${manifest.scenarios.length} sites → benchmark-info.json\n` +
    `  Typical site: ~${pieces.median} WCI nodes / ~${total.median} page elements (~${share.median}% of DOM)\n` +
    `  Labels on those nodes: ~${labels.median} (median)`
);
