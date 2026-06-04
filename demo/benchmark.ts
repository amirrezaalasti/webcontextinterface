// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM Benchmark — scenario registry, HTML loader, metrics engine
// HTML lives under demo/scenarios/{id}/raw.html and annotated.html
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import manifest from './scenarios/manifest.json';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BenchmarkScenario {
  id: string;
  title: string;
  icon: string;
  difficulty: 'Hard' | 'Very Hard' | 'Extreme';
  description: string;
  challenges: string[];
  rawHtml: string;
  annotatedHtml: string;
  /** Annotation density on annotated.html (from meta.benchmark when present). */
  benchmark?: ScenarioBenchmarkCounts;
  task: {
    goal: string;
    standardSteps: TaskStep[];
    agentdomSteps: TaskStep[];
  };
}

export interface TaskStep {
  action: string;
  target: string;
  outcome: 'success' | 'fail' | 'confused' | 'backtrack';
  note: string;
}

/** Per-page WCI annotation counts (from annotated.html). */
export interface ScenarioBenchmarkCounts {
  wciNodes: number;
  wciAttributes: number;
  wciIds: number;
  /** All DOM elements on the page (same tree as raw.html). */
  totalElements: number;
  /** wciNodes as % of totalElements. */
  wciNodeSharePct: number;
  attrsPerNode: number;
}

export interface BenchmarkMetrics {
  rawTokens: number;
  distilledTokens: number;
  tokenReduction: number;
  rawElements: number;
  rawInteractive: number;
  distilledNodes: number;
  wciAttributes: number;
  noiseElements: number;
  falsePositives: number;
  standardSteps: number;
  agentdomSteps: number;
  stepReduction: number;
}

export interface BenchmarkCountSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface BenchmarkSuiteAnnotationStats {
  wciAttributes: BenchmarkCountSummary;
  wciNodes: BenchmarkCountSummary;
  /** DOM nodes per website (one static page per scenario). */
  pageElements?: BenchmarkCountSummary;
  totalElements?: BenchmarkCountSummary;
  wciNodeSharePct?: BenchmarkCountSummary;
}

interface ScenarioMeta {
  id: string;
  title: string;
  icon: string;
  difficulty: BenchmarkScenario['difficulty'];
  description: string;
  challenges: string[];
  benchmark?: ScenarioBenchmarkCounts;
  task: BenchmarkScenario['task'];
}

const WCI_STYLE_ATTR = 'data-wci-legacy-styles';

/** Count semantic data-wci-* annotations (browser or Node DOMParser). */
export function countWciAnnotationsFromHtml(
  html: string
): Omit<ScenarioBenchmarkCounts, 'attrsPerNode'> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allElements = doc.querySelectorAll('*');
  const totalElements = allElements.length;
  let wciNodes = 0;
  let wciAttributes = 0;
  let wciIds = 0;

  allElements.forEach((el) => {
    let hasWci = false;
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith('data-wci-') || attr.name === WCI_STYLE_ATTR) continue;
      wciAttributes++;
      hasWci = true;
    }
    if (hasWci) wciNodes++;
    if (el.hasAttribute('data-wci-id')) wciIds++;
  });

  const wciNodeSharePct =
    totalElements > 0 ? Math.round((wciNodes / totalElements) * 1000) / 10 : 0;

  return { wciNodes, wciAttributes, wciIds, totalElements, wciNodeSharePct };
}

// ── HTML loading (Node fs + Vite import.meta.glob) ───────────────────────────

const SCENARIOS_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'scenarios');

/** True in Node (eval CLI); false in the browser (Vite may still define `process`). */
function isNodeRuntime(): boolean {
  return typeof window === 'undefined';
}

/** Vite-only: eager ?raw bundles for browser demo */
const browserRawGlob: Record<string, string> = isNodeRuntime()
  ? {}
  : (import.meta.glob('./scenarios/*/raw.html', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>);

const browserAnnotatedGlob: Record<string, string> = isNodeRuntime()
  ? {}
  : (import.meta.glob('./scenarios/*/annotated.html', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>);

function loadHtmlFromDisk(id: string, kind: 'raw' | 'annotated'): string {
  const file = kind === 'raw' ? 'raw.html' : 'annotated.html';
  return readFileSync(join(SCENARIOS_ROOT, id, file), 'utf-8');
}

function loadHtmlFromGlob(id: string, kind: 'raw' | 'annotated'): string {
  const key = `./scenarios/${id}/${kind}.html`;
  const map = kind === 'raw' ? browserRawGlob : browserAnnotatedGlob;
  const html = map[key];
  if (!html) {
    throw new Error(`Missing bundled HTML for scenario "${id}" (${kind})`);
  }
  return html;
}

function loadScenarioHtml(id: string): { rawHtml: string; annotatedHtml: string } {
  if (isNodeRuntime()) {
    return {
      rawHtml: loadHtmlFromDisk(id, 'raw'),
      annotatedHtml: loadHtmlFromDisk(id, 'annotated'),
    };
  }
  return {
    rawHtml: loadHtmlFromGlob(id, 'raw'),
    annotatedHtml: loadHtmlFromGlob(id, 'annotated'),
  };
}

function loadMeta(id: string): ScenarioMeta {
  if (isNodeRuntime()) {
    return JSON.parse(readFileSync(join(SCENARIOS_ROOT, id, 'meta.json'), 'utf-8')) as ScenarioMeta;
  }
  // Browser: meta is inlined at build time via the same manifest-driven list
  return JSON.parse(metaJsonById[id]) as ScenarioMeta;
}

/** Eager meta JSON for browser bundle (Vite inlines these imports). */
const metaJsonById: Record<string, string> = isNodeRuntime()
  ? {}
  : Object.fromEntries(
      Object.entries(
        import.meta.glob('./scenarios/*/meta.json', {
          query: '?raw',
          import: 'default',
          eager: true,
        }) as Record<string, string>
      ).map(([path, json]) => {
        const id = path.match(/\.\/scenarios\/([^/]+)\/meta\.json$/)?.[1];
        if (!id) throw new Error(`Invalid meta path: ${path}`);
        return [id, json];
      })
    );

function resolveBenchmarkCounts(
  meta: ScenarioMeta,
  annotatedHtml: string
): ScenarioBenchmarkCounts {
  if (meta.benchmark?.wciNodes != null && meta.benchmark.wciAttributes != null) {
    const b = meta.benchmark;
    const totalElements =
      b.totalElements ?? countElements(annotatedHtml);
    const wciNodeSharePct =
      b.wciNodeSharePct ??
      (totalElements > 0
        ? Math.round((b.wciNodes / totalElements) * 1000) / 10
        : 0);
    return {
      wciNodes: b.wciNodes,
      wciAttributes: b.wciAttributes,
      wciIds: b.wciIds ?? b.wciNodes,
      totalElements,
      wciNodeSharePct,
      attrsPerNode:
        b.attrsPerNode ??
        Math.round((b.wciAttributes / b.wciNodes) * 100) / 100,
    };
  }
  const counts = countWciAnnotationsFromHtml(annotatedHtml);
  return {
    ...counts,
    attrsPerNode: Math.round((counts.wciAttributes / counts.wciNodes) * 100) / 100,
  };
}

function buildScenario(id: string): BenchmarkScenario {
  const meta = loadMeta(id);
  const { rawHtml, annotatedHtml } = loadScenarioHtml(id);
  return {
    id: meta.id,
    title: meta.title,
    icon: meta.icon,
    difficulty: meta.difficulty,
    description: meta.description,
    challenges: meta.challenges,
    rawHtml,
    annotatedHtml,
    benchmark: resolveBenchmarkCounts(meta, annotatedHtml),
    task: meta.task,
  };
}

/** All benchmark scenario ids from manifest.json */
export const SCENARIO_IDS: readonly string[] = manifest.scenarios;

/** Filter scenarios by id (empty = all). Used by eval CLI `--scenarios=`. */
let scenariosCache: BenchmarkScenario[] | null = null;

/** Build scenario payloads on first use (avoids blocking the demo form on 50× HTML parse). */
export function loadScenarios(): BenchmarkScenario[] {
  if (!scenariosCache) {
    scenariosCache = manifest.scenarios.map(buildScenario);
  }
  return scenariosCache;
}

export function filterScenarios(ids?: string[]): BenchmarkScenario[] {
  const all = loadScenarios();
  if (!ids?.length) return [...all];
  const set = new Set(ids);
  const filtered = all.filter((s) => set.has(s.id));
  const missing = ids.filter((id) => !all.some((s) => s.id === id));
  if (missing.length) {
    throw new Error(`Unknown scenario id(s): ${missing.join(', ')}`);
  }
  return filtered;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

function countElements(html: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.querySelectorAll('*').length;
}

function countInteractive(html: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.querySelectorAll(
    'a, button, input, select, textarea, [role="button"], [onclick], [tabindex]'
  ).length;
}

// ══════════════════════════════════════════════════════════════════════════════
// Benchmark Engine
// ══════════════════════════════════════════════════════════════════════════════

export class BenchmarkEngine {
  computeMetrics(scenario: BenchmarkScenario): BenchmarkMetrics {
    const rawTokens = estimateTokens(scenario.rawHtml);
    const distilledJson = this.buildDistilledView(scenario.annotatedHtml);
    const distilledTokens = estimateTokens(distilledJson);

    const parser = new DOMParser();
    const annotatedDoc = parser.parseFromString(scenario.annotatedHtml, 'text/html');
    const distilledNodes =
      scenario.benchmark?.wciNodes ??
      annotatedDoc.querySelectorAll('[data-wci-id]').length;
    const wciAttributes =
      scenario.benchmark?.wciAttributes ??
      countWciAnnotationsFromHtml(scenario.annotatedHtml).wciAttributes;

    const rawElements = countElements(scenario.rawHtml);
    const rawInteractive = countInteractive(scenario.rawHtml);
    const falsePositives = Math.max(0, rawInteractive - distilledNodes - 5);
    const tokenReduction = Math.round((1 - distilledTokens / rawTokens) * 100);
    const noiseElements = rawElements - distilledNodes;

    return {
      rawTokens,
      distilledTokens,
      tokenReduction,
      rawElements,
      rawInteractive,
      distilledNodes,
      wciAttributes,
      noiseElements,
      falsePositives,
      standardSteps: scenario.task.standardSteps.length,
      agentdomSteps: scenario.task.agentdomSteps.length,
      stepReduction: Math.round(
        (1 - scenario.task.agentdomSteps.length / scenario.task.standardSteps.length) * 100
      ),
    };
  }

  buildOutline(html: string, maxLines = 60): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const root = doc.body || doc.documentElement;
    const lines: string[] = [];

    const walk = (el: Element, depth: number): void => {
      if (lines.length >= maxLines) return;
      const tag = el.tagName.toLowerCase();
      if (
        ['script', 'style', 'noscript', 'svg', 'path', 'line', 'circle', 'rect', 'polyline', 'polygon'].includes(
          tag
        )
      ) {
        return;
      }
      const id = el.getAttribute('id') ? `#${el.getAttribute('id')}` : '';
      const cls = (el.getAttribute('class') || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join('');
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      lines.push(`${'  '.repeat(depth)}<${tag}${id}${cls}>${text ? ` ${text}` : ''}`);
      for (const child of Array.from(el.children)) {
        if (lines.length >= maxLines) break;
        walk(child, depth + 1);
      }
    };

    walk(root, 0);
    if (lines.length >= maxLines) lines.push('  ... (truncated)');
    return lines.join('\n');
  }

  buildDistilledView(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes: Record<string, unknown>[] = [];
    doc.querySelectorAll('[data-wci-id]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      let state = {};
      try {
        state = JSON.parse(htmlEl.dataset.wciState ?? '{}');
      } catch {
        /* ignore */
      }
      let options: string[] | undefined;
      try {
        const raw = htmlEl.dataset.wciOptions;
        if (raw) options = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      nodes.push({
        id: htmlEl.dataset.wciId,
        role: htmlEl.dataset.wciRole,
        desc: htmlEl.dataset.wciDesc,
        ...(htmlEl.dataset.wciAction ? { action: htmlEl.dataset.wciAction } : {}),
        ...(htmlEl.dataset.wciRequired === 'true' ? { required: true } : {}),
        ...(htmlEl.dataset.wciPrecondition ? { precondition: htmlEl.dataset.wciPrecondition } : {}),
        ...(options ? { options } : {}),
        state,
        priority: parseInt(htmlEl.dataset.wciPriority ?? '3', 10),
      });
    });

    return JSON.stringify(
      {
        wci_version: '1.0',
        page_title: doc.title || '(untitled)',
        node_count: nodes.length,
        nodes,
      },
      null,
      2
    );
  }
}
