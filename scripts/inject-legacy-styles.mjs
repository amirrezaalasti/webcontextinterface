#!/usr/bin/env node
/**
 * Inject readable CSS into the five legacy scenario HTML files (raw + annotated).
 *
 *   node scripts/inject-legacy-styles.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  injectLegacyStyles,
  LEGACY_STYLE_IDS,
} from './lib/legacy-scenario-styles.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scenariosDir = join(root, 'demo/scenarios');

for (const id of LEGACY_STYLE_IDS) {
  const dir = join(scenariosDir, id);
  for (const file of ['raw.html', 'annotated.html']) {
    const path = join(dir, file);
    const html = readFileSync(path, 'utf8');
    const next = injectLegacyStyles(html, id);
    if (next !== html) {
      writeFileSync(path, next, 'utf8');
      console.log(`Styled ${id}/${file}`);
    } else {
      console.log(`Unchanged ${id}/${file}`);
    }
  }
}

console.log(`Done — ${LEGACY_STYLE_IDS.length} legacy scenarios`);
