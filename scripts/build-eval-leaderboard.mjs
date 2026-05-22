#!/usr/bin/env node
/**
 * Merge per-model eval-results-*.json snapshots into demo/public/eval-results-all.json
 * for the multi-model website leaderboard.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'demo/public');

const SKIP_KEYS = new Set(['generatedAt', 'modelOrder']);

function loadSnapshot(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const modelId = data.modelOrder?.[0]?.id ?? Object.keys(data).find((k) => !SKIP_KEYS.has(k));
  if (!modelId || !data[modelId]?.standard) return null;
  return {
    modelId,
    meta: data.modelOrder?.[0] ?? {
      id: modelId,
      name: modelId,
      openRouterModel: modelId,
    },
    stats: data[modelId],
    generatedAt: data.generatedAt,
  };
}

const entries = [];
const seen = new Set();

for (const file of readdirSync(publicDir).sort()) {
  if (!file.startsWith('eval-results') || !file.endsWith('.json')) continue;
  if (file === 'eval-results-all.json') continue;

  const snap = loadSnapshot(join(publicDir, file));
  if (!snap || seen.has(snap.modelId)) continue;
  seen.add(snap.modelId);
  entries.push(snap);
}

entries.sort((a, b) => {
  const wciA = a.stats.wci?.successRate ?? a.stats.agentDom?.successRate ?? 0;
  const wciB = b.stats.wci?.successRate ?? b.stats.agentDom?.successRate ?? 0;
  if (wciB !== wciA) return wciB - wciA;
  const stdA = a.stats.standard.successRate;
  const stdB = b.stats.standard.successRate;
  return stdB - stdA;
});

const out = {
  generatedAt: new Date().toISOString(),
  mergedFrom: entries.map((e) => e.modelId),
  modelOrder: entries.map((e) => e.meta),
};

for (const e of entries) {
  out[e.modelId] = e.stats;
}

const outPath = join(publicDir, 'eval-results-all.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath} (${entries.length} models)`);
entries.forEach((e) => {
  const wci = e.stats.wci?.successRate ?? e.stats.agentDom?.successRate;
  console.log(`  ${e.meta.name}: standard ${e.stats.standard.successRate}% → WCI ${wci}%`);
});
