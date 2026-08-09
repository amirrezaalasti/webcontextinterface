/**
 * Diagnose the raw-html baseline's 0% result.
 *
 * A 0% score can mean the model failed at DOM-based grounding, or it can mean
 * the harness never showed the model the answer. The leaderboard truncates
 * raw.html to a fixed character budget; if the ground-truth element sits past
 * that offset, the score says nothing about grounding ability. This separates
 * the two by reporting where each target lands relative to the budget.
 *
 *   npx tsx evals/diagnose-truncation.ts
 *   npx tsx evals/diagnose-truncation.ts --json
 */
import { chromium, type Page } from 'playwright';
import { SCENARIO_GROUND_TRUTH } from './lib/ground-truth';
import { EVAL_CONTEXT_LIMITS } from './lib/eval-config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const asJson = process.argv.includes('--json');

interface Row {
  scenario: string;
  rawChars: number;
  /** Character offset of the ground-truth element's opening tag in raw.html. */
  gtOffset: number | null;
  selector: string | null;
  survivesMultistep: boolean;
  survivesSingleShot: boolean;
}

/**
 * Locate the ground-truth element's character offset in the source HTML.
 *
 * Resolution runs through Playwright, not jsdom: the ground-truth selectors use
 * Playwright-only syntax such as `:has-text()`, and using the same engine as
 * the scoring harness means this measures the elements the harness actually
 * scores. The browser does not expose source positions, so the element's
 * opening tag is reconstructed and searched for in the original text.
 */
async function findOffset(page: Page, html: string, selector: string): Promise<number | null> {
  let outer: string;
  try {
    const loc = page.locator(selector);
    if (await loc.count() === 0) return null;
    outer = await loc.first().evaluate((el) => (el as Element).outerHTML);
  } catch {
    return null;
  }

  const openTag = outer.slice(0, outer.indexOf('>') + 1);
  const idx = html.indexOf(openTag);
  if (idx !== -1) return idx;

  // The parser normalises attribute quoting and ordering on some elements;
  // fall back to the most distinctive attribute present.
  const idMatch = /\sid="([^"]+)"/.exec(openTag);
  if (idMatch) {
    const byId = html.indexOf(`id="${idMatch[1]}"`);
    if (byId !== -1) return byId;
  }
  const wciMatch = /\sdata-wci-id="([^"]+)"/.exec(openTag);
  if (wciMatch) {
    const byWci = html.indexOf(`data-wci-id="${wciMatch[1]}"`);
    if (byWci !== -1) return byWci;
  }
  return null;
}

async function main(): Promise<void> {
  const MULTISTEP = EVAL_CONTEXT_LIMITS.multistep.rawHtmlMaxChars;
  const SINGLE_SHOT = EVAL_CONTEXT_LIMITS.singleShot.rawHtmlMaxChars;

  const rows: Row[] = [];
  const browser = await chromium.launch({ headless: true });

  for (const [scenarioId, gt] of Object.entries(SCENARIO_GROUND_TRUTH)) {
    let html: string;
    try {
      html = readFileSync(resolve(ROOT, 'demo/scenarios', scenarioId, 'raw.html'), 'utf8');
    } catch {
      continue;
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    let offset: number | null = null;
    let matched: string | null = null;
    for (const sel of gt.rawSelectors) {
      offset = await findOffset(page, html, sel);
      if (offset !== null) { matched = sel; break; }
    }
    await page.close();

    rows.push({
      scenario: scenarioId,
      rawChars: html.length,
      gtOffset: offset,
      selector: matched,
      survivesMultistep: offset !== null && offset < MULTISTEP,
      survivesSingleShot: offset !== null && offset < SINGLE_SHOT,
    });
  }

  await browser.close();

  const located = rows.filter(r => r.gtOffset !== null);
  const survMulti = located.filter(r => r.survivesMultistep);
  const survSingle = located.filter(r => r.survivesSingleShot);
  const truncatedAway = located.filter(r => !r.survivesMultistep);

  if (asJson) {
    console.log(JSON.stringify({
      limits: { multistep: MULTISTEP, singleShot: SINGLE_SHOT },
      scenarios: rows.length,
      located: located.length,
      survivesMultistep: survMulti.length,
      survivesSingleShot: survSingle.length,
      rows,
    }, null, 2));
    process.exit(0);
  }

  const pct = (n: number, d: number): string => d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`;

  console.log('\nRaw-HTML truncation diagnostic');
  console.log('═'.repeat(72));
  console.log(`Scenarios with ground truth      ${rows.length}`);
  console.log(`Ground-truth element located     ${located.length}`);
  console.log('');
  console.log(`Multistep limit  ${String(MULTISTEP).padStart(6)} chars  →  ` +
    `target present in ${survMulti.length}/${located.length} (${pct(survMulti.length, located.length)})`);
  console.log(`Single-shot limit ${String(SINGLE_SHOT).padStart(5)} chars  →  ` +
    `target present in ${survSingle.length}/${located.length} (${pct(survSingle.length, located.length)})`);
  console.log('');

  const sizes = located.map(r => r.rawChars).sort((a, b) => a - b);
  console.log(`raw.html size: min ${sizes[0]}, median ${sizes[Math.floor(sizes.length / 2)]}, max ${sizes[sizes.length - 1]}`);
  console.log('');

  if (truncatedAway.length) {
    console.log(`Truncated away by the multistep limit (${truncatedAway.length}):`);
    console.log('');
    console.log('  offset    size  scenario');
    console.log('  ' + '─'.repeat(60));
    for (const r of truncatedAway.sort((a, b) => (b.gtOffset ?? 0) - (a.gtOffset ?? 0)).slice(0, 20)) {
      console.log(`  ${String(r.gtOffset).padStart(6)}  ${String(r.rawChars).padStart(6)}  ${r.scenario}`);
    }
    if (truncatedAway.length > 20) console.log(`  … and ${truncatedAway.length - 20} more`);
    console.log('');
  }

  const ceiling = pct(survMulti.length, located.length);
  console.log('─'.repeat(72));
  console.log(`Ceiling on raw-html accuracy at the published limit: ${ceiling}`);
  console.log('A model cannot select an element it was never shown. Any raw-html');
  console.log('score must be read against this ceiling, not against 100%.');
  console.log('');

  // Sweep the budget so a defensible limit can be chosen from data rather
  // than guessed. ~3.7 chars/token is the distiller's own estimator.
  console.log('Coverage by character budget');
  console.log('  budget    targets present   ~tokens');
  console.log('  ' + '─'.repeat(46));
  for (const budget of [12_000, 16_000, 24_000, 28_000, 40_000, 60_000, 90_000]) {
    const covered = located.filter(r => (r.gtOffset ?? Infinity) < budget).length;
    const bar = '█'.repeat(Math.round((covered / located.length) * 20)).padEnd(20, '·');
    console.log(
      `  ${String(budget).padStart(6)}  ${bar} ${pct(covered, located.length).padStart(6)}` +
      `  ~${Math.round(budget / 3.7 / 1000)}k`,
    );
  }
  console.log('');
  const full = Math.max(...located.map(r => r.rawChars));
  console.log(`Every page fits whole at ${full} chars (~${Math.round(full / 3.7 / 1000)}k tokens).`);
  console.log('');

}

main();
