#!/usr/bin/env npx tsx
/**
 * Empirical analysis: compute F1 scores from archived multistep reports
 * and find the optimal threshold that maximizes separation between
 * correct and incorrect final_action predictions.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/amirrezaalasti/Desktop/selfprojects/WIA_framework';
const scenariosDir = join(ROOT, 'demo/scenarios');
const publicDir = join(ROOT, 'demo/public');

// ── Inline helpers (avoid import issues) ──────────────────────────────────

const TYPE_ALIASES: Record<string, string> = {
  observe: 'observe', read: 'observe', scan: 'observe',
  reason: 'reason', think: 'reason', compare: 'reason', plan: 'reason',
  guardrail: 'guardrail', recovery: 'recovery', backtrack: 'recovery',
  error: 'error', act: 'act', click: 'act', fill: 'act', select: 'act',
  verify: 'verify', check: 'verify',
};

function normalizeFlowType(v: string): string {
  return TYPE_ALIASES[(v || '').trim().toLowerCase()] ?? (v || '').trim().toLowerCase();
}

function wciFlowTypeBucket(v: string): string {
  const t = normalizeFlowType(v);
  if (t === 'reason' || t === 'observe') return 'observe';
  if (t === 'act') return 'act';
  if (t === 'verify') return 'verify';
  if (t === 'guardrail') return 'guardrail';
  if (t === 'recovery' || t === 'error') return 'recovery';
  return t;
}

const WCI_APPROACHES = new Set(['wci-full', 'wci-grounding', 'wci-distilled']);
function isWci(approach: string) { return WCI_APPROACHES.has(approach); }

function bucketFor(approach: string, type: string): string {
  return isWci(approach) ? wciFlowTypeBucket(type) : normalizeFlowType(type);
}

const TEXT_SIGNALS: Array<{ re: RegExp; type: string }> = [
  { re: /\b(verify|confirm|check\s+that|assert|ensure|post-?action|state\s+change)\b/i, type: 'verify' },
  { re: /\b(recover|backtrack|undo|dismiss\s+overlay|wrong\s+branch)\b/i, type: 'recovery' },
  { re: /\b(decoy|guardrail|avoid\s+decoy|reject|skip\s+promo)\b/i, type: 'guardrail' },
  { re: /\b(read|scan|observe|inspect|parse|locate|scope|landmark|filter|compare|narrow|reason|precondition|probability|table|state)\b/i, type: 'observe' },
  { re: /\b(click|invoke|execute|submit|select|fill|press|export|vote|book|pay|upload|sign|apply|act\b)\b/i, type: 'act' },
];

type FlowStep = { step: string; type: string; note?: string };
type ParsedPlan = { actions?: Array<{ type?: string; step?: string; target?: string }>; final_action?: string };

function inferTypes(action: { type?: string; step?: string; target?: string }): string[] {
  const explicit = normalizeFlowType(action.type ?? '');
  const blob = `${action.step ?? ''} ${action.target ?? ''}`;
  const inferred = new Set<string>();
  if (explicit && explicit !== 'node') inferred.add(explicit);
  for (const { re, type } of TEXT_SIGNALS) { if (re.test(blob)) inferred.add(type); }
  if (!inferred.size && explicit) inferred.add(explicit);
  return [...inferred];
}

function collectObserved(parsed: ParsedPlan, approach: string, opts: { correctFinalAction: boolean; expected: FlowStep[] }): Set<string> {
  const observed = new Set<string>();
  for (const a of parsed.actions ?? []) {
    for (const t of inferTypes(a)) { const b = bucketFor(approach, t); if (b) observed.add(b); }
  }
  if (parsed.final_action?.trim()) {
    observed.add(bucketFor(approach, 'act'));
    const blob = `${parsed.final_action} ${(parsed.actions ?? []).map(x => x.step).join(' ')}`;
    if (/\b(verify|confirm|check)\b/i.test(blob)) observed.add(bucketFor(approach, 'verify'));
  }
  if (opts.correctFinalAction) {
    observed.add(bucketFor(approach, 'act'));
    const expectedBuckets = [...new Set(opts.expected.map(s => bucketFor(approach, s.type)))];
    if (isWci(approach)) {
      if (expectedBuckets.includes('observe')) observed.add(bucketFor(approach, 'observe'));
      if (expectedBuckets.includes('verify')) observed.add(bucketFor(approach, 'verify'));
    } else {
      if (expectedBuckets.includes('verify')) {
        const has = (parsed.actions ?? []).some(a => inferTypes(a).includes('verify'));
        if (has || /\b(verify|confirm|check)\b/i.test(parsed.final_action ?? '')) observed.add(bucketFor(approach, 'verify'));
      }
      const hasObs = (parsed.actions ?? []).some(a =>
        inferTypes(a).some(t => ['observe', 'reason'].includes(bucketFor(approach, t)))
      );
      if (hasObs) observed.add(bucketFor(approach, 'observe'));
    }
  }
  return observed;
}

function computeF1(expected: Set<string>, observed: Set<string>) {
  if (expected.size === 0) return { p: 1, r: 1, f1: 1 };
  if (observed.size === 0) return { p: 0, r: 0, f1: 0 };
  const intersection = [...expected].filter(e => observed.has(e)).length;
  const p = intersection / observed.size;
  const r = intersection / expected.size;
  const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
  return { p, r, f1 };
}

function parsePlan(raw: string): ParsedPlan {
  const cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? cleaned;
  const start = fence.indexOf('{');
  const end = fence.lastIndexOf('}');
  const jsonCandidate = start >= 0 && end > start ? fence.slice(start, end + 1) : fence;
  try { return JSON.parse(jsonCandidate) as ParsedPlan; } catch { return { actions: [], final_action: cleaned.split('\n')[0]?.trim() }; }
}

// ── Load & analyze ────────────────────────────────────────────────────────

type TaskFlow = { wciFlow: FlowStep[]; standardFlow: FlowStep[] };
const taskFlowCache = new Map<string, TaskFlow>();
function getTaskFlow(scenarioId: string, taskId: string): TaskFlow {
  const key = `${scenarioId}:${taskId}`;
  if (taskFlowCache.has(key)) return taskFlowCache.get(key)!;
  const meta = JSON.parse(readFileSync(join(scenariosDir, scenarioId, 'meta.json'), 'utf8'));
  const task = meta.tasks?.multiStep?.find((t: any) => t.id === taskId);
  const flow: TaskFlow = { wciFlow: task?.wciFlow ?? [], standardFlow: task?.standardFlow ?? [] };
  taskFlowCache.set(key, flow);
  return flow;
}

type Row = { model: string; scenario: string; approach: string; correctFinalAction: boolean; oldCoverage: number; f1: number; precision: number; recall: number; expectedBuckets: string[]; observedBuckets: string[] };
const rows: Row[] = [];

for (const file of readdirSync(publicDir).sort()) {
  if (!file.startsWith('eval-multistep-report') || !file.endsWith('.json')) continue;
  const data = JSON.parse(readFileSync(join(publicDir, file), 'utf8'));
  for (const model of data.models ?? []) {
    for (const [approach, results] of Object.entries(model.results ?? {})) {
      for (const row of results as any[]) {
        const taskFlow = getTaskFlow(row.scenarioId, row.taskId);
        const flow = isWci(approach) ? taskFlow.wciFlow : taskFlow.standardFlow;
        const parsed = parsePlan(row.rawResponse ?? '');
        const expectedTypes = new Set(flow.map(s => bucketFor(approach, s.type)));
        const observed = collectObserved(parsed, approach, { correctFinalAction: row.correctFinalAction, expected: flow });
        const { p, r, f1 } = computeF1(expectedTypes, observed);
        rows.push({
          model: model.modelId, scenario: row.scenarioId, approach,
          correctFinalAction: row.correctFinalAction, oldCoverage: row.flowCoverage,
          f1: Number(f1.toFixed(3)), precision: Number(p.toFixed(3)), recall: Number(r.toFixed(3)),
          expectedBuckets: [...expectedTypes], observedBuckets: [...observed],
        });
      }
    }
  }
}

// ── Analysis ───────────────────────────────────────────────────────────────

function percentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
}
function stats(arr: number[]) {
  if (!arr.length) return { min: 0, p5: 0, p25: 0, median: 0, p75: 0, p95: 0, max: 0, mean: 0 };
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return { min: Math.min(...arr), p5: percentile(arr, 0.05), p25: percentile(arr, 0.25), median: percentile(arr, 0.5), p75: percentile(arr, 0.75), p95: percentile(arr, 0.95), max: Math.max(...arr), mean: Number(mean.toFixed(3)) };
}

console.log(`\n${'='.repeat(70)}`);
console.log(`EMPIRICAL F1 ANALYSIS — ${rows.length} total result rows`);
console.log(`${'='.repeat(70)}\n`);

const correct = rows.filter(r => r.correctFinalAction);
const incorrect = rows.filter(r => !r.correctFinalAction);
console.log(`Correct final_action:   ${correct.length} rows`);
console.log(`Incorrect final_action: ${incorrect.length} rows\n`);

console.log('F1 distribution — CORRECT final_action:');
console.log(stats(correct.map(r => r.f1)));
console.log('\nF1 distribution — INCORRECT final_action:');
console.log(stats(incorrect.map(r => r.f1)));

console.log('\n--- By approach (correct only) ---');
for (const a of ['raw-html', 'dom-outline', 'interactive-candidates', 'wci-full', 'wci-grounding']) {
  const sub = correct.filter(r => r.approach === a).map(r => r.f1);
  if (sub.length) console.log(`  ${a.padEnd(25)} n=${String(sub.length).padEnd(4)} mean=${stats(sub).mean}  min=${stats(sub).min}  p25=${stats(sub).p25}  median=${stats(sub).median}`);
}

console.log('\n--- By approach (incorrect only) ---');
for (const a of ['raw-html', 'dom-outline', 'interactive-candidates', 'wci-full', 'wci-grounding']) {
  const sub = incorrect.filter(r => r.approach === a).map(r => r.f1);
  if (sub.length) console.log(`  ${a.padEnd(25)} n=${String(sub.length).padEnd(4)} mean=${stats(sub).mean}  min=${stats(sub).min}  p25=${stats(sub).p25}  median=${stats(sub).median}`);
}

// ── Youden's J threshold sweep ─────────────────────────────────────────────
console.log('\n--- Threshold analysis (Youden\'s J statistic) ---');
console.log('  Thresh | Correct pass (TP)    | Incorrect pass (FP)  | J');

let bestJ = -Infinity, bestT = 0;
for (let t = 0.0; t <= 1.01; t += 0.05) {
  const tp = correct.filter(r => r.f1 >= t).length;
  const fp = incorrect.filter(r => r.f1 >= t).length;
  const sens = correct.length ? tp / correct.length : 0;
  const spec = incorrect.length ? 1 - (fp / incorrect.length) : 1;
  const j = sens + spec - 1;
  const mark = j > bestJ ? ' ←' : '';
  if (j > bestJ) { bestJ = j; bestT = t; }
  console.log(`  ${t.toFixed(2).padEnd(5)} | TP=${String(tp).padEnd(4)} (${(sens * 100).toFixed(0).padStart(3)}%) | FP=${String(fp).padEnd(4)} (${((1 - spec) * 100).toFixed(0).padStart(3)}%) | J=${j.toFixed(3)}${mark}`);
}
console.log(`\n✅ Optimal threshold (max Youden's J): ${bestT.toFixed(2)} (J = ${bestJ.toFixed(3)})`);

// ── Expected bucket sizes ──────────────────────────────────────────────────
console.log('\n--- Expected bucket sizes ---');
const bsizes = rows.map(r => r.expectedBuckets.length);
const hist: Record<number, number> = {};
for (const s of bsizes) hist[s] = (hist[s] ?? 0) + 1;
console.log('Histogram:', hist);

// ── Pass rate impact ───────────────────────────────────────────────────────
console.log('\n--- Pass rate impact (only rows with correct final_action) ---');
for (const t of [0.3, 0.4, 0.5, 0.55, 0.6, 0.667, 0.7, 0.8]) {
  const passing = correct.filter(r => r.f1 >= t).length;
  console.log(`  F1 >= ${t.toFixed(3).padEnd(5)} | ${passing}/${correct.length} correct pass (${((passing / correct.length) * 100).toFixed(1)}%)`);
}

// ── Sample divergences ─────────────────────────────────────────────────────
console.log('\n--- F1 vs old coverage: top divergences ---');
const div = rows.filter(r => Math.abs(r.f1 - r.oldCoverage) > 0.1)
  .sort((a, b) => Math.abs(b.f1 - b.oldCoverage) - Math.abs(a.f1 - a.oldCoverage))
  .slice(0, 15);
for (const r of div) {
  console.log(`  ${r.model}/${r.scenario}/${r.approach}: old=${r.oldCoverage} f1=${r.f1} P=${r.precision} R=${r.recall} correct=${r.correctFinalAction}`);
  console.log(`    expected=[${r.expectedBuckets}] observed=[${r.observedBuckets}]`);
}
