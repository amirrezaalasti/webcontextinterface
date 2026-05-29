#!/usr/bin/env node
/**
 * Merge per-model eval-results-*.json snapshots into demo/public/eval-results-all.json
 * for the multi-model website leaderboard. Enriches rows with per-approach stats from
 * eval-report-*.json when available (matches the paper benchmark table).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'demo/public');

const SKIP_KEYS = new Set(['generatedAt', 'modelOrder']);

const APPROACH_KEYS = {
  'raw-html': 'rawHtml',
  'dom-outline': 'domOutline',
  'interactive-candidates': 'candidates',
  'wci-full': 'wciFull',
  'wci-grounding': 'wciGrounding',
  'wci-distilled': 'wciGrounding',
};

function approachesFromReport(modelId) {
  for (const file of readdirSync(publicDir)) {
    if (!file.startsWith('eval-report') || !file.endsWith('.json')) continue;
    const data = JSON.parse(readFileSync(join(publicDir, file), 'utf8'));
    const model = data.models?.find((m) => m.modelId === modelId);
    if (!model?.approaches) continue;

    const out = {};
    for (const [slug, key] of Object.entries(APPROACH_KEYS)) {
      const agg = model.approaches[slug];
      if (!agg || out[key]) continue;
      out[key] = {
        successRate: agg.successRate,
        avgTokens: agg.avgTokens,
      };
    }

    const required = ['rawHtml', 'domOutline', 'candidates', 'wciFull', 'wciGrounding'];
    if (required.every((k) => out[k])) return out;
  }
  return undefined;
}

function loadSnapshot(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const modelId = data.modelOrder?.[0]?.id ?? Object.keys(data).find((k) => !SKIP_KEYS.has(k));
  if (!modelId || !data[modelId]?.standard) return null;

  const stats = { ...data[modelId] };
  if (!stats.approaches) {
    const fromReport = approachesFromReport(modelId);
    if (fromReport) stats.approaches = fromReport;
  }

  return {
    modelId,
    meta: data.modelOrder?.[0] ?? {
      id: modelId,
      name: modelId,
      openRouterModel: modelId,
    },
    stats,
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

/** Paper table order (Table: evaluation) */
const MODEL_ORDER = [
  'gpt5',
  'gpt5Nano',
  'gptoss20B',
  'gemini35Flash',
  'qwen25_7b',
  'llama31_8b',
];

entries.sort((a, b) => {
  const ia = MODEL_ORDER.indexOf(a.modelId);
  const ib = MODEL_ORDER.indexOf(b.modelId);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.meta.name.localeCompare(b.meta.name);
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
  const wci =
    e.stats.approaches?.wciGrounding?.successRate ??
    e.stats.wci?.successRate ??
    e.stats.agentDom?.successRate;
  const raw = e.stats.approaches?.rawHtml?.successRate ?? e.stats.standard.successRate;
  console.log(`  ${e.meta.name}: raw HTML ${raw}% → WCI grounding ${wci}%`);
});
