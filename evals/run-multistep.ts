#!/usr/bin/env npx tsx
/**
 * WCI multi-step benchmark runner.
 *
 * This harness evaluates tasks defined in scenario meta files:
 *   demo/scenarios/<scenario-id>/meta.json -> tasks.multiStep[]
 *
 * Scoring combines:
 *  - final action correctness (ground-truth selector/id)
 *  - flow-coverage over expected step types (observe/reason/act/verify/...)
 */

import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import manifest from '../demo/scenarios/manifest.json';
import { buildEvalContext, listAnnotatedNodeIds, type ContextKind, type EvalContext } from './lib/contexts';
import { SCENARIO_GROUND_TRUTH } from './lib/ground-truth';
import { EVAL_MODELS, queryModel } from './lib/llm';
import { closeBrowser, resolveGroundTruthLocator, scoreRawPrediction } from './lib/playwright-validate';
import { extractCssSelector, scoreWciPrediction } from './lib/scorers';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(ROOT, 'demo/scenarios');
const OUT_DIR = path.join(ROOT, 'demo/public');

type EvalMode = 'standard' | 'wci';
type RunMode = EvalMode | 'both';

type MultiStepAction = {
  step: string;
  type: string;
  note?: string;
};

type MultiStepTask = {
  id: string;
  title: string;
  goal: string;
  difficulty: string;
  prerequisites: string[];
  completionCriteria: string[];
  standardFlow: MultiStepAction[];
  wciFlow: MultiStepAction[];
};

type ScenarioMeta = {
  id: string;
  title: string;
  icon: string;
  difficulty: 'Hard' | 'Very Hard' | 'Extreme';
  description: string;
  challenges: string[];
  task: {
    goal: string;
    standardSteps: Array<{ action: string; target: string; outcome: string; note: string }>;
    agentdomSteps: Array<{ action: string; target: string; outcome: string; note: string }>;
  };
  tasks?: {
    singleShot?: { goal: string; groundTruthSelector: string; groundTruthNodeId: string };
    multiStep?: MultiStepTask[];
  };
};

type ScenarioBundle = {
  id: string;
  meta: ScenarioMeta;
  rawHtml: string;
  annotatedHtml: string;
};

type ParsedAgentPlan = {
  actions: Array<{ type?: string; step?: string; target?: string; rationale?: string }>;
  final_action?: string;
};

type TaskRunResult = {
  scenarioId: string;
  taskId: string;
  mode: EvalMode;
  correctFinalAction: boolean;
  hitDecoy: boolean;
  flowCoverage: number;
  passed: boolean;
  parsedFinalAction: string | null;
  expectedFinalAction: string;
  tokenEstimate: number;
  rawResponse: string;
  validationError?: string;
};

const TYPE_ALIASES: Record<string, string> = {
  observe: 'observe',
  read: 'observe',
  scan: 'observe',
  reason: 'reason',
  think: 'reason',
  compare: 'reason',
  plan: 'reason',
  guardrail: 'guardrail',
  recovery: 'recovery',
  backtrack: 'recovery',
  error: 'error',
  act: 'act',
  click: 'act',
  fill: 'act',
  select: 'act',
  verify: 'verify',
  check: 'verify',
};

function normalizeType(v: string): string {
  const raw = (v || '').trim().toLowerCase();
  return TYPE_ALIASES[raw] ?? raw;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const verifyOnly = argv.includes('--verify-ground-truth');
  const heuristicOnly = argv.includes('--heuristic-only');
  const modelsArg = argv.find((a) => a.startsWith('--models='));
  const scenariosArg = argv.find((a) => a.startsWith('--scenarios='));
  const modeArg = argv.find((a) => a.startsWith('--mode='))?.split('=')[1] as RunMode | undefined;
  const minCoverageArg = argv.find((a) => a.startsWith('--min-coverage='))?.split('=')[1];

  const scenarioIds = scenariosArg
    ? scenariosArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const modelIds = modelsArg
    ? modelsArg.split('=')[1].split(',').map((s) => s.trim())
    : EVAL_MODELS.map((m) => m.id);

  const mode: RunMode = modeArg ?? 'both';
  if (!['standard', 'wci', 'both'].includes(mode)) {
    throw new Error(`Unknown --mode=${mode}. Use standard|wci|both`);
  }

  const minCoverage = minCoverageArg ? Number(minCoverageArg) : 0.6;
  if (!Number.isFinite(minCoverage) || minCoverage < 0 || minCoverage > 1) {
    throw new Error(`Invalid --min-coverage=${minCoverageArg}. Use a number in [0,1].`);
  }

  return {
    verifyOnly,
    heuristicOnly,
    mode,
    minCoverage,
    models: EVAL_MODELS.filter((m) => modelIds.includes(m.id)),
    scenarioIds,
  };
}

function loadScenarios(ids?: string[]): ScenarioBundle[] {
  const allIds = manifest.scenarios as string[];
  const selected = ids?.length ? ids : allIds;
  const missing = selected.filter((id) => !allIds.includes(id));
  if (missing.length) throw new Error(`Unknown scenario id(s): ${missing.join(', ')}`);

  return selected.map((id) => {
    const dir = path.join(SCENARIOS_DIR, id);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) as ScenarioMeta;
    const rawHtml = fs.readFileSync(path.join(dir, 'raw.html'), 'utf8');
    const annotatedHtml = fs.readFileSync(path.join(dir, 'annotated.html'), 'utf8');
    return { id, meta, rawHtml, annotatedHtml };
  });
}

async function verifyGroundTruth(scenarios: ScenarioBundle[]): Promise<boolean> {
  console.log('🔍 Verifying ground-truth selectors against raw HTML...\n');
  let ok = true;
  for (const s of scenarios) {
    const gt = SCENARIO_GROUND_TRUTH[s.id];
    if (!gt) {
      console.log(`  ❌ ${s.id}: missing ground truth entry`);
      ok = false;
      continue;
    }
    const resolved = await resolveGroundTruthLocator(s.rawHtml, gt);
    if (resolved) console.log(`  ✅ ${s.id}: ${resolved.selector} (${resolved.count} match)`);
    else {
      console.log(`  ❌ ${s.id}: no selector matched`);
      ok = false;
    }
  }
  return ok;
}

function buildScenarioContextInput(s: ScenarioBundle, mode: EvalMode): EvalContext {
  const kind: ContextKind = mode === 'wci' ? 'wci-grounding' : 'raw-html';
  const scenarioLike = {
    id: s.id,
    title: s.meta.title,
    icon: s.meta.icon,
    difficulty: s.meta.difficulty,
    description: s.meta.description,
    challenges: s.meta.challenges,
    rawHtml: s.rawHtml,
    annotatedHtml: s.annotatedHtml,
    task: s.meta.task,
  };
  return buildEvalContext(scenarioLike, kind);
}

function buildTaskPrompt(
  scenarioCtx: EvalContext,
  task: MultiStepTask,
  mode: EvalMode
): EvalContext {
  const expected = mode === 'wci' ? task.wciFlow : task.standardFlow;
  const payload = [
    `TASK_ID: ${task.id}`,
    `TASK_TITLE: ${task.title}`,
    `TASK_GOAL: ${task.goal}`,
    '',
    'PREREQUISITES:',
    ...task.prerequisites.map((p) => `- ${p}`),
    '',
    `EXPECTED_FLOW_${mode.toUpperCase()}:`,
    ...expected.map((s, i) => `${i + 1}. [${s.type}] ${s.step}`),
    '',
    'COMPLETION_CRITERIA:',
    ...task.completionCriteria.map((c) => `- ${c}`),
    '',
    'CONTEXT:',
    scenarioCtx.content,
    '',
    'Return strict JSON:',
    '{"actions":[{"type":"observe|reason|guardrail|recovery|act|verify","step":"...","target":"..."}],"final_action":"..."}',
    'No markdown, no prose.',
  ].join('\n');

  return {
    kind: scenarioCtx.kind,
    content: payload,
    tokenEstimate: Math.ceil(payload.length / 4),
    systemPrompt:
      mode === 'wci'
        ? 'You are a multi-step WCI agent. Use actionable WCI node ids for final_action.'
        : 'You are a multi-step web automation agent. Use a valid CSS selector for final_action.',
    userPromptPrefix: '',
  };
}

function parseAgentPlan(raw: string): ParsedAgentPlan {
  const cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? cleaned;
  const start = fence.indexOf('{');
  const end = fence.lastIndexOf('}');
  const jsonCandidate = start >= 0 && end > start ? fence.slice(start, end + 1) : fence;
  try {
    return JSON.parse(jsonCandidate) as ParsedAgentPlan;
  } catch {
    return { actions: [], final_action: cleaned.split('\n')[0]?.trim() };
  }
}

function scoreFlowCoverage(expected: MultiStepAction[], parsed: ParsedAgentPlan): number {
  const expectedTypes = expected.map((s) => normalizeType(s.type));
  if (!expectedTypes.length) return 1;
  const observed = new Set(
    (parsed.actions ?? [])
      .map((a) => normalizeType(a.type ?? ''))
      .filter(Boolean)
  );
  const hits = expectedTypes.filter((t) => observed.has(t)).length;
  return hits / expectedTypes.length;
}

async function evaluateTaskRun(
  s: ScenarioBundle,
  task: MultiStepTask,
  mode: EvalMode,
  modelResponse: string,
  tokenEstimate: number,
  minCoverage: number
): Promise<TaskRunResult> {
  const parsed = parseAgentPlan(modelResponse);
  const gt = SCENARIO_GROUND_TRUTH[s.id];
  const expectedFinalAction = mode === 'wci' ? gt.wciNodeId : gt.rawSelectors[0];

  let parsedFinalAction = parsed.final_action?.trim() || null;
  if (!parsedFinalAction) {
    const lastAct = [...(parsed.actions ?? [])].reverse().find((a) => normalizeType(a.type ?? '') === 'act');
    parsedFinalAction = lastAct?.target?.trim() || null;
  }

  let correctFinalAction = false;
  let hitDecoy = false;
  let validationError: string | undefined;

  if (!parsedFinalAction) {
    validationError = 'missing final_action';
  } else if (mode === 'wci') {
    const validIds = listAnnotatedNodeIds(s.annotatedHtml);
    const r = scoreWciPrediction(parsedFinalAction, gt, validIds);
    correctFinalAction = r.correct;
    hitDecoy = r.hitDecoy;
    parsedFinalAction = r.parsed;
  } else {
    const selector = extractCssSelector(parsedFinalAction) ?? parsedFinalAction;
    const r = await scoreRawPrediction(s.rawHtml, selector, gt);
    correctFinalAction = r.correct;
    validationError = r.validationError;
    parsedFinalAction = r.parsed;
  }

  const flowCoverage = scoreFlowCoverage(mode === 'wci' ? task.wciFlow : task.standardFlow, parsed);
  const passed = correctFinalAction && flowCoverage >= minCoverage;

  return {
    scenarioId: s.id,
    taskId: task.id,
    mode,
    correctFinalAction,
    hitDecoy,
    flowCoverage: Number(flowCoverage.toFixed(3)),
    passed,
    parsedFinalAction,
    expectedFinalAction,
    tokenEstimate,
    rawResponse: modelResponse.slice(0, 1200),
    ...(validationError ? { validationError } : {}),
  };
}

function summarize(results: TaskRunResult[]) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const finalCorrect = results.filter((r) => r.correctFinalAction).length;
  const avgCoverage = total
    ? Number((results.reduce((s, r) => s + r.flowCoverage, 0) / total).toFixed(3))
    : 0;
  const avgTokens = total
    ? Math.round(results.reduce((s, r) => s + r.tokenEstimate, 0) / total)
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

async function runModel(
  model: { id: string; name: string; model: string },
  scenarios: ScenarioBundle[],
  runMode: RunMode,
  minCoverage: number,
  heuristicOnly: boolean
) {
  const modes: EvalMode[] = runMode === 'both' ? ['standard', 'wci'] : [runMode];
  const byMode: Record<EvalMode, TaskRunResult[]> = { standard: [], wci: [] };

  for (const mode of modes) {
    for (const s of scenarios) {
      const multi = s.meta.tasks?.multiStep ?? [];
      const ctx = buildScenarioContextInput(s, mode);
      for (const task of multi) {
        process.stdout.write(`  ${s.id} · ${task.id} [${mode}] ... `);
        try {
          const resp = heuristicOnly
            ? {
                raw:
                  mode === 'wci'
                    ? JSON.stringify({
                        actions: task.wciFlow.map((f) => ({ type: f.type, step: f.step })),
                        final_action: SCENARIO_GROUND_TRUTH[s.id].wciNodeId,
                      })
                    : JSON.stringify({
                        actions: task.standardFlow.map((f) => ({ type: f.type, step: f.step })),
                        final_action: SCENARIO_GROUND_TRUTH[s.id].rawSelectors[0],
                      }),
                usageTokens: ctx.tokenEstimate,
              }
            : await queryModel(model.model, buildTaskPrompt(ctx, task, mode), {
                maxTokens: 1200,
                temperature: 0,
              });

          const result = await evaluateTaskRun(
            s,
            task,
            mode,
            resp.raw,
            resp.usageTokens || ctx.tokenEstimate,
            minCoverage
          );
          byMode[mode].push(result);
          console.log(result.passed ? '✓' : '✗');
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          byMode[mode].push({
            scenarioId: s.id,
            taskId: task.id,
            mode,
            correctFinalAction: false,
            hitDecoy: false,
            flowCoverage: 0,
            passed: false,
            parsedFinalAction: null,
            expectedFinalAction: mode === 'wci' ? SCENARIO_GROUND_TRUTH[s.id].wciNodeId : SCENARIO_GROUND_TRUTH[s.id].rawSelectors[0],
            tokenEstimate: ctx.tokenEstimate,
            rawResponse: err,
            validationError: err,
          });
          console.log(`ERR ${err.slice(0, 80)}`);
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  return {
    modelId: model.id,
    modelName: model.name,
    openRouterModel: model.model,
    summary: {
      standard: summarize(byMode.standard),
      wci: summarize(byMode.wci),
    },
    results: byMode,
  };
}

async function main() {
  const args = parseArgs();
  const scenarios = loadScenarios(args.scenarioIds);
  console.log('WCI Multi-step Benchmark\n');
  console.log(
    `Scenarios: ${scenarios.length}${args.scenarioIds?.length ? ' (filtered)' : ' (all)'} · mode=${args.mode} · minCoverage=${args.minCoverage}\n`
  );

  const gtOk = await verifyGroundTruth(scenarios);
  if (!gtOk) {
    console.error('\n⚠️ Ground-truth verification failed.');
    if (args.verifyOnly) {
      await closeBrowser();
      process.exit(1);
    }
  }
  if (args.verifyOnly) {
    await closeBrowser();
    process.exit(gtOk ? 0 : 1);
  }

  if (!args.heuristicOnly && !process.env.OPENROUTER_API_KEY) {
    console.error('\n❌ OPENROUTER_API_KEY is not set.');
    console.error('   Add it to .env or export it, then re-run: npm run eval:multistep');
    console.error('   Or run without API: npm run eval:multistep -- --heuristic-only\n');
    await closeBrowser();
    process.exit(1);
  }

  const activeModels = args.heuristicOnly
    ? [{ id: 'heuristic', name: 'Deterministic heuristic', model: '(none)' }]
    : args.models;

  const modelRuns = [];
  for (const m of activeModels) {
    console.log(`\n${'='.repeat(60)}\n🤖 ${m.name}\n   ${m.model}\n${'='.repeat(60)}`);
    const run = await runModel(m, scenarios, args.mode, args.minCoverage, args.heuristicOnly);
    modelRuns.push(run);
    if (args.mode === 'both' || args.mode === 'standard') {
      console.log(
        `  standard: ${run.summary.standard.passRate}% pass | final-action ${run.summary.standard.finalActionAccuracy}% | coverage ${run.summary.standard.avgCoverage}`
      );
    }
    if (args.mode === 'both' || args.mode === 'wci') {
      console.log(
        `  wci:      ${run.summary.wci.passRate}% pass | final-action ${run.summary.wci.finalActionAccuracy}% | coverage ${run.summary.wci.avgCoverage}`
      );
    }
  }

  await closeBrowser();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, 'eval-multistep-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        methodology:
          'Multi-step evaluation over tasks.multiStep. Pass requires correct final action plus minimum flow-type coverage.',
        minCoverage: args.minCoverage,
        mode: args.mode,
        scenarioCount: scenarios.length,
        models: modelRuns,
      },
      null,
      2
    ) + '\n'
  );

  console.log(`\n✅ Multi-step report: ${reportPath}`);
}

main().catch(async (e) => {
  console.error(e);
  await closeBrowser();
  process.exit(1);
});

