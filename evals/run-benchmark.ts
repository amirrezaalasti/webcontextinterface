#!/usr/bin/env npx tsx
/**
 * WCI benchmark evaluation — deterministic scoring + optional LLM via OpenRouter.
 *
 * Usage:
 *   npm run eval:benchmark              # LLM + Playwright validation
 *   npm run eval:benchmark -- --heuristic-only
 *   npm run eval:benchmark -- --verify-ground-truth
 *   npm run eval:benchmark -- --models=gpt5Nano,gemini3Flash
 *   npm run eval:benchmark -- --no-logs
 *   npm run eval:benchmark -- --approaches=wci-full,wci-grounding
 *   npm run eval:benchmark -- --scenarios=flight-booking,banking
 */

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { filterScenarios, type BenchmarkScenario } from '../demo/benchmark';
import {
  buildEvalContext,
  isWciContextKind,
  listAnnotatedNodeIds,
  WCI_CONTEXT_KINDS,
  type ContextKind,
} from './lib/contexts';
import { getGroundTruth } from './lib/ground-truth';
import { heuristicRawPrediction, heuristicWciPrediction } from './lib/heuristics';
import { buildLogEntry, LlmRunLogger } from './lib/llm-log';
import { EVAL_MODELS, queryModel } from './lib/llm';
import { closeBrowser, resolveGroundTruthLocator, scoreRawPrediction } from './lib/playwright-validate';
import {
  buildLeaderboard,
  type ApproachAggregate,
  type EvalReport,
  type ModelAggregate,
  type ScenarioRunResult,
} from './lib/report';
import { extractCssSelector, scoreWciPrediction } from './lib/scorers';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../demo/public');
const LOGS_DIR = path.resolve(__dirname, 'logs');

const RAW_APPROACHES: ContextKind[] = ['raw-html', 'dom-outline', 'interactive-candidates'];
const DEFAULT_APPROACHES: ContextKind[] = [...RAW_APPROACHES, ...WCI_CONTEXT_KINDS];

const VALID_APPROACHES = new Set<ContextKind>([
  ...RAW_APPROACHES,
  ...WCI_CONTEXT_KINDS,
  'wci-distilled',
]);

let activeScenarios: BenchmarkScenario[] = [];

function parseArgs() {
  const argv = process.argv.slice(2);
  const heuristicOnly = argv.includes('--heuristic-only');
  const verifyOnly = argv.includes('--verify-ground-truth');
  const noLogs = argv.includes('--no-logs');
  const modelsArg = argv.find((a) => a.startsWith('--models='));
  const approachesArg = argv.find((a) => a.startsWith('--approaches='));
  const scenariosArg = argv.find((a) => a.startsWith('--scenarios='));
  const scenarioIds = scenariosArg
    ? scenariosArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const modelIds = modelsArg
    ? modelsArg.split('=')[1].split(',').map((s) => s.trim())
    : EVAL_MODELS.map((m) => m.id);

  let approaches: ContextKind[] = DEFAULT_APPROACHES;
  if (approachesArg) {
    const requested = approachesArg.split('=')[1].split(',').map((s) => s.trim()) as ContextKind[];
    const invalid = requested.filter((a) => !VALID_APPROACHES.has(a));
    if (invalid.length) {
      console.error(`Unknown --approaches: ${invalid.join(', ')}`);
      process.exit(1);
    }
    approaches = requested.map((a) => (a === 'wci-distilled' ? 'wci-grounding' : a));
  }

  return {
    heuristicOnly,
    verifyOnly,
    noLogs,
    models: EVAL_MODELS.filter((m) => modelIds.includes(m.id)),
    approaches,
    scenarioIds,
  };
}

async function verifyGroundTruth(): Promise<boolean> {
  console.log('🔍 Verifying ground-truth selectors against raw HTML...\n');
  let ok = true;

  for (const scenario of activeScenarios) {
    const gt = getGroundTruth(scenario);
    const resolved = await resolveGroundTruthLocator(scenario.rawHtml, gt);
    if (resolved) {
      console.log(`  ✅ ${scenario.id}: ${resolved.selector} (${resolved.count} match)`);
    } else {
      console.log(`  ❌ ${scenario.id}: no selector matched — update evals/lib/ground-truth.ts`);
      ok = false;
    }
  }

  return ok;
}

async function evaluatePrediction(
  scenario: BenchmarkScenario,
  approach: ContextKind,
  rawResponse: string,
  tokenEstimate: number
): Promise<ScenarioRunResult> {
  const gt = getGroundTruth(scenario);

  if (isWciContextKind(approach)) {
    const validIds = listAnnotatedNodeIds(scenario.annotatedHtml);
    const { correct, hitDecoy, parsed } = scoreWciPrediction(rawResponse, gt, validIds);
    return {
      scenarioId: scenario.id,
      correct,
      hitDecoy: hitDecoy,
      parsed,
      rawResponse: rawResponse.slice(0, 200),
      tokenEstimate,
    };
  }

  const selector = extractCssSelector(rawResponse) ?? rawResponse.trim();
  const scored = await scoreRawPrediction(scenario.rawHtml, selector, gt);

  return {
    scenarioId: scenario.id,
    correct: scored.correct,
    hitDecoy: false,
    parsed: scored.parsed,
    rawResponse: rawResponse.slice(0, 200),
    tokenEstimate,
    validationError: scored.validationError,
  };
}

function aggregateApproach(
  approach: string,
  results: ScenarioRunResult[]
): ApproachAggregate {
  const correct = results.filter((r) => r.correct).length;
  const decoyHits = results.filter((r) => r.hitDecoy).length;
  const runs = results.length;
  const avgTokens = runs
    ? Math.round(results.reduce((s, r) => s + r.tokenEstimate, 0) / runs)
    : 0;

  const byScenario: Record<string, ScenarioRunResult> = {};
  for (const r of results) byScenario[r.scenarioId] = r;

  return {
    approach,
    runs,
    correct,
    decoyHits,
    successRate: runs ? Math.round((correct / runs) * 100) : 0,
    avgTokens,
    byScenario,
  };
}

async function runHeuristicEval(approachList: ContextKind[]): Promise<EvalReport> {
  const approaches: Record<string, ApproachAggregate> = {};

  for (const approach of approachList) {
    const scenarioResults: ScenarioRunResult[] = [];

    for (const scenario of activeScenarios) {
      const gt = getGroundTruth(scenario);
      let rawResponse: string;
      let tokenEstimate: number;

      if (approach === 'wci-full' || approach === 'wci-grounding') {
        rawResponse = heuristicWciPrediction(
          scenario,
          approach === 'wci-full' ? 'full' : 'grounding'
        );
        tokenEstimate = Math.ceil(buildEvalContext(scenario, approach).content.length / 4);
      } else {
        rawResponse =
          approach === 'interactive-candidates'
            ? heuristicRawPrediction(scenario)
            : heuristicRawPrediction(scenario);
        const ctx = buildEvalContext(scenario, approach);
        tokenEstimate = ctx.tokenEstimate;
      }

      if (isWciContextKind(approach)) {
        const validIds = listAnnotatedNodeIds(scenario.annotatedHtml);
        const { correct, hitDecoy, parsed } = scoreWciPrediction(rawResponse, gt, validIds);
        scenarioResults.push({
          scenarioId: scenario.id,
          correct,
          hitDecoy,
          parsed,
          rawResponse,
          tokenEstimate,
        });
      } else {
        const scored = await scoreRawPrediction(
          scenario.rawHtml,
          approach === 'interactive-candidates' ? rawResponse : extractCssSelector(rawResponse) ?? rawResponse,
          gt
        );
        scenarioResults.push({
          scenarioId: scenario.id,
          correct: scored.correct,
          hitDecoy: false,
          parsed: scored.parsed,
          rawResponse,
          tokenEstimate,
          validationError: scored.validationError,
        });
      }
    }

    approaches[approach] = aggregateApproach(approach, scenarioResults);
  }

  const modelAgg: ModelAggregate = {
    modelId: 'heuristic',
    modelName: 'Deterministic heuristic (no LLM)',
    openRouterModel: '(none)',
    approaches,
  };

  return {
    generatedAt: new Date().toISOString(),
    methodology:
      'Deterministic keyword baselines. WCI: wci-full (all nodes, no patches) vs wci-grounding (actionable only, eval snapshot). Playwright validates raw selectors.',
    models: [modelAgg],
    leaderboard: buildLeaderboard([modelAgg]),
    groundTruthVerified: true,
  };
}

async function runLlmEval(
  models: typeof EVAL_MODELS,
  approachList: ContextKind[],
  logger?: LlmRunLogger
): Promise<EvalReport> {
  const modelAggregates: ModelAggregate[] = [];

  for (const modelCfg of models) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 ${modelCfg.name}`);
    console.log(`   OpenRouter: ${modelCfg.model}`);
    console.log('='.repeat(60));

    const approaches: Record<string, ApproachAggregate> = {};
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (const approach of approachList) {
      const scenarioResults: ScenarioRunResult[] = [];

      for (const scenario of activeScenarios) {
        const ctx = buildEvalContext(scenario, approach === 'wci-distilled' ? 'wci-grounding' : approach);
        const gt = getGroundTruth(scenario);
        process.stdout.write(`  ${scenario.id} [${approach}] ... `);

        try {
          const { raw, usageTokens, promptTokens, completionTokens, finishReason } =
            await queryModel(modelCfg.model, ctx);
          totalPromptTokens += promptTokens;
          totalCompletionTokens += completionTokens;
          const result = await evaluatePrediction(
            scenario,
            approach,
            raw,
            usageTokens || ctx.tokenEstimate
          );
          scenarioResults.push(result);
          if (logger) {
            logger.logExchange(
              buildLogEntry({
                modelId: modelCfg.id,
                modelName: modelCfg.name,
                openRouterModel: modelCfg.model,
                approach,
                scenario,
                gt,
                ctx,
                raw,
                promptTokens,
                completionTokens,
                finishReason,
                result,
              })
            );
          }
          const label = result.correct ? '✓' : '✗';
          const detail = result.parsed ?? (raw.slice(0, 40) || '(empty)');
          console.log(label, detail);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log('ERR', msg.slice(0, 60));
          const errResult: ScenarioRunResult = {
            scenarioId: scenario.id,
            correct: false,
            hitDecoy: false,
            parsed: null,
            rawResponse: msg,
            tokenEstimate: ctx.tokenEstimate,
            validationError: msg,
          };
          scenarioResults.push(errResult);
          if (logger) {
            logger.logExchange(
              buildLogEntry({
                modelId: modelCfg.id,
                modelName: modelCfg.name,
                openRouterModel: modelCfg.model,
                approach,
                scenario,
                gt,
                ctx,
                raw: '',
                promptTokens: 0,
                completionTokens: 0,
                error: msg,
                result: errResult,
              })
            );
          }
        }

        // Rate-limit courtesy pause
        await new Promise((r) => setTimeout(r, 400));
      }

      approaches[approach] = aggregateApproach(approach, scenarioResults);
      console.log(
        `  → ${approach}: ${approaches[approach].successRate}% (${approaches[approach].correct}/${approaches[approach].runs})`
      );
    }

    modelAggregates.push({
      modelId: modelCfg.id,
      modelName: modelCfg.name,
      openRouterModel: modelCfg.model,
      approaches,
      totalPromptTokens,
      totalCompletionTokens,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    methodology:
      'Element-grounding via OpenRouter. Baselines: raw HTML, DOM outline, interactive candidates. WCI: wci-full (full graph, no state patches) vs wci-grounding (actionable nodes, decision-point patches). Playwright validates raw paths. Temperature=0.',
    models: modelAggregates,
    leaderboard: buildLeaderboard(modelAggregates),
    groundTruthVerified: true,
  };
}

async function main() {
  const { heuristicOnly, verifyOnly, noLogs, models, approaches, scenarioIds } = parseArgs();
  activeScenarios = filterScenarios(scenarioIds);

  console.log('WCI Benchmark Evaluation\n');
  console.log(`Scenarios: ${activeScenarios.length}${scenarioIds?.length ? ` (filtered)` : ' (all)'}\n`);

  const gtOk = await verifyGroundTruth();
  if (!gtOk) {
    console.error('\n⚠️  Fix ground-truth selectors before trusting results.');
    if (verifyOnly) {
      await closeBrowser();
      process.exit(1);
    }
  }

  if (verifyOnly) {
    await closeBrowser();
    process.exit(gtOk ? 0 : 1);
  }

  if (!heuristicOnly && !process.env.OPENROUTER_API_KEY) {
    console.error('\n❌ OPENROUTER_API_KEY is not set.');
    console.error('   Add it to .env or export it, then re-run: npm run eval:benchmark');
    console.error('   Or run without API: npm run eval:heuristic\n');
    await closeBrowser();
    process.exit(1);
  }

  const runStartedAt = new Date().toISOString();
  const logger =
    !heuristicOnly && !noLogs ? new LlmRunLogger(LOGS_DIR) : undefined;
  if (logger) {
    logger.writeManifest({
      startedAt: runStartedAt,
      models: models.map((m) => ({ id: m.id, name: m.name, openRouterModel: m.model })),
      approaches,
      scenarios: activeScenarios.map((s) => s.id),
    });
    console.log(`📝 LLM I/O logs: ${logger.runDir}\n`);
  }

  const report = heuristicOnly
    ? await runHeuristicEval(approaches)
    : await runLlmEval(models, approaches, logger);

  await closeBrowser();

  const reportPath = path.join(OUT_DIR, 'eval-report.json');
  const leaderboardPath = path.join(OUT_DIR, 'eval-results.json');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const modelMeta = report.models.map((m) => ({
    id: m.modelId,
    name: m.modelName,
    openRouterModel: m.openRouterModel,
  }));

  fs.writeFileSync(
    leaderboardPath,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        modelOrder: modelMeta,
        ...report.leaderboard,
      },
      null,
      2
    )
  );

  console.log('\n📊 Summary (WCI grounding / WCI full / raw-html per model):');
  for (const m of report.models) {
    const wciGround = m.approaches['wci-grounding'] ?? m.approaches['wci-distilled'];
    const wciFull = m.approaches['wci-full'];
    const raw = m.approaches['raw-html'];
    console.log(
      `  ${m.modelId}: grounding ${wciGround?.successRate ?? '—'}% | full ${wciFull?.successRate ?? '—'}% | raw ${raw?.successRate ?? '—'}%`
    );
  }

  console.log(`\n✅ Full report: ${reportPath}`);
  console.log(`✅ Leaderboard: ${leaderboardPath}`);
  if (logger) {
    logger.writeManifest({
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      models: models.map((m) => ({ id: m.id, name: m.name, openRouterModel: m.model })),
      approaches,
      scenarios: activeScenarios.map((s) => s.id),
      reportPath,
      leaderboardPath,
    });
    console.log(`✅ LLM logs: ${logger.runDir}`);
  }
}

main().catch(async (e) => {
  console.error(e);
  await closeBrowser();
  process.exit(1);
});
