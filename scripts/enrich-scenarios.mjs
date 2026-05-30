#!/usr/bin/env node
/**
 * Agentic enrichment: expand benchmark scenarios into more realistic UIs via OpenRouter.
 * Preserves ground-truth selectors; rebuilds annotated.html; optional repair loop.
 *
 *   node scripts/enrich-scenarios.mjs --dry-run --limit=3
 *   node scripts/enrich-scenarios.mjs --depth=medium --scenarios=job-board,banking
 *   node scripts/enrich-scenarios.mjs --legacy --depth=light
 *
 * Env: OPENROUTER_API_KEY, optional SCENARIO_ENRICH_MODEL (default openai/gpt-5.4-mini)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chatCompletion, DEFAULT_ENRICH_MODEL } from './lib/scenario-enrich-openrouter.mjs';
import { buildEnrichMessages, DEPTH_LEVELS } from './lib/scenario-enrich-prompt.mjs';
import {
  extractHtmlFromModel,
  validateEnrichedHtml,
} from './lib/scenario-enrich-validate.mjs';
import {
  countDomNodes,
  rebuildAnnotated,
  writeScenarioHtml,
} from './lib/scenario-enrich-annotate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(ROOT, 'demo/scenarios');
const MANIFEST_PATH = path.join(SCENARIOS_DIR, 'manifest.json');

const LEGACY_IDS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
]);

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag) => argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);

  const scenarios = get('--scenarios')?.split(',').filter(Boolean);
  const limit = get('--limit') ? Number(get('--limit')) : undefined;
  const depth = get('--depth') ?? 'medium';
  const model = get('--model') ?? DEFAULT_ENRICH_MODEL;
  const maxAttempts = Number(get('--attempts') ?? 3);
  const dryRun = argv.includes('--dry-run');
  const includeLegacy = argv.includes('--legacy');
  const skipLegacy = argv.includes('--no-legacy') || !includeLegacy;

  if (!DEPTH_LEVELS.includes(depth)) {
    throw new Error(`--depth must be one of: ${DEPTH_LEVELS.join(', ')}`);
  }

  return { scenarios, limit, depth, model, maxAttempts, dryRun, skipLegacy };
}

function loadManifestIds() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return manifest.scenarios ?? [];
}

function selectIds({ scenarios, limit, skipLegacy }) {
  let ids = scenarios?.length ? scenarios : loadManifestIds();
  if (skipLegacy) ids = ids.filter((id) => !LEGACY_IDS.has(id));
  if (limit != null && limit > 0) ids = ids.slice(0, limit);
  return ids;
}

async function enrichOne(id, opts) {
  const dir = path.join(SCENARIOS_DIR, id);
  const metaPath = path.join(dir, 'meta.json');
  const rawPath = path.join(dir, 'raw.html');
  const annPath = path.join(dir, 'annotated.html');

  if (!fs.existsSync(metaPath) || !fs.existsSync(rawPath)) {
    return { id, status: 'skip', reason: 'missing files' };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const rawBefore = fs.readFileSync(rawPath, 'utf8');
  const annBefore = fs.existsSync(annPath) ? fs.readFileSync(annPath, 'utf8') : rawBefore;
  const nodesBefore = countDomNodes(rawBefore);
  const isLegacy = LEGACY_IDS.has(id);

  const pre = validateEnrichedHtml(rawBefore, meta, { legacy: isLegacy });
  if (!pre.ok) {
    return { id, status: 'skip', reason: `baseline invalid: ${pre.errors.join('; ')}` };
  }

  if (opts.dryRun) {
    return { id, status: 'dry-run', nodesBefore, model: opts.model };
  }

  let errors = [];
  let lastHtml = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const messages = buildEnrichMessages({
      meta,
      rawHtml: rawBefore,
      depth: opts.depth,
      errors: attempt > 1 ? errors : [],
    });

    const { content, usage } = await chatCompletion(messages, {
      model: opts.model,
      maxTokens: isLegacy ? 20_000 : 14_000,
    });

    const candidate = extractHtmlFromModel(content);
    const validation = validateEnrichedHtml(candidate, meta, { legacy: isLegacy });

    if (validation.ok) {
      lastHtml = candidate;
      const nodesAfter = countDomNodes(candidate);
      let annotated;
      try {
        annotated = rebuildAnnotated(id, candidate, meta, annBefore);
      } catch (e) {
        errors = [`annotation rebuild: ${e.message}`];
        continue;
      }

      writeScenarioHtml(dir, candidate, annotated, id);

      return {
        id,
        status: 'ok',
        attempt,
        nodesBefore,
        nodesAfter,
        delta: nodesAfter - nodesBefore,
        warnings: validation.warnings,
        usage,
      };
    }

    errors = validation.errors;
    console.warn(`  ↻ ${id} attempt ${attempt}/${opts.maxAttempts}: ${errors.join('; ')}`);
  }

  return { id, status: 'fail', errors, nodesBefore };
}

async function main() {
  const opts = parseArgs();
  const ids = selectIds(opts);

  if (ids.length === 0) {
    console.log('No scenarios selected.');
    process.exit(0);
  }

  console.log(
    `Enriching ${ids.length} scenario(s) · depth=${opts.depth} · model=${opts.model}${opts.dryRun ? ' · dry-run' : ''}`
  );
  if (opts.skipLegacy) {
    console.log('(Legacy 5 skipped — pass --legacy to include them)');
  }

  const results = [];
  for (const id of ids) {
    process.stdout.write(`${id} … `);
    try {
      const r = await enrichOne(id, opts);
      results.push(r);
      if (r.status === 'ok') {
        console.log(`✓ +${r.delta} nodes (attempt ${r.attempt})`);
      } else if (r.status === 'dry-run') {
        console.log(`dry-run (${r.nodesBefore} nodes)`);
      } else {
        console.log(`✗ ${r.reason ?? r.errors?.join('; ') ?? r.status}`);
      }
    } catch (e) {
      results.push({ id, status: 'error', message: String(e) });
      console.log(`✗ ${e.message}`);
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  console.log(`\nDone: ${ok}/${ids.length} enriched`);
  if (ok > 0 && !opts.dryRun) {
    console.log('Run: npm run eval:verify  # re-check Playwright ground truth');
  }

  const logPath = path.join(SCENARIOS_DIR, 'enrich-log.json');
  fs.writeFileSync(
    logPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), opts, results }, null, 2) + '\n',
    'utf8'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
