#!/usr/bin/env tsx
/**
 * Build demo leaderboard snapshots from archived eval-multistep-report-*.json files.
 * Recomputes flow coverage + pass with current evals/lib/flow-coverage.ts (no API re-run).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rescoreApproachResults } from '../evals/lib/rescore-multistep-results';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'demo/public');

const APPROACH_KEYS = {
  'raw-html': 'rawHtml',
  'dom-outline': 'domOutline',
  'interactive-candidates': 'candidates',
  'wci-full': 'wciFull',
  'wci-grounding': 'wciGrounding',
} as const;

const ARCHIVE_SUFFIX: Record<string, string> = {
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

const DEFAULT_MIN_COVERAGE = 0.6;

type SummaryRow = {
  tasks: number;
  passed: number;
  passRate: number;
  finalActionAccuracy: number;
  avgCoverage: number;
  avgTokens: number;
};

type ModelEntry = {
  modelId: string;
  modelName: string;
  openRouterModel?: string;
  summary: Record<string, SummaryRow>;
  results?: Record<string, Array<Record<string, unknown>>>;
};

function summarizeApproachResults(
  results: Array<{ passed: boolean; correctFinalAction: boolean; flowCoverage: number; tokenEstimate?: number }>,
): SummaryRow {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const finalCorrect = results.filter((r) => r.correctFinalAction).length;
  const avgCoverage = total
    ? Number((results.reduce((sum, r) => sum + (r.flowCoverage ?? 0), 0) / total).toFixed(3))
    : 0;
  const avgTokens = total
    ? Math.round(results.reduce((sum, r) => sum + (r.tokenEstimate ?? 0), 0) / total)
    : 0;
  return {
    tasks: total,
    passed,
    passRate: total ? Math.round((passed / total) * 100) : 0,
    finalActionAccuracy: total ? Math.round((finalCorrect / total) * 100) : 0,
    avgCoverage,
    avgTokens,
  };
}

function buildModelSummary(model: ModelEntry, minCoverage: number): Record<string, SummaryRow> {
  const summary: Record<string, SummaryRow> = {};
  for (const slug of Object.keys(APPROACH_KEYS)) {
    const rawResults = model.results?.[slug];
    if (Array.isArray(rawResults) && rawResults.length) {
      const rescored = rescoreApproachResults(rawResults as never[], minCoverage);
      summary[slug] = summarizeApproachResults(rescored);
    } else if (model.summary?.[slug]) {
      summary[slug] = model.summary[slug];
    }
  }
  return summary;
}

function statsFromMultistepSummary(summary: Record<string, SummaryRow>) {
  const approaches: Record<string, { successRate: number; avgTokens: number }> = {};
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

  return {
    methodology: 'multistep',
    passRule: 'unified',
    minCoverage: DEFAULT_MIN_COVERAGE,
    standard: {
      successRate: Math.round((raw.successRate + dom.successRate + cand.successRate) / 3),
      avgTokens: Math.round((raw.avgTokens + dom.avgTokens + cand.avgTokens) / 3),
    },
    wci,
    wciFull,
    agentDom: wci,
    approaches,
  };
}

function snapshotForModel(model: ModelEntry, generatedAt: string, sourceReport: string) {
  const meta = {
    id: model.modelId,
    name: model.modelName,
    openRouterModel: model.openRouterModel,
  };
  return {
    generatedAt,
    sourceReport,
    methodology: 'multistep',
    passRule: 'unified',
    minCoverage: DEFAULT_MIN_COVERAGE,
    modelOrder: [meta],
    [model.modelId]: statsFromMultistepSummary(model.summary),
  };
}

function loadMultistepReports() {
  const byModelId = new Map<
    string,
    { model: ModelEntry; generatedAt: string; sourceReport: string; minCoverage: number }
  >();

  for (const file of readdirSync(publicDir).sort()) {
    if (!file.startsWith('eval-multistep-report') || !file.endsWith('.json')) continue;
    const data = JSON.parse(readFileSync(join(publicDir, file), 'utf8')) as {
      generatedAt: string;
      minCoverage?: number;
      models?: ModelEntry[];
    };
    const minCoverage =
      typeof data.minCoverage === 'number' ? data.minCoverage : DEFAULT_MIN_COVERAGE;
    for (const model of data.models ?? []) {
      if (!model.modelId || (!model.summary && !model.results)) continue;
      const existing = byModelId.get(model.modelId);
      if (existing && existing.generatedAt >= data.generatedAt) continue;
      byModelId.set(model.modelId, {
        model: {
          ...model,
          summary: buildModelSummary(model, minCoverage),
        },
        generatedAt: data.generatedAt,
        sourceReport: file,
        minCoverage,
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

const out: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  methodology: 'multistep',
  passRule: 'unified',
  passRuleNote:
    'All approaches pass when correctFinalAction && !hitDecoy && flowCoverage >= minCoverage. flowCoverage recomputed from archived rawResponse with current flow-coverage.ts (no API re-run).',
  minCoverage: DEFAULT_MIN_COVERAGE,
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
    JSON.stringify(snapshotForModel(gpt5.model, gpt5.generatedAt, gpt5.sourceReport), null, 2)
  );
  console.log(`Wrote ${defaultPath} (GPT-5 default)`);
}

loaded.forEach(({ model }) => {
  const stats = statsFromMultistepSummary(model.summary);
  const wci = stats.approaches?.wciGrounding?.successRate ?? stats.wci.successRate;
  const raw = stats.approaches?.rawHtml?.successRate ?? stats.standard.successRate;
  console.log(
    `  ${model.modelName}: raw HTML ${raw}% → WCI grounding ${wci}% (unified pass, rescored coverage)`
  );
});
