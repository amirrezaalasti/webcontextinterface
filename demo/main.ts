// ─────────────────────────────────────────────────────────────────────────────
// WCI Demo — Main Entry Point
// <script type="module"> is deferred — DOM is fully parsed when this runs.
// ─────────────────────────────────────────────────────────────────────────────

import { WciDistiller } from '@wci/distiller';
import { WciBridge } from '@wci/bridge';
import { WciContextLoader } from '@wci/context';

// ── Grab DOM refs ─────────────────────────────────────────────────────────────
const formScope    = document.getElementById('form-scope')     as HTMLElement;
const jsonPanel    = document.getElementById('json-output')    as HTMLElement;
const mdPanel      = document.getElementById('md-output')      as HTMLElement;
const actionPanel  = document.getElementById('action-log')     as HTMLElement;
const contextPanel = document.getElementById('context-output') as HTMLElement;
const tokenCount   = document.getElementById('token-count')    as HTMLElement;
const tokenSaved   = document.getElementById('token-saved')    as HTMLElement;
const strengthBar  = document.getElementById('strength-bar')   as HTMLElement | null;
const domSnapshotInput   = document.getElementById('dom-snapshot-input') as HTMLTextAreaElement | null;
const parseDomBtn        = document.getElementById('parse-dom-btn') as HTMLButtonElement | null;
const converterStatus    = document.getElementById('converter-status') as HTMLElement | null;
const converterMetrics   = document.getElementById('converter-metrics') as HTMLElement | null;
const externalDomOutput  = document.getElementById('external-dom-output') as HTMLElement | null;
const externalAgentOutput = document.getElementById('external-agent-output') as HTMLElement | null;

if (!formScope || !jsonPanel || !mdPanel || !actionPanel) {
  console.error('[WCI] Required DOM elements not found — aborting init.');
}

// ── Framework objects ─────────────────────────────────────────────────────────
const distiller = new WciDistiller({ format: 'json', maxNodes: 32 });
const bridge    = new WciBridge(formScope ?? document.body);
const actionLog: object[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateTokens(s: string): number { return Math.ceil(s.length / 4); }

/** Apply syntax highlighting if hljs is loaded, otherwise just show raw text */
function tryHighlight(el: HTMLElement): void {
  try {
    const hljs = (window as any).hljs;
    if (hljs && typeof hljs.highlightElement === 'function') {
      // hljs rewrites innerHTML, so we need to un-escape and re-set textContent first
      hljs.highlightElement(el);
    }
  } catch { /* ignore — highlighting is cosmetic */ }
}

function setConverterStatus(text: string, isError = false): void {
  if (!converterStatus) return;
  converterStatus.textContent = text;
  converterStatus.style.color = isError ? 'hsl(0, 75%, 62%)' : '';
}

function snippet(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function inferWciRole(el: Element): 'action' | 'form' | 'display' | 'nav' | 'status' | 'landmark' {
  const tag = el.tagName.toLowerCase();
  const roleAttr = (el.getAttribute('role') || '').toLowerCase();
  if (tag === 'form' || ['main', 'nav', 'section', 'article'].includes(tag)) return 'landmark';
  if (tag === 'a' || tag === 'nav') return 'nav';
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return 'form';
  if (tag === 'button' || roleAttr === 'button') return 'action';
  if (['output', 'progress'].includes(tag)) return 'status';
  return 'display';
}

function inferWciAction(el: Element): string | undefined {
  const tag = el.tagName.toLowerCase();
  if (tag === 'a') return 'navigate';
  if (tag === 'button') return 'click';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'fill';
  if (tag === 'input') {
    const type = ((el as HTMLInputElement).type || '').toLowerCase();
    if (['checkbox', 'radio'].includes(type)) return 'check';
    if (type === 'file') return 'upload';
    if (type === 'submit') return 'submit';
    return 'fill';
  }
  if ((el.getAttribute('role') || '').toLowerCase() === 'button') return 'click';
  return undefined;
}

function inferNodeId(el: Element, index: number): string {
  const id = el.getAttribute('id');
  if (id) return id;
  const name = el.getAttribute('name');
  if (name) return `${el.tagName.toLowerCase()}-${name}`;
  const testId = el.getAttribute('data-testid');
  if (testId) return `testid-${testId}`;
  return `node-${el.tagName.toLowerCase()}-${index}`;
}

function inferNodeDesc(el: Element): string {
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute('href') ?? '';
    const label = el.getAttribute('aria-label')
      || el.getAttribute('title')
      || snippet(el.textContent || '');
    if (label) return href ? `${label} → ${href}` : label;
    return href ? `Navigate to ${href}` : 'Link (missing href)';
  }
  const label = el.getAttribute('aria-label')
    || el.getAttribute('title')
    || (el as HTMLInputElement).placeholder
    || snippet(el.textContent || '');
  return label || `${el.tagName.toLowerCase()} element`;
}

/** Base URL for resolving relative `href`s in pasted snapshots (skip non-URL placeholders). */
function inferResolveBase(doc: Document, sourceUrl: string): string | undefined {
  try {
    const u = new URL(sourceUrl);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch { /* ignore */ }
  if (doc.baseURI && !doc.baseURI.startsWith('about:')) return doc.baseURI;
  return undefined;
}

function inferNodeState(el: Element, resolveBase?: string): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  if ('disabled' in el) state.disabled = Boolean((el as HTMLButtonElement).disabled);
  if (el instanceof HTMLAnchorElement) {
    const raw = el.getAttribute('href');
    if (raw !== null) state.href = raw;
    if (raw && resolveBase) {
      try {
        state.hrefResolved = new URL(raw, resolveBase).href;
      } catch {
        state.hrefResolved = raw;
      }
    } else if (el.href) {
      try {
        state.hrefResolved = el.href;
      } catch { /* ignore */ }
    }
    if (el.target) state.target = el.target;
    const rel = el.getAttribute('rel');
    if (rel) state.rel = rel;
    if (el.download) state.download = el.download;
  }
  if (el instanceof HTMLInputElement) {
    if (['checkbox', 'radio'].includes(el.type)) {
      state.checked = el.checked;
    } else {
      state.value = el.value || '';
    }
    state.type = el.type;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    state.value = el.value || '';
  }
  return state;
}

function buildDomOutline(root: Element): string {
  const lines: string[] = [];

  function walk(el: Element, depth: number): void {
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'svg', 'path'].includes(tag)) return;
    const id = el.getAttribute('id') ? `#${el.getAttribute('id')}` : '';
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${c}`).join('');
    const text = snippet(el.textContent || '', 60);
    lines.push(`${'  '.repeat(depth)}<${tag}${id}${cls}>${text ? ` ${text}` : ''}`);
    for (const child of Array.from(el.children)) walk(child, depth + 1);
  }

  walk(root, 0);
  return lines.join('\n');
}

interface InferredAgentNode {
  id: string;
  role: 'action' | 'form' | 'display' | 'nav' | 'status' | 'landmark';
  desc: string;
  action?: string;
  required?: boolean;
  precondition?: string;
  state: Record<string, unknown>;
  priority: number;
}

interface InferredWciView {
  metadata: {
    pageTitle: string;
    sourceUrl: string;
    inferred: true;
    note: string;
  };
  nodes: InferredAgentNode[];
}

function inferWciViewFromDocument(doc: Document, sourceUrl: string): InferredWciView {
  const resolveBase = inferResolveBase(doc, sourceUrl);
  const candidates = Array.from(doc.querySelectorAll('form, input, textarea, select, button, a, [role="button"]'));
  const nodes = candidates.map((el, i) => {
    const role = inferWciRole(el);
    const action = inferWciAction(el);
    const required = el.hasAttribute('required');
    return {
      id: inferNodeId(el, i + 1),
      role,
      desc: inferNodeDesc(el),
      action,
      required: required || undefined,
      precondition: el.getAttribute('aria-disabled') === 'true' ? 'Element currently marked as aria-disabled.' : undefined,
      state: inferNodeState(el, resolveBase),
      priority: role === 'action' ? 1 : role === 'form' ? 2 : 3,
    };
  });

  return {
    metadata: {
      pageTitle: doc.title || '(untitled)',
      sourceUrl,
      inferred: true,
      note: 'Generated heuristically from standard HTML semantics (no data-wci-* annotations).',
    },
    nodes,
  };
}

function parseAndConvertSnapshot(): void {
  if (!domSnapshotInput || !externalDomOutput || !externalAgentOutput || !parseDomBtn) return;
  const snapshot = domSnapshotInput.value.trim();
  if (!snapshot) {
    setConverterStatus('Please paste a DOM snapshot first.', true);
    return;
  }

  parseDomBtn.disabled = true;
  setConverterStatus('Parsing DOM snapshot and inferring agentic view...');

  try {
    const normalized = snapshot.includes('<html')
      ? snapshot
      : `<!DOCTYPE html><html><head></head><body>${snapshot}</body></html>`;

    const parser = new DOMParser();
    const parsed = parser.parseFromString(normalized, 'text/html');
    const root = parsed.body || parsed.documentElement;

    const parserError = parsed.querySelector('parsererror');
    if (parserError) {
      throw new Error('Could not parse pasted DOM snapshot. Ensure you pasted full HTML from document.documentElement.outerHTML.');
    }

    externalDomOutput.textContent = buildDomOutline(root);
    tryHighlight(externalDomOutput);

    const inferred = inferWciViewFromDocument(parsed, 'browser-dom-snapshot');
    const inferredJson = JSON.stringify(inferred, null, 2);
    externalAgentOutput.textContent = inferredJson;
    tryHighlight(externalAgentOutput);

    const totalElements = parsed.querySelectorAll('*').length;
    const linkCount = parsed.querySelectorAll('a').length;
    const formCount = parsed.querySelectorAll('form').length;
    const buttonCount = parsed.querySelectorAll('button,[role="button"]').length;
    const inputCount = parsed.querySelectorAll('input,textarea,select').length;

    const roleCounts = inferred.nodes.reduce<Record<string, number>>((acc, node) => {
      acc[node.role] = (acc[node.role] || 0) + 1;
      return acc;
    }, {});

    const rawTokens = estimateTokens(normalized);
    const domOutlineTokens = estimateTokens(externalDomOutput.textContent || '');
    const inferredTokens = estimateTokens(inferredJson);
    const reductionVsRaw = rawTokens > 0
      ? Math.round((1 - (inferredTokens / rawTokens)) * 100)
      : 0;

    if (converterMetrics) {
      converterMetrics.textContent = [
        `Raw snapshot tokens (approx): ${rawTokens.toLocaleString()}`,
        `DOM outline tokens (approx): ${domOutlineTokens.toLocaleString()}`,
        `Inferred agent view tokens (approx): ${inferredTokens.toLocaleString()}`,
        `Token reduction vs raw snapshot: ~${reductionVsRaw}%`,
        '',
        `Total DOM elements: ${totalElements.toLocaleString()}`,
        `Interactive candidates matched: ${inferred.nodes.length.toLocaleString()}`,
        `Forms: ${formCount.toLocaleString()} | Inputs/Textareas/Selects: ${inputCount.toLocaleString()} | Buttons: ${buttonCount.toLocaleString()} | Links: ${linkCount.toLocaleString()}`,
        '',
        `Role breakdown:`,
        `- action: ${(roleCounts.action || 0).toLocaleString()}`,
        `- form: ${(roleCounts.form || 0).toLocaleString()}`,
        `- nav: ${(roleCounts.nav || 0).toLocaleString()}`,
        `- landmark: ${(roleCounts.landmark || 0).toLocaleString()}`,
        `- display: ${(roleCounts.display || 0).toLocaleString()}`,
        `- status: ${(roleCounts.status || 0).toLocaleString()}`,
      ].join('\n');
    }

    setConverterStatus(`Converted full snapshot with ${inferred.nodes.length.toLocaleString()} inferred nodes (no truncation).`);
  } catch (err) {
    setConverterStatus(`Conversion failed: ${String(err)}`, true);
    if (externalDomOutput) externalDomOutput.textContent = 'No DOM output due to fetch/parse error.';
    if (externalAgentOutput) externalAgentOutput.textContent = 'No inferred output due to fetch/parse error.';
    if (converterMetrics) converterMetrics.textContent = 'Metrics unavailable due to parse/conversion error.';
  } finally {
    parseDomBtn.disabled = false;
  }
}

// ── Distiller refresh ─────────────────────────────────────────────────────────
function refreshDistiller(): void {
  if (!formScope || !jsonPanel || !mdPanel) return;

  try {
    // JSON view
    const jsonView = distiller.distilJSON(formScope);
    jsonPanel.textContent = jsonView;
    tryHighlight(jsonPanel);

    // Markdown view
    const mdView = distiller.distilMarkdown(formScope);
    mdPanel.textContent = mdView;
    tryHighlight(mdPanel);

    // Token metrics
    if (tokenCount && tokenSaved) {
      const rawTokens   = estimateTokens(formScope.outerHTML);
      const agentTokens = estimateTokens(jsonView);
      const saved       = Math.round((1 - agentTokens / rawTokens) * 100);
      tokenCount.textContent = `${agentTokens.toLocaleString()} tokens`;
      tokenSaved.textContent = `~${saved}% reduction vs raw HTML`;
    }
  } catch (err) {
    console.error('[WCI] refreshDistiller error:', err);
    jsonPanel.textContent = `Error: ${String(err)}`;
  }
}

// ── Action log ────────────────────────────────────────────────────────────────
function renderActionLog(): void {
  if (!actionPanel) return;
  actionPanel.textContent = JSON.stringify(actionLog.slice(-10), null, 2);
  tryHighlight(actionPanel);
}

// ── State-change refresh ──────────────────────────────────────────────────────
bridge.onStateChange(() => { setTimeout(refreshDistiller, 80); });

// ── Form validation ───────────────────────────────────────────────────────────
function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function validateForm(): void {
  const email       = getEl<HTMLInputElement>('email-input');
  const password    = getEl<HTMLInputElement>('password-input');
  const terms       = getEl<HTMLInputElement>('terms-checkbox');
  const submit      = getEl<HTMLButtonElement>('submit-btn');
  const emailStatus = getEl('email-availability-status');
  if (!email || !password || !terms || !submit) return;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  const pw = password.value;
  const passValid = pw.length >= 8 && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const strength = pw.length === 0 ? 'none' : passValid ? 'strong' : pw.length >= 6 ? 'medium' : 'weak';
  const termsChecked = terms.checked;

  // Strength bar
  if (strengthBar) {
    strengthBar.style.width = { none: '0%', weak: '33%', medium: '66%', strong: '100%' }[strength]!;
    strengthBar.style.background = { none: 'transparent', weak: 'hsl(0,75%,62%)', medium: 'hsl(40,90%,58%)', strong: 'hsl(150,70%,50%)' }[strength]!;
  }

  // Sync data-wci-state attributes so Distiller reads live values
  email.dataset.wciState    = JSON.stringify({ value: email.value, valid: email.value ? emailValid : null });
  password.dataset.wciState = JSON.stringify({ value: pw ? '••••••••' : '', strength });
  terms.dataset.wciState    = JSON.stringify({ checked: termsChecked });

  // Email availability indicator
  if (emailStatus) {
    if (emailValid) {
      emailStatus.dataset.wciState = JSON.stringify({ status: 'available', message: 'Email is available' });
      emailStatus.textContent = '✅ Email is available';
      emailStatus.className = 'status-msg status-ok';
    } else if (email.value) {
      emailStatus.dataset.wciState = JSON.stringify({ status: 'invalid', message: 'Email format invalid' });
      emailStatus.textContent = '⚠️ Invalid email format';
      emailStatus.className = 'status-msg status-warn';
    } else {
      emailStatus.dataset.wciState = JSON.stringify({ status: 'idle', message: '' });
      emailStatus.textContent = '';
      emailStatus.className = 'status-msg';
    }
  }

  const canSubmit = emailValid && passValid && termsChecked;
  submit.disabled = !canSubmit;
  submit.dataset.wciState = JSON.stringify({ disabled: !canSubmit });

  refreshDistiller();
}

// Wire form input events
getEl<HTMLInputElement>('email-input')?.addEventListener('input', validateForm);
getEl<HTMLInputElement>('password-input')?.addEventListener('input', validateForm);
getEl<HTMLInputElement>('terms-checkbox')?.addEventListener('change', validateForm);

// ── Agent action dispatch ─────────────────────────────────────────────────────
async function runWciAction(action: string, nodeId: string, value?: string): Promise<void> {
  try {
    const result = await bridge.dispatch({ nodeId, action: action as any, value });
    actionLog.push(result);
    if (['fill', 'check', 'clear'].includes(action)) validateForm();
    renderActionLog();
    refreshDistiller();
  } catch (err) {
    console.error('[WCI] runWciAction error:', err);
  }
}

document.getElementById('agent-fill-email')?.addEventListener('click',  () => runWciAction('fill',  'email-input',    'user@example.com'));
document.getElementById('agent-fill-pass')?.addEventListener('click',   () => runWciAction('fill',  'password-input', 'SecureP@ss1'));
document.getElementById('agent-check-terms')?.addEventListener('click', () => runWciAction('check', 'terms-checkbox', 'true'));
document.getElementById('agent-submit')?.addEventListener('click',      () => runWciAction('click', 'submit-btn'));
document.getElementById('agent-bad-email')?.addEventListener('click',   () => runWciAction('fill',  'email-input',    'not-an-email'));
document.getElementById('agent-reset')?.addEventListener('click', async () => {
  await runWciAction('clear', 'email-input');
  await runWciAction('clear', 'password-input');
  const terms = getEl<HTMLInputElement>('terms-checkbox');
  if (terms) { terms.checked = false; terms.dispatchEvent(new Event('change', { bubbles: true })); }
  bridge.clearHistory();
  actionLog.length = 0;
  renderActionLog();
  validateForm();
});

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group  = btn.dataset.tabGroup!;
    const target = btn.dataset.tab!;
    document.querySelectorAll<HTMLElement>(`.tab-panel[data-tab-group="${group}"]`)
      .forEach(p => { p.hidden = p.dataset.tab !== target; });
    document.querySelectorAll<HTMLButtonElement>(`.tab-btn[data-tab-group="${group}"]`)
      .forEach(b => b.classList.toggle('active', b.dataset.tab === target));
  });
});

parseDomBtn?.addEventListener('click', () => { parseAndConvertSnapshot(); });
domSnapshotInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      parseAndConvertSnapshot();
    }
  }
});

// ── Site context loader (async, non-blocking) ─────────────────────────────────
(async () => {
  if (!contextPanel) return;
  try {
    const ctx = await WciContextLoader.load(window.location.origin);
    const parts: string[] = [];
    if (ctx.narrative) parts.push('=== wci.md ===\n\n' + ctx.narrative);
    if (ctx.manifest)  parts.push('=== wci.json ===\n\n' + JSON.stringify(ctx.manifest, null, 2));
    if (ctx.policy)    parts.push('=== wci.txt (parsed) ===\n\n' + JSON.stringify(ctx.policy.policy, null, 2));
    contextPanel.textContent = parts.length
      ? parts.join('\n\n─────────────────────────────────────\n\n')
      : 'No context files found at this origin.';
  } catch (e) {
    contextPanel.textContent = 'Error loading context files: ' + String(e);
  }
})();

// ── Initial render ────────────────────────────────────────────────────────────
refreshDistiller();
renderActionLog();

// ══════════════════════════════════════════════════════════════════════════════
// COMPLEXITY BENCHMARK
// ══════════════════════════════════════════════════════════════════════════════

import { BenchmarkEngine, SCENARIOS, type BenchmarkScenario, type BenchmarkMetrics, type TaskStep } from './benchmark';

const benchmarkEngine = new BenchmarkEngine();

// ── Grab benchmark DOM refs ───────────────────────────────────────────────────
const scenarioSelector  = document.getElementById('scenario-selector');
const scenarioSearch    = document.getElementById('scenario-search') as HTMLInputElement | null;
const scenarioCountEl   = document.getElementById('scenario-count');
const benchRawOutput    = document.getElementById('benchmark-raw-output');
const benchDistOutput   = document.getElementById('benchmark-distilled-output');
const taskGoalEl        = document.getElementById('task-goal');
const taskStandardSteps = document.getElementById('task-standard-steps');
const taskAgentdomSteps = document.getElementById('task-agentdom-steps');
const taskStandardCount = document.getElementById('task-standard-count');
const taskAgentdomCount = document.getElementById('task-agentdom-count');
const taskPlayBtn       = document.getElementById('task-play-btn') as HTMLButtonElement | null;
const taskResetBtn      = document.getElementById('task-reset-btn') as HTMLButtonElement | null;

let activeScenarioId: string | null = null;
let simulationTimer: ReturnType<typeof setTimeout> | null = null;

let scenarioFilterQuery = '';

// ── Render scenario selector cards ────────────────────────────────────────────
function renderScenarioCards(): void {
  if (!scenarioSelector) return;
  scenarioSelector.innerHTML = '';

  const q = scenarioFilterQuery.trim().toLowerCase();
  const visible = q
    ? SCENARIOS.filter(
        (s) =>
          s.id.includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      )
    : SCENARIOS;

  if (scenarioCountEl) {
    scenarioCountEl.textContent = `${visible.length} / ${SCENARIOS.length}`;
  }

  for (const scenario of visible) {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    card.dataset.scenarioId = scenario.id;

    const diffClass = scenario.difficulty === 'Extreme' ? 'difficulty--extreme'
      : scenario.difficulty === 'Very Hard' ? 'difficulty--very-hard'
      : 'difficulty--hard';

    card.innerHTML = `
      <span class="scenario-card__icon">${scenario.icon}</span>
      <span class="scenario-card__title">${scenario.title}</span>
      <span class="scenario-card__desc">${scenario.description}</span>
      <span class="scenario-card__difficulty ${diffClass}">${scenario.difficulty}</span>
    `;

    card.addEventListener('click', () => selectScenario(scenario.id));
    scenarioSelector.appendChild(card);
  }

  if (activeScenarioId && !visible.some((s) => s.id === activeScenarioId) && visible[0]) {
    selectScenario(visible[0].id);
  }
}

if (scenarioSearch) {
  scenarioSearch.addEventListener('input', () => {
    scenarioFilterQuery = scenarioSearch.value;
    renderScenarioCards();
  });
}

// ── Select scenario ───────────────────────────────────────────────────────────
function selectScenario(id: string): void {
  const scenario = SCENARIOS.find(s => s.id === id);
  if (!scenario) return;

  activeScenarioId = id;

  // Update card active states
  document.querySelectorAll('.scenario-card').forEach(card => {
    card.classList.toggle('scenario-card--active', (card as HTMLElement).dataset.scenarioId === id);
  });

  // Compute metrics
  const metrics = benchmarkEngine.computeMetrics(scenario);

  // Render comparison panels
  renderComparisonPanels(scenario);

  // Animate metrics
  animateMetrics(metrics);

  // Render task simulation (static initially)
  renderTaskSimulation(scenario);

  // Enable play button
  if (taskPlayBtn) taskPlayBtn.disabled = false;
  if (taskResetBtn) taskResetBtn.disabled = false;
}

// ── Render comparison panels ──────────────────────────────────────────────────
function renderComparisonPanels(scenario: BenchmarkScenario): void {
  if (benchRawOutput) {
    benchRawOutput.textContent = benchmarkEngine.buildOutline(scenario.rawHtml, 80);
    tryHighlight(benchRawOutput);
  }
  if (benchDistOutput) {
    benchDistOutput.textContent = benchmarkEngine.buildDistilledView(scenario.annotatedHtml);
    tryHighlight(benchDistOutput);
  }
}

// ── Animate metrics ───────────────────────────────────────────────────────────
function animateCountUp(el: HTMLElement, target: number, duration = 800, suffix = ''): void {
  const start = performance.now();
  const initial = 0;

  function tick(now: number): void {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(initial + (target - initial) * eased);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function animateMetrics(metrics: BenchmarkMetrics): void {
  // Token bars
  const barRaw = document.getElementById('metric-bar-raw');
  const barDist = document.getElementById('metric-bar-distilled');
  const valRaw = document.getElementById('metric-val-raw');
  const valDist = document.getElementById('metric-val-distilled');
  const badgeReduction = document.getElementById('metric-badge-reduction');

  if (barRaw && barDist && valRaw && valDist) {
    // Reset bars
    barRaw.style.width = '0%';
    barDist.style.width = '0%';

    requestAnimationFrame(() => {
      barRaw.style.width = '100%';
      barDist.style.width = `${Math.round((metrics.distilledTokens / metrics.rawTokens) * 100)}%`;
    });

    animateCountUp(valRaw, metrics.rawTokens);
    animateCountUp(valDist, metrics.distilledTokens);
  }

  if (badgeReduction) {
    badgeReduction.textContent = `↓${metrics.tokenReduction}%`;
  }

  // Noise elements
  const noiseRaw = document.getElementById('metric-noise-raw');
  const noiseDist = document.getElementById('metric-noise-distilled');
  if (noiseRaw) animateCountUp(noiseRaw, metrics.rawElements);
  if (noiseDist) animateCountUp(noiseDist, metrics.distilledNodes);

  // Interactive/precision
  const intRaw = document.getElementById('metric-interactive-raw');
  const intDist = document.getElementById('metric-interactive-distilled');
  const fpEl = document.getElementById('metric-false-positives');
  if (intRaw) animateCountUp(intRaw, metrics.rawInteractive);
  if (intDist) animateCountUp(intDist, metrics.distilledNodes);
  if (fpEl) animateCountUp(fpEl, metrics.falsePositives);

  // Steps
  const stepsRaw = document.getElementById('metric-steps-raw');
  const stepsDist = document.getElementById('metric-steps-distilled');
  const badgeSteps = document.getElementById('metric-badge-steps');
  const stepsSublabel = document.getElementById('metric-steps-sublabel');
  if (stepsRaw) animateCountUp(stepsRaw, metrics.standardSteps);
  if (stepsDist) animateCountUp(stepsDist, metrics.agentdomSteps);
  if (badgeSteps) badgeSteps.textContent = `↓${metrics.stepReduction}%`;
  if (stepsSublabel) stepsSublabel.textContent = `${metrics.stepReduction}% fewer steps needed`;

  // Pulse animation on metric cards
  document.querySelectorAll('.metric-card').forEach(card => {
    card.classList.add('metric-card--active');
    card.classList.add('metric-card--animating');
    card.addEventListener('animationend', () => {
      card.classList.remove('metric-card--animating');
    }, { once: true });
  });
}

// ── Render task simulation ────────────────────────────────────────────────────
function renderStepHTML(step: TaskStep, index: number, isLast: boolean): string {
  return `
    <div class="task-step task-step--${step.outcome}" data-step-index="${index}">
      <div class="task-step__indicator">
        <div class="task-step__dot"></div>
        ${!isLast ? '<div class="task-step__line"></div>' : ''}
      </div>
      <div class="task-step__content">
        <div class="task-step__action">
          <span class="task-step__action-verb">${step.action}</span>
          <span class="task-step__target">${step.target}</span>
          <span class="task-step__outcome">${step.outcome}</span>
        </div>
        <div class="task-step__note">${step.note}</div>
      </div>
    </div>
  `;
}

function renderTaskSimulation(scenario: BenchmarkScenario): void {
  if (taskGoalEl) {
    taskGoalEl.innerHTML = `<strong>Goal:</strong> ${scenario.task.goal}`;
  }

  if (taskStandardSteps) {
    taskStandardSteps.innerHTML = scenario.task.standardSteps
      .map((step, i) => renderStepHTML(step, i, i === scenario.task.standardSteps.length - 1))
      .join('');
  }

  if (taskAgentdomSteps) {
    taskAgentdomSteps.innerHTML = scenario.task.agentdomSteps
      .map((step, i) => renderStepHTML(step, i, i === scenario.task.agentdomSteps.length - 1))
      .join('');
  }

  if (taskStandardCount) {
    taskStandardCount.textContent = `${scenario.task.standardSteps.length} steps`;
  }

  if (taskAgentdomCount) {
    taskAgentdomCount.textContent = `${scenario.task.agentdomSteps.length} steps`;
  }

  // Reset visibility
  document.querySelectorAll('.task-step').forEach(el => {
    el.classList.remove('task-step--visible');
  });
}

// ── Play task simulation ──────────────────────────────────────────────────────
function playSimulation(): void {
  if (!activeScenarioId) return;

  // Reset
  const allSteps = document.querySelectorAll<HTMLElement>('.task-step');
  allSteps.forEach(el => el.classList.remove('task-step--visible'));

  if (taskPlayBtn) taskPlayBtn.disabled = true;

  let index = 0;
  const totalSteps = allSteps.length;

  function showNext(): void {
    if (index >= totalSteps) {
      if (taskPlayBtn) taskPlayBtn.disabled = false;
      return;
    }

    allSteps[index].classList.add('task-step--visible');

    // Scroll step into view if needed
    allSteps[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    index++;
    simulationTimer = setTimeout(showNext, 400);
  }

  showNext();
}

function resetSimulation(): void {
  if (simulationTimer) {
    clearTimeout(simulationTimer);
    simulationTimer = null;
  }

  document.querySelectorAll('.task-step').forEach(el => {
    el.classList.remove('task-step--visible');
  });

  if (taskPlayBtn) taskPlayBtn.disabled = false;
}

// ── Wire up benchmark events ──────────────────────────────────────────────────
taskPlayBtn?.addEventListener('click', playSimulation);
taskResetBtn?.addEventListener('click', resetSimulation);

// ── Initialize benchmark ──────────────────────────────────────────────────────
renderScenarioCards();

// Auto-select first scenario when scrolled into view
const benchmarkSection = document.getElementById('benchmark');
if (benchmarkSection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !activeScenarioId) {
        selectScenario(SCENARIOS[0].id);
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });
  observer.observe(benchmarkSection);
}

// Animate Agent Leaderboard bars when scrolled into view
const agentLeaderboard = document.getElementById('agent-leaderboard');
if (agentLeaderboard) {
  const leaderboardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bars = agentLeaderboard.querySelectorAll('.performance-bar');
        bars.forEach(bar => {
          const targetWidth = (bar as HTMLElement).dataset.targetWidth;
          if (targetWidth) {
            // Slight delay to allow the section to become fully visible before animating
            setTimeout(() => {
              (bar as HTMLElement).style.width = targetWidth;
            }, 200);
          }
        });
        leaderboardObserver.disconnect();
      }
    });
  }, { threshold: 0.3 });
  leaderboardObserver.observe(agentLeaderboard);
}

// ── Fetch and Render Real Eval Results ──────────────────────────────────────
const LEADERBOARD_ICONS = ['⚡', '🔷', '🦙', '🐋', '🟢', '✨', '🧠', '💠', '🔶', '🌐'];

interface LeaderboardEntry {
  standard: { successRate: number; avgTokens: number };
  wci?: { successRate: number; avgTokens: number };
  wciFull?: { successRate: number; avgTokens: number };
  agentDom?: { successRate: number; avgTokens: number };
}

interface EvalResultsFile {
  generatedAt?: string;
  modelOrder?: Array<{ id: string; name: string; openRouterModel: string }>;
  [modelId: string]: unknown;
}

function barClass(rate: number, good: boolean): string {
  if (good) return 'performance-bar--good';
  if (rate >= 50) return 'performance-bar--warn';
  return 'performance-bar--bad';
}

function buildLeaderboardRow(
  meta: { id: string; name: string; openRouterModel: string },
  stats: LeaderboardEntry,
  icon: string,
  index: number
): HTMLTableRowElement {
  const wci = stats.wci ?? stats.agentDom;
  const wciFull = stats.wciFull;
  const rawRate = stats.standard.successRate;
  const wciRate = wci?.successRate ?? 0;
  const slug = meta.openRouterModel.replace(/^[^/]+\//, '');
  const fullNote =
    wciFull != null ? ` · full graph ${wciFull.successRate}%` : '';

  const tr = document.createElement('tr');
  tr.className = 'leaderboard-row';
  tr.dataset.modelId = meta.id;
  tr.innerHTML = `
    <td>
      <div class="agent-name">
        <div class="agent-icon">${icon}</div>
        <div class="agent-info">
          <span class="agent-title">${meta.name}</span>
          <span class="agent-desc">${slug}${fullNote}</span>
        </div>
      </div>
    </td>
    <td>
      <div class="performance-bar-group">
        <span class="performance-value">${rawRate}%</span>
        <div class="performance-track">
          <div class="performance-bar ${barClass(rawRate, false)}" style="width:0%" data-target-width="${rawRate}%"></div>
        </div>
      </div>
    </td>
    <td>
      <div class="performance-bar-group">
        <span class="performance-value text-good">${wciRate}%</span>
        <div class="performance-track">
          <div class="performance-bar ${barClass(wciRate, true)}" style="width:0%" data-target-width="${wciRate}%"></div>
        </div>
      </div>
    </td>
    <td class="text-center">
      <span class="token-badge token-badge--raw">${(stats.standard.avgTokens / 1000).toFixed(1)}k</span>
      → <span class="token-badge token-badge--distilled">${wci ? (wci.avgTokens / 1000).toFixed(1) + 'k' : '—'}</span>
    </td>
  `;
  return tr;
}

function animateLeaderboardBars() {
  const board = document.getElementById('agent-leaderboard');
  if (!board) return;
  board.querySelectorAll('.performance-bar').forEach((bar) => {
    const el = bar as HTMLElement;
    const target = el.dataset.targetWidth;
    if (target) setTimeout(() => { el.style.width = target; }, 150);
  });
}

async function loadEvalResults() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  try {
    const res = await fetch('/eval-results.json');
    if (!res.ok) return;
    const data = (await res.json()) as EvalResultsFile;

    const order =
      data.modelOrder ??
      Object.keys(data).filter(
        (k) => !['generatedAt', 'modelOrder'].includes(k) && typeof data[k] === 'object'
      ).map((id) => ({
        id,
        name: id,
        openRouterModel: id,
      }));

    const rows: HTMLTableRowElement[] = [];
    order.forEach((meta, i) => {
      const stats = data[meta.id] as LeaderboardEntry | undefined;
      if (!stats?.standard) return;
      rows.push(
        buildLeaderboardRow(meta, stats, LEADERBOARD_ICONS[i % LEADERBOARD_ICONS.length], i)
      );
    });

    if (rows.length === 0) return;

    tbody.replaceChildren(...rows);
    animateLeaderboardBars();
  } catch {
    console.log('No local eval results found; run npm run eval:benchmark');
  }
}

loadEvalResults();
