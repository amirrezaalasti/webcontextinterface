/**
 * Measure how much of the WCI annotation layer can be recovered without an
 * operator.
 *
 * Do WCI's gains come from the framework, or simply from curated inputs? Hold
 * the framework fixed and remove the curation: run inference over `raw.html`
 * and compare the derived node set against the hand-authored `annotated.html`.
 * The gap is what an operator's annotations actually buy.
 *
 *   npx tsx evals/measure-inference-gap.ts
 *   npx tsx evals/measure-inference-gap.ts --json
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inferAnnotations } from '../packages/annotator/src/index';
import { SCENARIO_GROUND_TRUTH } from './lib/ground-truth';

const ROOT = resolve(import.meta.dirname, '..');
const asJson = process.argv.includes('--json');

interface ScenarioResult {
  scenario: string;
  curatedNodes: number;
  inferredNodes: number;
  /** Ground-truth target recovered as an actionable inferred node. */
  targetRecovered: boolean;
  /** Rank of the target in the inferred priority ordering (1-based). */
  targetRank: number | null;
  meanConfidence: number;
  /** Mean description length — a proxy for how much semantics survived. */
  curatedDescChars: number;
  inferredDescChars: number;
}

/**
 * Does an inferred node point at the same element as the ground truth?
 *
 * The two documents share a DOM, so equivalence is checked structurally: the
 * inferred selector is resolved against raw.html and compared with the element
 * the curated `data-wci-id` marks in annotated.html.
 */
function targetIndexOf(
  rawDoc: Document,
  annotatedDoc: Document,
  inferredSelectors: string[],
  wciNodeId: string,
): number | null {
  const curated = annotatedDoc.querySelector(`[data-wci-id="${wciNodeId}"]`);
  if (!curated) return null;

  // Identify the curated element by a signature that survives the annotation
  // pass: tag, trimmed text, and the stable native attributes.
  const sig = (el: Element): string => [
    el.tagName,
    (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    el.getAttribute('id') ?? '',
    el.getAttribute('name') ?? '',
    el.getAttribute('type') ?? '',
    el.getAttribute('href') ?? '',
  ].join('|');

  const target = sig(curated);

  for (let i = 0; i < inferredSelectors.length; i++) {
    let el: Element | null = null;
    try { el = rawDoc.querySelector(inferredSelectors[i]); } catch { continue; }
    if (el && sig(el) === target) return i + 1;
  }
  return null;
}

const results: ScenarioResult[] = [];

for (const [scenarioId, gt] of Object.entries(SCENARIO_GROUND_TRUTH)) {
  let rawHtml: string;
  let annotatedHtml: string;
  try {
    rawHtml = readFileSync(resolve(ROOT, 'demo/scenarios', scenarioId, 'raw.html'), 'utf8');
    annotatedHtml = readFileSync(resolve(ROOT, 'demo/scenarios', scenarioId, 'annotated.html'), 'utf8');
  } catch {
    continue;
  }

  const rawDoc = new JSDOM(rawHtml).window.document;
  const annotatedDoc = new JSDOM(annotatedHtml).window.document;

  const report = inferAnnotations(rawDoc);

  const curated = Array.from(annotatedDoc.querySelectorAll('[data-wci-id]'));
  const curatedDescs = curated
    .map(el => el.getAttribute('data-wci-desc') ?? '')
    .filter(Boolean);

  const rank = targetIndexOf(
    rawDoc, annotatedDoc,
    report.nodes.map(n => n.selector),
    gt.wciNodeId,
  );

  results.push({
    scenario: scenarioId,
    curatedNodes: curated.length,
    inferredNodes: report.nodes.length,
    targetRecovered: rank !== null,
    targetRank: rank,
    meanConfidence: report.meanConfidence,
    curatedDescChars: curatedDescs.length
      ? Math.round(curatedDescs.reduce((s, d) => s + d.length, 0) / curatedDescs.length)
      : 0,
    inferredDescChars: report.nodes.length
      ? Math.round(report.nodes.reduce((s, n) => s + n.desc.length, 0) / report.nodes.length)
      : 0,
  });
}

const mean = (xs: number[]): number =>
  xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)) : 0;

const recovered = results.filter(r => r.targetRecovered);
const ranks = recovered.map(r => r.targetRank!);

if (asJson) {
  console.log(JSON.stringify({
    scenarios: results.length,
    targetRecoveryRate: results.length ? recovered.length / results.length : 0,
    meanTargetRank: mean(ranks),
    results,
  }, null, 2));
  process.exit(0);
}

const pct = (n: number, d: number): string => d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`;

console.log('\nInference vs. curated annotation');
console.log('═'.repeat(72));
console.log(`Scenarios                          ${results.length}`);
console.log('');
console.log('Coverage');
console.log(`  Curated nodes per page (mean)    ${mean(results.map(r => r.curatedNodes))}`);
console.log(`  Inferred nodes per page (mean)   ${mean(results.map(r => r.inferredNodes))}`);
console.log('');
console.log('Target recovery — is the correct element in the inferred node set at all?');
console.log(`  Recovered                        ${recovered.length}/${results.length} (${pct(recovered.length, results.length)})`);
console.log(`  Mean rank when recovered         ${mean(ranks)}`);
console.log(`  Recovered in top 10              ${pct(ranks.filter(r => r <= 10).length, ranks.length)}`);
console.log(`  Recovered in top 20              ${pct(ranks.filter(r => r <= 20).length, ranks.length)}`);
console.log('');
console.log('Description quality — what curation buys');
console.log(`  Curated desc length (mean)       ${mean(results.map(r => r.curatedDescChars))} chars`);
console.log(`  Inferred desc length (mean)      ${mean(results.map(r => r.inferredDescChars))} chars`);
console.log(`  Mean inference confidence        ${mean(results.map(r => r.meanConfidence))}`);
console.log('');

const missed = results.filter(r => !r.targetRecovered);
if (missed.length) {
  console.log(`Target not recovered (${missed.length}): ${missed.slice(0, 12).map(r => r.scenario).join(', ')}`);
  if (missed.length > 12) console.log(`  … and ${missed.length - 12} more`);
  console.log('');
}

console.log('─'.repeat(72));
console.log('Reading this: recovery measures whether the framework alone — pruning,');
console.log('typed roles, priority ranking — surfaces the right element without any');
console.log('operator input. The description-length gap is the part only a human');
console.log('(or an LLM annotation pass) can supply.');
console.log('');
