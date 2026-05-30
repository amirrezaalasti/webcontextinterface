#!/usr/bin/env node
/**
 * Agent-driven scenario builder.
 *
 * Iterates per scenario:
 *  1) model rewrites a complete functional raw.html
 *  2) model proposes annotation targets (generated scenarios)
 *  3) script validates selectors/decoys/structure
 *  4) retries with error feedback until pass
 *
 * Usage:
 *   node scripts/agent-build-scenarios.mjs --dry-run --limit=3
 *   node scripts/agent-build-scenarios.mjs --model=openai/gpt-5.4-mini --scenarios=job-board,email-client
 *   node scripts/agent-build-scenarios.mjs --legacy --attempts=4
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';

import { chatCompletion } from './lib/scenario-enrich-openrouter.mjs';
import { extractHtmlFromModel, validateEnrichedHtml } from './lib/scenario-enrich-validate.mjs';
import {
  rebuildAnnotated,
  writeScenarioHtml,
  countDomNodes,
} from './lib/scenario-enrich-annotate.mjs';
import { injectAnnotationTargets, sameDomSkeleton } from './lib/annotate-html.mjs';

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

let sharedBrowser = null;

async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

function slug(id) {
  return id.replace(/-/g, '_');
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag) => argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
  const scenarios = get('--scenarios')?.split(',').map((s) => s.trim()).filter(Boolean);
  const limit = get('--limit') ? Number(get('--limit')) : undefined;
  const attempts = Number(get('--attempts') ?? 3);
  const model = get('--model') ?? process.env.SCENARIO_AGENT_MODEL ?? 'openai/gpt-5.4-mini';
  const minGrowth = Number(get('--min-growth') ?? 0.15);
  const dryRun = argv.includes('--dry-run');
  const noSmoke = argv.includes('--no-smoke');
  // Default is all 50 scenarios. Use --no-legacy to skip the legacy five.
  const skipLegacy = argv.includes('--no-legacy');

  if (!Number.isFinite(attempts) || attempts < 1 || attempts > 8) {
    throw new Error('--attempts must be in [1, 8]');
  }
  if (!Number.isFinite(minGrowth) || minGrowth < 0 || minGrowth > 3) {
    throw new Error('--min-growth must be in [0, 3]');
  }
  return { scenarios, limit, attempts, model, minGrowth, dryRun, skipLegacy, noSmoke };
}

function readManifestIds() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return manifest.scenarios ?? [];
}

function selectIds(opts) {
  let ids = opts.scenarios?.length ? opts.scenarios : readManifestIds();
  if (opts.skipLegacy) ids = ids.filter((id) => !LEGACY_IDS.has(id));
  if (opts.limit != null && opts.limit > 0) ids = ids.slice(0, opts.limit);
  return ids;
}

function extractJsonFromModel(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;
  return JSON.parse(candidate);
}

function buildPrompt(meta, rawSeed, isLegacy, retryErrors = []) {
  const gt = meta.groundTruth ?? {};
  const requiredAnn = [];
  if (!isLegacy) {
    requiredAnn.push(`- page landmark id "${slug(meta.id)}-page" on selector [data-page="${meta.id}"]`);
  }
  requiredAnn.push(`- primary action id "${gt.wciNodeId}" on selector ${gt.rawSelectors?.[0] ?? '(missing)'}`);
  for (const decoy of gt.decoyNodeIds ?? []) {
    requiredAnn.push(`- decoy id "${decoy}" on selector [data-decoy="${decoy}"]`);
  }

  const errorBlock =
    retryErrors.length > 0
      ? `\nREPAIR ERRORS FROM LAST ATTEMPT:\n${retryErrors.map((e) => `- ${e}`).join('\n')}\n`
      : '';

  const system = `You are a senior web product engineer building realistic benchmark websites.
Create complete, functional HTML pages with realistic structure and content density.
Preserve evaluation anchors exactly; never break required selectors or data-* markers.
Include meaningful client-side JavaScript behavior (form validation, toggles/modals, dynamic state updates).
Return strict JSON only.`;

  const user = `SCENARIO:
- id: ${meta.id}
- title: ${meta.title}
- difficulty: ${meta.difficulty}
- description: ${meta.description}
- goal: ${meta.task?.goal ?? meta.description}
- challenges: ${(meta.challenges ?? []).join('; ')}

REQUIRED RAW HTML CONSTRAINTS:
- Keep and preserve ALL ground-truth selectors:
${(gt.rawSelectors ?? []).map((s) => `  - ${s}`).join('\n')}
- Keep and preserve decoy nodes:
${(gt.decoyNodeIds ?? []).map((id) => `  - [data-decoy="${id}"]`).join('\n') || '  - none'}
- ${isLegacy ? 'Legacy scenario: page root [data-page] is optional.' : `Generated scenario: include [data-page="${meta.id}"] on app root.`}
- Keep the page fully functional and realistic (header, content sections, controls, status/UI details), not a shallow stub.
- Add functional JavaScript: event handlers that update visible UI state (validation messages, enabled/disabled buttons, modals, status badges, counters, previews, etc.).
- Include at least one <script> block in the page.
- Include a visible smoke-status element: id="${meta.id}-smoke-status" (or [data-smoke-status]).
- On primary action click (${gt.rawSelectors?.[0] ?? 'primary selector'}), JavaScript must update:
  1) text content of smoke-status element
  2) window.__scenarioSmoke = { lastAction: "<non-empty>", updatedAt: <timestamp> }
- Keep existing class prefixes and important structure where possible.

ANNOTATION REQUIREMENTS:
${requiredAnn.join('\n')}

OUTPUT JSON SCHEMA:
{
  "rawHtml": "<!DOCTYPE html> ... complete document ...",
  "annotationTargets": [
    {
      "selector": "css selector",
      "wciId": "node-id",
      "desc": "human description",
      "role": "landmark|action|form|display|nav|status",
      "action": "click|fill|select|navigate",
      "priority": 1,
      "state": { "ready": true },
      "scope": "optional-parent-node-id"
    }
  ]
}

Rules:
- For legacy scenarios, annotationTargets may be empty (script will preserve existing rich annotation map).
- For generated scenarios, provide annotationTargets for required ids above.
- Return JSON only; no markdown.${errorBlock}

CURRENT RAW HTML (seed, improve this into a complete website):
${rawSeed.length > 120000 ? `${rawSeed.slice(0, 120000)}\n<!-- TRUNCATED -->` : rawSeed}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function normalizeTarget(t) {
  if (!t || typeof t !== 'object') return null;
  const selector = typeof t.selector === 'string' ? t.selector.trim() : '';
  const wciId = typeof t.wciId === 'string' ? t.wciId.trim() : '';
  if (!selector || !wciId) return null;
  const role = typeof t.role === 'string' ? t.role : undefined;
  const action = typeof t.action === 'string' ? t.action : undefined;
  const desc = typeof t.desc === 'string' ? t.desc : wciId;
  const priority = Number.isFinite(t.priority) ? t.priority : undefined;
  const attrs = {
    'data-agent-id': wciId,
    'data-agent-desc': desc,
    ...(role ? { 'data-agent-role': role } : {}),
    ...(action ? { 'data-agent-action': action } : {}),
    ...(priority != null ? { 'data-agent-priority': String(priority) } : {}),
    ...(t.scope ? { 'data-agent-scope': String(t.scope) } : {}),
    ...(t.state && typeof t.state === 'object' ? { 'data-agent-state': JSON.stringify(t.state) } : {}),
  };
  return { selector, wciId, attrs };
}

function requiredTargets(meta, isLegacy) {
  const out = [];
  const gt = meta.groundTruth ?? {};
  if (!isLegacy) {
    out.push({
      selector: `[data-page="${meta.id}"]`,
      wciId: `${slug(meta.id)}-page`,
      attrs: {
        'data-agent-id': `${slug(meta.id)}-page`,
        'data-agent-role': 'landmark',
        'data-agent-desc': `${meta.title} — ${meta.description ?? 'scenario page'}`,
        'data-agent-priority': '2',
      },
    });
  }
  out.push({
    selector: gt.rawSelectors?.[0],
    wciId: gt.wciNodeId,
    attrs: {
      'data-agent-id': gt.wciNodeId,
      'data-agent-role': 'action',
      'data-agent-action': 'click',
      'data-agent-desc': meta.task?.goal ?? meta.description ?? 'primary action',
      'data-agent-priority': '1',
      'data-agent-state': JSON.stringify({ ready: true }),
    },
  });
  for (const id of gt.decoyNodeIds ?? []) {
    out.push({
      selector: `[data-decoy="${id}"]`,
      wciId: id,
      attrs: {
        'data-agent-id': id,
        'data-agent-role': 'action',
        'data-agent-action': 'click',
        'data-agent-desc': `Decoy: ${id}`,
        'data-agent-priority': '5',
      },
    });
  }
  return out.filter((t) => typeof t.selector === 'string' && t.selector.length > 0);
}

function mergeTargets(modelTargets, meta, isLegacy) {
  const required = requiredTargets(meta, isLegacy);
  const normalized = (modelTargets ?? []).map(normalizeTarget).filter(Boolean);
  const byId = new Map(normalized.map((t) => [t.wciId, t]));

  for (const req of required) {
    if (!byId.has(req.wciId)) {
      byId.set(req.wciId, req);
    } else {
      const cur = byId.get(req.wciId);
      if (!cur.selector) cur.selector = req.selector;
      cur.attrs = { ...req.attrs, ...cur.attrs };
      byId.set(req.wciId, cur);
    }
  }
  return [...byId.values()].map((t) => ({ selector: t.selector, attrs: t.attrs }));
}

function validateAnnotatedHtml(rawHtml, annotatedHtml, meta, isLegacy) {
  const errors = [];
  const warnings = [];
  if (!sameDomSkeleton(rawHtml, annotatedHtml)) {
    errors.push('Annotated DOM skeleton changed unexpectedly');
  }
  const doc = new JSDOM(annotatedHtml).window.document;
  const gt = meta.groundTruth ?? {};
  const requiredIds = [
    ...(isLegacy ? [] : [`${slug(meta.id)}-page`]),
    gt.wciNodeId,
    ...(gt.decoyNodeIds ?? []),
  ];
  for (const id of requiredIds) {
    if (!id) continue;
    const n = doc.querySelectorAll(`[data-agent-id="${id}"]`).length;
    if (n === 0) errors.push(`Missing annotation id: ${id}`);
    if (n > 1) warnings.push(`Annotation id appears multiple times: ${id} (${n})`);
  }

  const primarySel = gt.rawSelectors?.[0];
  if (primarySel) {
    try {
      const el = doc.querySelector(primarySel);
      if (!el) errors.push(`Primary selector not found in annotated: ${primarySel}`);
      else if (el.getAttribute('data-agent-id') !== gt.wciNodeId) {
        errors.push(`Primary selector does not map to data-agent-id=${gt.wciNodeId}`);
      }
    } catch (e) {
      errors.push(`Invalid primary selector in annotated check: ${e.message}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

async function runFunctionalSmoke(rawHtml, meta) {
  const errors = [];
  const warnings = [];
  const pageErrors = [];
  const browser = await getBrowser();
  const page = await browser.newPage();
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  try {
    await page.setContent(rawHtml, { waitUntil: 'domcontentloaded' });
    const statusSelector = `#${meta.id}-smoke-status, [data-smoke-status]`;
    const statusCount = await page.locator(statusSelector).count();
    if (statusCount < 1) {
      errors.push(`Missing smoke status element (${statusSelector})`);
      await page.close();
      return { ok: false, errors, warnings };
    }

    let primarySel = null;
    for (const sel of meta.groundTruth?.rawSelectors ?? []) {
      try {
        const n = await page.locator(sel).count();
        if (n > 0) {
          primarySel = sel;
          break;
        }
      } catch {
        warnings.push(`Skipped non-queryable primary selector in smoke check: ${sel}`);
      }
    }
    if (!primarySel) {
      errors.push('No queryable primary selector for runtime smoke check');
      await page.close();
      return { ok: false, errors, warnings };
    }

    const before = await page
      .locator(statusSelector)
      .first()
      .textContent();

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, primarySel);
    await page.waitForTimeout(120);

    const after = await page
      .locator(statusSelector)
      .first()
      .textContent();
    const smoke = await page.evaluate(() => (window).__scenarioSmoke ?? null);

    const textChanged = (before ?? '').trim() !== (after ?? '').trim();
    const lastActionSet = Boolean(smoke && typeof smoke.lastAction === 'string' && smoke.lastAction.trim());
    if (!textChanged && !lastActionSet) {
      errors.push('Primary action did not update smoke status text or window.__scenarioSmoke.lastAction');
    }

    if (pageErrors.length > 0) {
      errors.push(`Runtime JS errors detected: ${pageErrors[0]}`);
    }

    await page.close();
    return { ok: errors.length === 0, errors, warnings };
  } catch (e) {
    await page.close();
    return { ok: false, errors: [`Functional smoke failed: ${e.message}`], warnings };
  }
}

async function buildScenario(id, opts) {
  const dir = path.join(SCENARIOS_DIR, id);
  const metaPath = path.join(dir, 'meta.json');
  const rawPath = path.join(dir, 'raw.html');
  const annPath = path.join(dir, 'annotated.html');
  if (!fs.existsSync(metaPath) || !fs.existsSync(rawPath) || !fs.existsSync(annPath)) {
    return { id, status: 'skip', reason: 'missing meta/raw/annotated file' };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const rawSeed = fs.readFileSync(rawPath, 'utf8');
  const annSeed = fs.readFileSync(annPath, 'utf8');
  const isLegacy = LEGACY_IDS.has(id);
  const baseNodes = countDomNodes(rawSeed);

  if (opts.dryRun) {
    return { id, status: 'dry-run', model: opts.model, baseNodes, legacy: isLegacy };
  }

  let retryErrors = [];
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    const messages = buildPrompt(meta, rawSeed, isLegacy, retryErrors);
    let response;
    try {
      response = await chatCompletion(messages, {
        model: opts.model,
        temperature: 0.3,
        maxTokens: isLegacy ? 24000 : 18000,
      });
    } catch (e) {
      retryErrors = [`model call failed: ${e.message}`];
      continue;
    }

    let payload;
    try {
      payload = extractJsonFromModel(response.content);
    } catch (e) {
      retryErrors = [`invalid JSON output: ${e.message}`];
      continue;
    }

    const candidateRaw = typeof payload.rawHtml === 'string'
      ? payload.rawHtml.trim()
      : extractHtmlFromModel(response.content);

    if (!candidateRaw) {
      retryErrors = ['missing rawHtml in model output'];
      continue;
    }

    const rawValidation = validateEnrichedHtml(candidateRaw, meta, { legacy: isLegacy });
    const grownNodes = countDomNodes(candidateRaw);
    const growth = baseNodes > 0 ? (grownNodes - baseNodes) / baseNodes : 0;
    const effectiveMinGrowth = isLegacy ? Math.min(opts.minGrowth, 0.03) : opts.minGrowth;
    const hasScript = /<script[\s>]/i.test(candidateRaw);
    if (!rawValidation.ok || growth < effectiveMinGrowth || !hasScript) {
      retryErrors = [
        ...rawValidation.errors,
        ...(growth < effectiveMinGrowth
          ? [`insufficient complexity growth: ${(growth * 100).toFixed(1)}% < ${(effectiveMinGrowth * 100).toFixed(1)}%`]
          : []),
        ...(!hasScript ? ['missing <script> block with functional JS behavior'] : []),
      ];
      continue;
    }

    let annotated;
    try {
      if (isLegacy) {
        annotated = rebuildAnnotated(id, candidateRaw, meta, annSeed);
      } else {
        const mergedTargets = mergeTargets(payload.annotationTargets, meta, false);
        annotated = injectAnnotationTargets(candidateRaw, mergedTargets, { scenarioId: id });
      }
    } catch (e) {
      retryErrors = [`annotation build failed: ${e.message}`];
      continue;
    }

    const annValidation = validateAnnotatedHtml(candidateRaw, annotated, meta, isLegacy);
    if (!annValidation.ok) {
      retryErrors = annValidation.errors;
      continue;
    }

    if (!opts.noSmoke) {
      const smokeValidation = await runFunctionalSmoke(candidateRaw, meta);
      if (!smokeValidation.ok) {
        retryErrors = smokeValidation.errors;
        continue;
      }
    }

    writeScenarioHtml(dir, candidateRaw, annotated, id);
    return {
      id,
      status: 'ok',
      attempt,
      model: opts.model,
      baseNodes,
      nodes: grownNodes,
      growthPct: Number((growth * 100).toFixed(1)),
      usage: response.usage,
      warnings: [...rawValidation.warnings, ...annValidation.warnings],
    };
  }

  return { id, status: 'fail', errors: retryErrors };
}

async function main() {
  const opts = parseArgs();
  const ids = selectIds(opts);
  if (!ids.length) {
    console.log('No scenarios selected.');
    process.exit(0);
  }

  console.log(
    `Agent-building ${ids.length} scenario(s) · model=${opts.model} · attempts=${opts.attempts}${opts.dryRun ? ' · dry-run' : ''}`
  );
  if (opts.skipLegacy) console.log('(Legacy 5 skipped via --no-legacy)');

  const results = [];
  for (const id of ids) {
    process.stdout.write(`${id} … `);
    try {
      const r = await buildScenario(id, opts);
      results.push(r);
      if (r.status === 'ok') {
        console.log(`✓ +${r.growthPct}% nodes (attempt ${r.attempt})`);
      } else if (r.status === 'dry-run') {
        console.log(`dry-run (${r.baseNodes} nodes)`);
      } else {
        console.log(`✗ ${r.reason ?? r.errors?.join('; ') ?? r.status}`);
      }
    } catch (e) {
      results.push({ id, status: 'error', message: String(e) });
      console.log(`✗ ${e.message}`);
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  if (opts.dryRun) {
    console.log(`\nDone: inspected ${ids.length} scenario(s) (dry-run; no files changed)`);
  } else {
    console.log(`\nDone: ${ok}/${ids.length} scenarios built`);
  }
  if (ok > 0 && !opts.dryRun) {
    console.log('Run: npm run eval:verify && npm run eval:multistep -- --heuristic-only');
  }

  const logPath = path.join(SCENARIOS_DIR, 'agent-build-log.json');
  fs.writeFileSync(
    logPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), opts, results }, null, 2) + '\n',
    'utf8'
  );
  console.log(`Log: ${logPath}`);
  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  closeBrowser().catch(() => {});
  process.exit(1);
});

