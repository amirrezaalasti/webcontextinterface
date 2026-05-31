#!/usr/bin/env node
/**
 * Build demo leaderboard snapshots from archived eval-multistep-report-*.json files.
 * Writes per-model eval-results-<suffix>.json, eval-results-all.json, and eval-results.json (GPT-5 default).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'demo/public');

const APPROACH_KEYS = {
  'raw-html': 'rawHtml',
  'dom-outline': 'domOutline',
  'interactive-candidates': 'candidates',
  'wci-full': 'wciFull',
  'wci-grounding': 'wciGrounding',
};

/** Filename suffix for archived per-model snapshots */
const ARCHIVE_SUFFIX = {
  gpt5: 'gpt5',
  gpt5Nano: 'gpt5nano',
  gemini35Flash: 'gemini3.5flash',
  llama31_8b: 'llama318B',
  qwen25_7b: 'qwen257B',
  gptoss20B: 'gptoss20B',
};

const MODEL_ORDER = [
  'gpt5',
  'gpt5Nano',
  'gptoss20B',
  'gemini35Flash',
  'qwen25_7b',
  'llama31_8b',
];

function statsFromMultistepSummary(summary) {
  const approaches = {};
  for (const [slug, key] of Object.entries(APPROACH_KEYS)) {
    const row = summary[slug];
    if (!row) continue;
    approaches[key] = {
      successRate: row.passRate,
      avgTokens: row.avgTokens ?? 0,
    };
  }

  const raw = approaches.rawHtml ?? { successRate: 0, avgTokens: 0 };
  const dom = approaches.domOutline ?? { successRate: 0, avgTokens: 0 };
  const cand = approaches.candidates ?? { successRate: 0, avgTokens: 0 };
  const wci = approaches.wciGrounding ?? { successRate: 0, avgTokens: 0 };
  const wciFull = approaches.wciFull ?? { successRate: 0, avgTokens: 0 };

  const standard = {
    successRate: Math.round((raw.successRate + dom.successRate + cand.successRate) / 3),
    avgTokens: Math.round((raw.avgTokens + dom.avgTokens + cand.avgTokens) / 3),
  };

  return {
    methodology: 'multistep',
    standard,
    wci,
    wciFull,
    agentDom: wci,
    approaches,
  };
}

function snapshotForModel(model, generatedAt, sourceReport) {
  const meta = {
    id: model.modelId,
    name: model.modelName,
    openRouterModel: model.openRouterModel,
  };
  return {
    generatedAt,
    sourceReport,
    methodology: 'multistep',
    modelOrder: [meta],
    [model.modelId]: statsFromMultistepSummary(model.summary),
  };
}

function loadMultistepReports() {
  const byModelId = new Map();

  for (const file of readdirSync(publicDir).sort()) {
    if (!file.startsWith('eval-multistep-report') || !file.endsWith('.json')) continue;
    const data = JSON.parse(readFileSync(join(publicDir, file), 'utf8'));
    for (const model of data.models ?? []) {
      if (!model.modelId || !model.summary) continue;
      const existing = byModelId.get(model.modelId);
      if (existing && existing.generatedAt >= data.generatedAt) continue;
      byModelId.set(model.modelId, {
        model,
        generatedAt: data.generatedAt,
        sourceReport: file,
      });
    }
  }

  return [...byModelId.values()];
}

const loaded = loadMultistepReports();
loaded.sort((a, b) => {
  const ia = MODEL_ORDER.indexOf(a.model.modelId);
  const ib = MODEL_ORDER.indexOf(b.model.modelId);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.model.modelName.localeCompare(b.model.modelName);
});

for (const { model, generatedAt, sourceReport } of loaded) {
  const suffix = ARCHIVE_SUFFIX[model.modelId] ?? model.modelId;
  const outPath = join(publicDir, `eval-results-${suffix}.json`);
  writeFileSync(outPath, JSON.stringify(snapshotForModel(model, generatedAt, sourceReport), null, 2));
  console.log(`Wrote ${outPath} (from ${sourceReport})`);
}

const out = {
  generatedAt: new Date().toISOString(),
  methodology: 'multistep',
  mergedFrom: loaded.map((e) => e.model.modelId),
  modelOrder: loaded.map((e) => ({
    id: e.model.modelId,
    name: e.model.modelName,
    openRouterModel: e.model.openRouterModel,
  })),
};

for (const { model } of loaded) {
  out[model.modelId] = statsFromMultistepSummary(model.summary);
}

const allPath = join(publicDir, 'eval-results-all.json');
writeFileSync(allPath, JSON.stringify(out, null, 2));
console.log(`\nWrote ${allPath} (${loaded.length} models)`);

const gpt5 = loaded.find((e) => e.model.modelId === 'gpt5');
if (gpt5) {
  const defaultPath = join(publicDir, 'eval-results.json');
  writeFileSync(
    defaultPath,
    JSON.stringify(
      snapshotForModel(gpt5.model, gpt5.generatedAt, gpt5.sourceReport),
      null,
      2
    )
  );
  console.log(`Wrote ${defaultPath} (GPT-5 default)`);
}

loaded.forEach(({ model }) => {
  const stats = statsFromMultistepSummary(model.summary);
  const wci = stats.approaches?.wciGrounding?.successRate ?? stats.wci.successRate;
  const raw = stats.approaches?.rawHtml?.successRate ?? stats.standard.successRate;
  console.log(`  ${model.modelName}: raw HTML ${raw}% → WCI grounding ${wci}% (multistep pass)`);
});
