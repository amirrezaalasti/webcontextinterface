// ─────────────────────────────────────────────────────────────────────────────
// WCI Demo — Main Entry Point
// <script type="module"> is deferred — DOM is fully parsed when this runs.
// ─────────────────────────────────────────────────────────────────────────────

import { WciDistiller } from '@webcontextinterface/distiller';
import { WciBridge } from '@webcontextinterface/bridge';
import { WciContextLoader } from '@webcontextinterface/context';
import bundledEvalConfig from './public/eval-config.json';
import bundledEvalResults from './public/eval-results-all.json';
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
const distiller = new WciDistiller({ format: 'json', maxNodes: 32, scope: 'registration-form' });
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
    bridge.setPolicy(ctx.policy);
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

// ── Fetch and Render Real Eval Results ──────────────────────────────────────
const LEADERBOARD_ICONS = ['⚡', '🔷', '🦙', '🐋', '🟢', '✨', '🧠', '💠', '🔶', '🌐'];

interface ApproachBlock {
  successRate: number;
  avgTokens: number;
}

interface LeaderboardApproaches {
  rawHtml: ApproachBlock;
  domOutline: ApproachBlock;
  candidates: ApproachBlock;
  wciFull: ApproachBlock;
  wciGrounding: ApproachBlock;
}

interface LeaderboardEntry {
  standard: ApproachBlock;
  wci?: ApproachBlock;
  wciFull?: ApproachBlock;
  agentDom?: ApproachBlock;
  approaches?: LeaderboardApproaches;
}

interface EvalResultsFile {
  generatedAt?: string;
  mergedFrom?: string[];
  modelOrder?: Array<{ id: string; name: string; openRouterModel: string }>;
  [modelId: string]: unknown;
}

/** Resolve public JSON under the demo base (`/` locally, `/demo/` on Vercel). */
function demoAssetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${file.replace(/^\//, '')}`;
}

const LEADERBOARD_SOURCES = [
  demoAssetUrl('eval-results-all.json'),
  demoAssetUrl('eval-results.json'),
];

function pctCell(rate: number, highlight = false): string {
  const cls = highlight ? 'leaderboard-metric leaderboard-metric--highlight' : 'leaderboard-metric';
  return `<td class="text-center ${cls}">${rate}%</td>`;
}

function tokenCell(tokens: number, highlight = false): string {
  const cls = highlight ? 'leaderboard-metric leaderboard-metric--highlight' : 'leaderboard-metric';
  return `<td class="text-center ${cls}">${tokens.toLocaleString()}</td>`;
}

function buildLeaderboardRow(
  meta: { id: string; name: string; openRouterModel: string },
  stats: LeaderboardEntry,
  icon: string
): HTMLTableRowElement {
  const approaches = stats.approaches;
  const wci = stats.wci ?? stats.agentDom;
  const wciFull = stats.wciFull;
  const slug = meta.openRouterModel.replace(/^[^/]+\//, '');
  const rawRate = approaches?.rawHtml.successRate ?? stats.standard.successRate;
  const wciRate = approaches?.wciGrounding.successRate ?? wci?.successRate ?? 0;
  const lift = wciRate - rawRate;
  const liftLabel = lift >= 0 ? `+${lift} pp vs raw HTML` : `${lift} pp vs raw HTML`;

  const tr = document.createElement('tr');
  tr.className = 'leaderboard-row';
  tr.dataset.modelId = meta.id;

  if (approaches) {
    tr.innerHTML = `
      <td>
        <div class="agent-name">
          <div class="agent-icon">${icon}</div>
          <div class="agent-info">
            <span class="agent-title">${meta.name}</span>
            <span class="agent-desc">${slug} · <span class="leaderboard-lift">${liftLabel}</span></span>
          </div>
        </div>
      </td>
      ${pctCell(approaches.rawHtml.successRate)}
      ${pctCell(approaches.domOutline.successRate)}
      ${pctCell(approaches.candidates.successRate)}
      ${pctCell(approaches.wciFull.successRate)}
      ${pctCell(approaches.wciGrounding.successRate, true)}
      ${tokenCell(approaches.rawHtml.avgTokens)}
      ${tokenCell(approaches.domOutline.avgTokens)}
      ${tokenCell(approaches.candidates.avgTokens)}
      ${tokenCell(approaches.wciFull.avgTokens)}
      ${tokenCell(approaches.wciGrounding.avgTokens, true)}
    `;
    return tr;
  }

  tr.innerHTML = `
    <td>
      <div class="agent-name">
        <div class="agent-icon">${icon}</div>
        <div class="agent-info">
          <span class="agent-title">${meta.name}</span>
          <span class="agent-desc">${slug}</span>
        </div>
      </div>
    </td>
    ${pctCell(stats.standard.successRate)}
    <td class="text-center leaderboard-metric">—</td>
    <td class="text-center leaderboard-metric">—</td>
    ${pctCell(wciFull?.successRate ?? 0)}
    ${pctCell(wciRate, true)}
    ${tokenCell(stats.standard.avgTokens)}
    <td class="text-center leaderboard-metric">—</td>
    <td class="text-center leaderboard-metric">—</td>
    ${tokenCell(wciFull?.avgTokens ?? 0)}
    ${tokenCell(wci?.avgTokens ?? 0, true)}
  `;
  return tr;
}

function chartMetrics(stats: LeaderboardEntry): {
  raw: ApproachBlock;
  dom: ApproachBlock;
  candidates: ApproachBlock;
  wci: ApproachBlock;
  full: ApproachBlock;
} | null {
  if (!stats.standard) return null;
  const approaches = stats.approaches;
  const wci = stats.wci ?? stats.agentDom;
  if (approaches) {
    return {
      raw: approaches.rawHtml,
      dom: approaches.domOutline,
      candidates: approaches.candidates,
      wci: approaches.wciGrounding,
      full: approaches.wciFull,
    };
  }
  if (!wci) return null;
  const std = { successRate: stats.standard.successRate, avgTokens: stats.standard.avgTokens };
  return {
    raw: std,
    dom: std,
    candidates: std,
    wci,
    full: stats.wciFull ?? wci,
  };
}

function updateLeaderboardMeta(data: EvalResultsFile, modelCount: number) {
  const el = document.getElementById('leaderboard-meta');
  if (!el) return;
  const when = data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : '—';
  el.textContent = `${modelCount} models · 50 multi-step scenarios · 5 approaches · snapshot ${when}. Methodology: evals/README.md`;
}

function chartBarLine(
  tag: string,
  value: number,
  max: number,
  variant: 'std' | 'dom' | 'cand' | 'wci' | 'full',
  suffix: string
): string {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `
    <div class="eval-chart-bar-line">
      <span class="eval-chart-bar-tag">${tag}</span>
      <div class="eval-chart-bar-track">
        <div class="eval-chart-bar eval-chart-bar--${variant}" style="width:0%" data-chart-width="${pct}%"></div>
      </div>
      <span class="eval-chart-bar-val">${value.toLocaleString()}${suffix}</span>
    </div>`;
}

function animateEvalChartBars(container: HTMLElement): void {
  requestAnimationFrame(() => {
    container.querySelectorAll<HTMLElement>('[data-chart-width]').forEach((bar) => {
      const w = bar.dataset.chartWidth;
      if (w) bar.style.width = w;
    });
  });
}

function renderEvalCharts(data: EvalResultsFile): void {
  const section = document.getElementById('eval-charts');
  const chartSuccess = document.getElementById('chart-success');
  const chartTokens = document.getElementById('chart-tokens');
  const chartsMeta = document.getElementById('eval-charts-meta');
  if (!section || !chartSuccess || !chartTokens) return;

  const skip = new Set(['generatedAt', 'modelOrder', 'mergedFrom']);
  const order =
    data.modelOrder ??
    Object.keys(data)
      .filter((k) => !skip.has(k) && typeof data[k] === 'object')
      .map((id) => ({ id, name: id, openRouterModel: id }));

  if (order.length === 0) return;

  section.hidden = false;
  if (chartsMeta) {
    const when = data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : '—';
    chartsMeta.textContent = `${order.length} models · 50 multi-step scenarios · snapshot ${when}. Hover bars for exact values.`;
  }

  const maxTokens = Math.max(
    ...order.map((m) => {
      const metrics = chartMetrics(data[m.id] as LeaderboardEntry | undefined);
      if (!metrics) return 0;
      return Math.max(
        metrics.raw.avgTokens,
        metrics.dom.avgTokens,
        metrics.candidates.avgTokens,
        metrics.wci.avgTokens,
        metrics.full.avgTokens
      );
    }),
    1
  );

  const successBars = (metrics: NonNullable<ReturnType<typeof chartMetrics>>) =>
    [
      chartBarLine('Raw', metrics.raw.successRate, 100, 'std', '%'),
      chartBarLine('DOM', metrics.dom.successRate, 100, 'dom', '%'),
      chartBarLine('Cand', metrics.candidates.successRate, 100, 'cand', '%'),
      chartBarLine('Full', metrics.full.successRate, 100, 'full', '%'),
      chartBarLine('WCI', metrics.wci.successRate, 100, 'wci', '%'),
    ].join('');

  const tokenBars = (metrics: NonNullable<ReturnType<typeof chartMetrics>>) =>
    [
      chartBarLine('Raw', metrics.raw.avgTokens, maxTokens, 'std', ''),
      chartBarLine('DOM', metrics.dom.avgTokens, maxTokens, 'dom', ''),
      chartBarLine('Cand', metrics.candidates.avgTokens, maxTokens, 'cand', ''),
      chartBarLine('Full', metrics.full.avgTokens, maxTokens, 'full', ''),
      chartBarLine('WCI', metrics.wci.avgTokens, maxTokens, 'wci', ''),
    ].join('');

  chartSuccess.innerHTML = order
    .map((m) => {
      const metrics = chartMetrics(data[m.id] as LeaderboardEntry | undefined);
      if (!metrics) return '';
      return `
        <div class="eval-chart-row">
          <span class="eval-chart-label">${m.name}</span>
          <div class="eval-chart-bars">
            ${successBars(metrics)}
          </div>
        </div>`;
    })
    .join('');

  chartTokens.innerHTML = order
    .map((m) => {
      const metrics = chartMetrics(data[m.id] as LeaderboardEntry | undefined);
      if (!metrics) return '';
      return `
        <div class="eval-chart-row">
          <span class="eval-chart-label">${m.name}</span>
          <div class="eval-chart-bars">
            ${tokenBars(metrics)}
          </div>
        </div>`;
    })
    .join('');

  animateEvalChartBars(chartSuccess);
  animateEvalChartBars(chartTokens);
}

function applyEvalResults(data: EvalResultsFile): void {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  const skip = new Set(['generatedAt', 'modelOrder', 'mergedFrom']);
  const order =
    data.modelOrder ??
    Object.keys(data)
      .filter((k) => !skip.has(k) && typeof data[k] === 'object')
      .map((id) => ({
        id,
        name: id,
        openRouterModel: id,
      }));

  const rows: HTMLTableRowElement[] = [];
  order.forEach((meta, i) => {
    const stats = data[meta.id] as LeaderboardEntry | undefined;
    if (!stats?.standard) return;
    rows.push(
      buildLeaderboardRow(meta, stats, LEADERBOARD_ICONS[i % LEADERBOARD_ICONS.length])
    );
  });

  if (rows.length === 0) return;

  tbody.replaceChildren(...rows);
  updateLeaderboardMeta(data, rows.length);
  renderEvalCharts(data);
}

async function loadEvalResults(): Promise<void> {
  let data: EvalResultsFile | null = null;

  for (const url of LEADERBOARD_SOURCES) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        data = (await res.json()) as EvalResultsFile;
        break;
      }
    } catch {
      /* try next source */
    }
  }

  if (!data) {
    data = bundledEvalResults as EvalResultsFile;
  }

  if (!data) {
    console.warn('[WCI] No eval results; run: npm run eval:merge-leaderboard');
    return;
  }

  applyEvalResults(data);
}

interface EvalConfigFile {
  generatedAt?: string;
  provider?: { name: string; chatCompletionsUrl: string };
  inference?: {
    multistep: {
      temperature: number;
      maxTokens: number;
      reasoning: { effort: string };
      minCoverageDefault: number;
      passRule: string;
    };
    singleShot: { temperature: number; maxTokens: number; reasoning: { effort: string } };
  };
  models?: Array<{ id: string; displayName: string; openRouterModel: string }>;
  prompts?: {
    multistep?: { systemByApproach?: Record<string, string> };
  };
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEvalConfigPanel(data: EvalConfigFile): void {
  const body = document.getElementById('eval-config-body');
  const jsonLink = document.getElementById('eval-config-json-link') as HTMLAnchorElement | null;
  if (!body) return;

  if (jsonLink) jsonLink.href = demoAssetUrl('eval-config.json');

  const ms = data.inference?.multistep;
  const models = data.models ?? [];
  const prompts = data.prompts?.multistep?.systemByApproach ?? {};
  const approachOrder = [
    'raw-html',
    'dom-outline',
    'interactive-candidates',
    'wci-full',
    'wci-grounding',
  ];

  const modelRows = models
    .map(
      (m) =>
        `<tr><td>${escapeHtmlText(m.displayName)}</td><td><code>${escapeHtmlText(m.id)}</code></td><td><code>${escapeHtmlText(m.openRouterModel)}</code></td></tr>`
    )
    .join('');

  const promptBlocks = approachOrder
    .map((id) => {
      const text = prompts[id];
      if (!text) return '';
      return `
        <details class="eval-config-prompt">
          <summary><code>${escapeHtmlText(id)}</code> — system prompt</summary>
          <pre class="eval-config-pre">${escapeHtmlText(text)}</pre>
        </details>`;
    })
    .join('');

  const when = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString()
    : '—';

  body.innerHTML = `
    <p class="eval-config-panel__meta">Snapshot <strong>${escapeHtmlText(when)}</strong> · ${escapeHtmlText(data.provider?.name ?? 'OpenRouter')} · <code>${escapeHtmlText(data.provider?.chatCompletionsUrl ?? '')}</code></p>
    <div class="eval-config-inference">
      <h4 class="eval-config-inference__title">Published multi-step inference</h4>
      <dl class="eval-config-dl">
        <dt>temperature</dt><dd><strong>${ms?.temperature ?? 0}</strong></dd>
        <dt>max_tokens</dt><dd><strong>${ms?.maxTokens ?? '—'}</strong></dd>
        <dt>reasoning.effort</dt><dd><strong>${escapeHtmlText(ms?.reasoning.effort ?? 'low')}</strong></dd>
        <dt>minCoverage</dt><dd><strong>${ms?.minCoverageDefault ?? 0.6}</strong></dd>
        <dt>passRule</dt><dd><code>${escapeHtmlText(ms?.passRule ?? 'unified')}</code></dd>
      </dl>
      <p class="eval-config-note">Single-shot <code>eval:benchmark</code> uses temperature <strong>${data.inference?.singleShot.temperature ?? 0}</strong>, max_tokens <strong>${data.inference?.singleShot.maxTokens ?? 1000}</strong> (not on this leaderboard).</p>
    </div>
    <div class="eval-config-models">
      <h4 class="eval-config-inference__title">Models</h4>
      <div class="leaderboard-table-container">
        <table class="leaderboard-table eval-config-models-table">
          <thead><tr><th>Name</th><th>ID</th><th>OpenRouter slug</th></tr></thead>
          <tbody>${modelRows}</tbody>
        </table>
      </div>
    </div>
    <div class="eval-config-prompts">
      <h4 class="eval-config-inference__title">System prompts (multi-step)</h4>
      ${promptBlocks}
    </div>`;
}

function initEvalConfigPanel(): void {
  renderEvalConfigPanel(bundledEvalConfig as EvalConfigFile);
}

void loadEvalResults();
initEvalConfigPanel();
