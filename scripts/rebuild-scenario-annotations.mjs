#!/usr/bin/env node
/**
 * Rebuild annotated.html for generated (non-legacy) scenarios from raw + meta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rebuildAnnotated } from './lib/scenario-enrich-annotate.mjs';
import { sameDomSkeleton } from './lib/annotate-html.mjs';
import { refreshBenchmarkAnnotationArtifacts } from './lib/wci-annotation-stats.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(__dirname, '../demo/scenarios');
const MANIFEST_PATH = path.join(SCENARIOS_DIR, 'manifest.json');

const LEGACY_IDS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
]);

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const ids = (manifest.scenarios ?? []).filter((id) => !LEGACY_IDS.has(id));
  let ok = 0;
  let fail = 0;

  for (const id of ids) {
    const dir = path.join(SCENARIOS_DIR, id);
    const metaPath = path.join(dir, 'meta.json');
    const rawPath = path.join(dir, 'raw.html');
    const annPath = path.join(dir, 'annotated.html');
    if (!fs.existsSync(metaPath) || !fs.existsSync(rawPath)) {
      console.log(`  skip ${id}: missing meta or raw`);
      continue;
    }
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const rawHtml = fs.readFileSync(rawPath, 'utf8');
      const previous = fs.existsSync(annPath) ? fs.readFileSync(annPath, 'utf8') : rawHtml;
      const annotated = rebuildAnnotated(id, rawHtml, meta, previous);
      if (!sameDomSkeleton(rawHtml, annotated)) {
        throw new Error('DOM skeleton mismatch after annotation');
      }
      fs.writeFileSync(annPath, annotated, 'utf8');
      console.log(`  ✅ ${id}`);
      ok++;
    } catch (e) {
      console.log(`  ❌ ${id}: ${e instanceof Error ? e.message : e}`);
      fail++;
    }
  }

  if (ok > 0) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const info = refreshBenchmarkAnnotationArtifacts(
      SCENARIOS_DIR,
      manifest.scenarios ?? [],
      fs,
      path
    );
    console.log(
      `Updated benchmark-info.json (~${info.suite.wciAttributes.median} labels on ~${info.suite.wciNodes.median} pieces per site, median)`
    );
  }

  console.log(`\nRebuilt ${ok} scenarios${fail ? `, ${fail} failed` : ''}.`);
  process.exit(fail ? 1 : 0);
}

main();
