// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM Demo — Main Entry Point
// <script type="module"> is deferred — DOM is fully parsed when this runs.
// ─────────────────────────────────────────────────────────────────────────────

import { AgentDistiller } from '../packages/distiller/src/index';
import { AgentBridge } from '../packages/bridge/src/index';
import { SiteContextLoader } from '../packages/context/src/index';

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
  console.error('[AgentDOM] Required DOM elements not found — aborting init.');
}

// ── Framework objects ─────────────────────────────────────────────────────────
const distiller = new AgentDistiller({ format: 'json', maxNodes: 32 });
const bridge    = new AgentBridge(formScope ?? document.body);
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

function inferAgentRole(el: Element): 'action' | 'form' | 'display' | 'nav' | 'status' | 'landmark' {
  const tag = el.tagName.toLowerCase();
  const roleAttr = (el.getAttribute('role') || '').toLowerCase();
  if (tag === 'form' || ['main', 'nav', 'section', 'article'].includes(tag)) return 'landmark';
  if (tag === 'a' || tag === 'nav') return 'nav';
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return 'form';
  if (tag === 'button' || roleAttr === 'button') return 'action';
  if (['output', 'progress'].includes(tag)) return 'status';
  return 'display';
}

function inferAgentAction(el: Element): string | undefined {
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
  const label = el.getAttribute('aria-label')
    || el.getAttribute('title')
    || (el as HTMLInputElement).placeholder
    || snippet(el.textContent || '');
  return label || `${el.tagName.toLowerCase()} element`;
}

function inferNodeState(el: Element): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  if ('disabled' in el) state.disabled = Boolean((el as HTMLButtonElement).disabled);
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

interface InferredAgentView {
  metadata: {
    pageTitle: string;
    sourceUrl: string;
    inferred: true;
    note: string;
  };
  nodes: InferredAgentNode[];
}

function inferAgentViewFromDocument(doc: Document, sourceUrl: string): InferredAgentView {
  const candidates = Array.from(doc.querySelectorAll('form, input, textarea, select, button, a, [role="button"]'));
  const nodes = candidates.map((el, i) => {
    const role = inferAgentRole(el);
    const action = inferAgentAction(el);
    const required = el.hasAttribute('required');
    return {
      id: inferNodeId(el, i + 1),
      role,
      desc: inferNodeDesc(el),
      action,
      required: required || undefined,
      precondition: el.getAttribute('aria-disabled') === 'true' ? 'Element currently marked as aria-disabled.' : undefined,
      state: inferNodeState(el),
      priority: role === 'action' ? 1 : role === 'form' ? 2 : 3,
    };
  });

  return {
    metadata: {
      pageTitle: doc.title || '(untitled)',
      sourceUrl,
      inferred: true,
      note: 'Generated heuristically from standard HTML semantics (no data-agent-* annotations).',
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

    const inferred = inferAgentViewFromDocument(parsed, 'browser-dom-snapshot');
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
    console.error('[AgentDOM] refreshDistiller error:', err);
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

  // Sync data-agent-state attributes so Distiller reads live values
  email.dataset.agentState    = JSON.stringify({ value: email.value, valid: email.value ? emailValid : null });
  password.dataset.agentState = JSON.stringify({ value: pw ? '••••••••' : '', strength });
  terms.dataset.agentState    = JSON.stringify({ checked: termsChecked });

  // Email availability indicator
  if (emailStatus) {
    if (emailValid) {
      emailStatus.dataset.agentState = JSON.stringify({ status: 'available', message: 'Email is available' });
      emailStatus.textContent = '✅ Email is available';
      emailStatus.className = 'status-msg status-ok';
    } else if (email.value) {
      emailStatus.dataset.agentState = JSON.stringify({ status: 'invalid', message: 'Email format invalid' });
      emailStatus.textContent = '⚠️ Invalid email format';
      emailStatus.className = 'status-msg status-warn';
    } else {
      emailStatus.dataset.agentState = JSON.stringify({ status: 'idle', message: '' });
      emailStatus.textContent = '';
      emailStatus.className = 'status-msg';
    }
  }

  const canSubmit = emailValid && passValid && termsChecked;
  submit.disabled = !canSubmit;
  submit.dataset.agentState = JSON.stringify({ disabled: !canSubmit });

  refreshDistiller();
}

// Wire form input events
getEl<HTMLInputElement>('email-input')?.addEventListener('input', validateForm);
getEl<HTMLInputElement>('password-input')?.addEventListener('input', validateForm);
getEl<HTMLInputElement>('terms-checkbox')?.addEventListener('change', validateForm);

// ── Agent action dispatch ─────────────────────────────────────────────────────
async function runAgentAction(action: string, nodeId: string, value?: string): Promise<void> {
  try {
    const result = await bridge.dispatch({ nodeId, action: action as any, value });
    actionLog.push(result);
    if (['fill', 'check', 'clear'].includes(action)) validateForm();
    renderActionLog();
    refreshDistiller();
  } catch (err) {
    console.error('[AgentDOM] runAgentAction error:', err);
  }
}

document.getElementById('agent-fill-email')?.addEventListener('click',  () => runAgentAction('fill',  'email-input',    'user@example.com'));
document.getElementById('agent-fill-pass')?.addEventListener('click',   () => runAgentAction('fill',  'password-input', 'SecureP@ss1'));
document.getElementById('agent-check-terms')?.addEventListener('click', () => runAgentAction('check', 'terms-checkbox', 'true'));
document.getElementById('agent-submit')?.addEventListener('click',      () => runAgentAction('click', 'submit-btn'));
document.getElementById('agent-bad-email')?.addEventListener('click',   () => runAgentAction('fill',  'email-input',    'not-an-email'));
document.getElementById('agent-reset')?.addEventListener('click', async () => {
  await runAgentAction('clear', 'email-input');
  await runAgentAction('clear', 'password-input');
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
    const ctx = await SiteContextLoader.load(window.location.origin);
    const parts: string[] = [];
    if (ctx.narrative) parts.push('=== agent.md ===\n\n' + ctx.narrative);
    if (ctx.manifest)  parts.push('=== agents.json ===\n\n' + JSON.stringify(ctx.manifest, null, 2));
    if (ctx.policy)    parts.push('=== agents.txt (parsed) ===\n\n' + JSON.stringify(ctx.policy.policy, null, 2));
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
