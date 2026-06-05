// ─────────────────────────────────────────────────────────────────────────────
// WCI Benchmark — Scenario browser
// ─────────────────────────────────────────────────────────────────────────────

import manifest from './scenarios/manifest.json';
import benchmarkInfo from './scenarios/benchmark-info.json';
import evalConfig from './public/eval-config.json';
import { initMobileNav } from './nav-mobile';

interface VsSuiteMeanMetric {
  delta: number;
  zScore: number;
}

interface ScenarioBenchmarkCounts {
  wciNodes: number;
  wciAttributes: number;
  wciIds?: number;
  inAppPages?: number;
  inAppPagesKind?: string;
  domElements?: number;
  totalElements?: number;
  wciNodeSharePct?: number;
  attrsPerNode?: number;
  vsSuiteMean?: {
    inAppPages?: VsSuiteMeanMetric;
    domElements?: VsSuiteMeanMetric;
    wciNodes?: VsSuiteMeanMetric;
    wciNodeSharePct?: VsSuiteMeanMetric;
    wciAttributes?: VsSuiteMeanMetric;
  };
}

interface ScenarioMeta {
  id: string;
  title: string;
  icon: string;
  difficulty: 'Hard' | 'Very Hard' | 'Extreme';
  description: string;
  challenges: string[];
  benchmark?: ScenarioBenchmarkCounts;
  task?: { goal: string };
}

interface ScenarioListItem extends ScenarioMeta {
  tier: 'handmade' | 'synthetic';
  displayDifficulty: 'easy' | 'medium' | 'hard';
  searchText: string;
}

/** Five hand-authored pages (rich DOM, preserved on disk). */
const HANDMADE_SCENARIOS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'admin-dashboard',
  'social-feed',
]);

const HANDMADE_SCENARIO_NAMES =
  'flight booking, banking, checkout, dashboard, social media';

type DisplayDifficulty = ScenarioListItem['displayDifficulty'];
type ScenarioTier = ScenarioListItem['tier'];

function scenarioTier(id: string): ScenarioTier {
  return HANDMADE_SCENARIOS.has(id) ? 'handmade' : 'synthetic';
}

/** Maps benchmark meta labels (Hard / Very Hard / Extreme) to UI tiers. */
function displayDifficulty(metaDifficulty: ScenarioMeta['difficulty']): DisplayDifficulty {
  if (metaDifficulty === 'Hard') return 'easy';
  if (metaDifficulty === 'Very Hard') return 'medium';
  return 'hard';
}

function displayDifficultyLabel(d: DisplayDifficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

interface WciAttributeRow {
  name: string;
  rawValue: string;
  displayValue: string;
  isJson: boolean;
}

type ViewMode = 'raw' | 'annotated';

const WCI_ATTR_ORDER = [
  'data-wci-id',
  'data-wci-role',
  'data-wci-desc',
  'data-wci-action',
  'data-wci-state',
  'data-wci-precondition',
  'data-wci-required',
  'data-wci-options',
  'data-wci-emit',
  'data-wci-scope',
  'data-wci-hidden',
  'data-wci-priority',
] as const;

const JSON_WCI_ATTRS = new Set(['data-wci-state', 'data-wci-options']);
const LANDMARK_AREA_RATIO = 0.45;

const WCI_INSPECTOR_CSS = `
.wci-node { }
.wci-inspect-on .wci-node {
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.3);
}
`;

const metaById: Record<string, ScenarioMeta> = Object.fromEntries(
  Object.entries(
    import.meta.glob('./scenarios/*/meta.json', {
      eager: true,
      import: 'default',
    }) as Record<string, ScenarioMeta>
  ).map(([path, meta]) => {
    const id = path.match(/\.\/scenarios\/([^/]+)\/meta\.json$/)?.[1];
    if (!id) throw new Error(`Invalid meta path: ${path}`);
    return [id, meta];
  })
);

const rawLoaders = import.meta.glob('./scenarios/*/raw.html', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const annotatedLoaders = import.meta.glob('./scenarios/*/annotated.html', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const scenarioList: ScenarioListItem[] = manifest.scenarios
  .map((id) => {
    const meta = metaById[id];
    if (!meta) throw new Error(`Missing meta.json for scenario "${id}"`);
    const tier = scenarioTier(id);
    const displayDiff = displayDifficulty(meta.difficulty);
    return {
      ...meta,
      tier,
      displayDifficulty: displayDiff,
      searchText: `${id} ${meta.title} ${meta.description} ${tier} ${displayDiff} handmade synthetic`.toLowerCase(),
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

// ── DOM refs ──────────────────────────────────────────────────────────────────

const listEl = document.getElementById('scenario-list')!;
const searchEl = document.getElementById('scenario-search') as HTMLInputElement;
const countEl = document.getElementById('scenario-count')!;
const difficultyFilters = document.getElementById('difficulty-filters')!;
const tierFilters = document.getElementById('tier-filters')!;
const headerEl = document.getElementById('scenario-header')!;
const controlsEl = document.getElementById('scenario-controls')!;
const loadingEl = document.getElementById('scenario-loading')!;
const viewerLayout = document.getElementById('viewer-layout')!;
const viewerWrap = document.getElementById('viewer-wrap')!;
const viewerEmpty = document.getElementById('viewer-empty')!;
const iframe = document.getElementById('scenario-iframe') as HTMLIFrameElement;
const inspectLayer = document.getElementById('wci-inspect-layer')!;
const inspectHint = document.getElementById('wci-inspect-hint')!;
const highlightBox = document.getElementById('wci-highlight')!;
const highlightTag = document.getElementById('wci-highlight-tag')!;
const inspector = document.getElementById('wci-inspector')!;
const inspectorStatus = document.getElementById('wci-inspector-status')!;
const inspectorEmpty = document.getElementById('wci-inspector-empty')!;
const inspectorContent = document.getElementById('wci-inspector-content')!;
const inspectorNode = document.getElementById('wci-inspector-node')!;
const inspectorRoleRow = document.getElementById('wci-inspector-role-row')!;
const inspectorDesc = document.getElementById('wci-inspector-desc')!;
const inspectorAttrs = document.getElementById('wci-inspector-attrs')!;
const clearBtn = document.getElementById('wci-clear-btn') as HTMLButtonElement;
const nodePicker = document.getElementById('wci-node-picker') as HTMLSelectElement;
const inspectModeToggle = document.getElementById('wci-inspect-mode') as HTMLInputElement;
const inspectModeLabel = document.getElementById('wci-inspect-mode-label')!;
const highlightToggle = document.getElementById('wci-highlight-toggle') as HTMLInputElement;
const showAllLabel = document.getElementById('wci-show-all-label')!;
const wciCountEl = document.getElementById('wci-node-count')!;
const challengesBlock = document.getElementById('scenario-challenges')!;
const challengesList = document.getElementById('challenges-list')!;
const challengesCount = document.getElementById('challenges-count')!;
const benchmarkInfoSummary = document.getElementById('benchmark-info-summary')!;
const evalConfigSummary = document.getElementById('eval-config-summary')!;
const scenarioAnnotationsEl = document.getElementById('scenario-annotations')!;

let activeId: string | null = null;
let viewMode: ViewMode = 'raw';
let htmlCache: Record<string, { raw?: string; annotated?: string }> = {};
let inspectorCleanup: (() => void) | null = null;

let wciNodes: HTMLElement[] = [];
let wciNodeById = new Map<string, HTMLElement>();
let hoverNode: HTMLElement | null = null;
let selectedNode: HTMLElement | null = null;
let displayedNodeKey: string | null = null;
let pointerRaf = 0;
let iframeDoc: Document | null = null;

// ── URL state ─────────────────────────────────────────────────────────────────

function readUrlState(): { id: string | null; view: ViewMode } {
  const params = new URLSearchParams(location.search);
  return {
    id: params.get('scenario'),
    view: params.get('view') === 'annotated' ? 'annotated' : 'raw',
  };
}

function pushUrlState(id: string, view: ViewMode): void {
  const params = new URLSearchParams();
  params.set('scenario', id);
  if (view === 'annotated') params.set('view', 'annotated');
  history.replaceState({ scenario: id, view }, '', `${location.pathname}?${params.toString()}`);
}

// ── HTML loading ──────────────────────────────────────────────────────────────

async function loadHtml(id: string, kind: ViewMode): Promise<string> {
  const cached = htmlCache[id]?.[kind];
  if (cached) return cached;
  const key = `./scenarios/${id}/${kind}.html`;
  const loader = kind === 'raw' ? rawLoaders[key] : annotatedLoaders[key];
  if (!loader) throw new Error(`Missing ${kind}.html for "${id}"`);
  const html = await loader();
  htmlCache[id] = { ...htmlCache[id], [kind]: html };
  return html;
}

function injectInspectorStyles(html: string): string {
  const style = `<style id="wci-inspector">${WCI_INSPECTOR_CSS}</style>`;
  if (html.includes('</head>')) return html.replace('</head>', `${style}</head>`);
  return `${style}${html}`;
}

// ── WCI helpers ───────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isWciAnnotatedElement(el: Element): boolean {
  return [...el.attributes].some(
    (a) => a.name.startsWith('data-wci-') && a.name !== 'data-wci-legacy-styles'
  );
}

function findWciNodes(doc: Document): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>('*')].filter(isWciAnnotatedElement);
}

function nodeKey(el: HTMLElement): string {
  return el.getAttribute('data-wci-id') ?? `${el.tagName}-${el.getAttribute('id') ?? 'anon'}`;
}

function nodeArea(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
}

function isOversizedLandmark(el: HTMLElement, doc: Document): boolean {
  if (el.getAttribute('data-wci-role') !== 'landmark') return false;
  const view = doc.defaultView;
  if (!view) return false;
  const maxArea = view.innerWidth * view.innerHeight * LANDMARK_AREA_RATIO;
  return nodeArea(el) > maxArea;
}

function iframePoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = iframe.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function resolveWciNode(doc: Document, clientX: number, clientY: number): HTMLElement | null {
  const { x, y } = iframePoint(clientX, clientY);
  if (x < 0 || y < 0 || x > iframe.clientWidth || y > iframe.clientHeight) return null;

  const stack = doc.elementsFromPoint(x, y);
  const HtmlEl = doc.defaultView?.HTMLElement;
  let best: HTMLElement | null = null;
  let bestArea = Infinity;

  for (const el of stack) {
    if (HtmlEl ? !(el instanceof HtmlEl) : el.nodeType !== Node.ELEMENT_NODE) continue;
    const htmlEl = el as HTMLElement;
    const node = htmlEl.classList.contains('wci-node')
      ? htmlEl
      : (htmlEl.closest('.wci-node') as HTMLElement | null);
    if (!node || node === best) continue;
    if (isOversizedLandmark(node, doc)) continue;

    const area = nodeArea(node);
    if (area < bestArea) {
      bestArea = area;
      best = node;
    }
  }

  return best;
}

/** Merge live DOM control state into the annotated JSON snapshot. */
function getLiveWciState(el: HTMLElement): Record<string, unknown> {
  let state: Record<string, unknown> = {};
  try {
    state = JSON.parse(el.getAttribute('data-wci-state') ?? '{}');
  } catch {
    /* ignore */
  }

  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      state.checked = el.checked;
    } else if (el.type !== 'button' && el.type !== 'submit' && el.type !== 'reset' && el.type !== 'file') {
      state.value = el.value;
    }
    if (el.disabled) state.disabled = true;
    else delete state.disabled;
  } else if (el instanceof HTMLTextAreaElement) {
    state.value = el.value;
    if (el.disabled) state.disabled = true;
    else delete state.disabled;
  } else if (el instanceof HTMLSelectElement) {
    state.value = el.value;
    const opt = el.selectedOptions[0];
    if (opt) state.selected = opt.textContent?.trim() ?? el.value;
    if (el.disabled) state.disabled = true;
    else delete state.disabled;
  } else if (el instanceof HTMLButtonElement) {
    if (el.disabled) state.disabled = true;
    else delete state.disabled;
  }

  return state;
}

/** Write live DOM state back to data-wci-state so annotations match user actions. */
function syncWciStateAttribute(el: HTMLElement): void {
  if (!el.hasAttribute('data-wci-state') && !el.dataset.wciId) return;
  const next = JSON.stringify(getLiveWciState(el));
  if (el.getAttribute('data-wci-state') !== next) {
    el.setAttribute('data-wci-state', next);
  }
}

function isInspectableActionTarget(el: HTMLElement): boolean {
  const action = el.getAttribute('data-wci-action');
  if (!action) return false;
  if (action === 'check') {
    return el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');
  }
  if (action === 'click') {
    return (
      el instanceof HTMLButtonElement ||
      (el instanceof HTMLInputElement &&
        (el.type === 'button' || el.type === 'submit' || el.type === 'reset'))
    );
  }
  return false;
}

function performInspectableAction(el: HTMLElement): void {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    el.click();
  } else {
    el.click();
  }
  syncWciStateAttribute(el);
}

function collectWciAttributes(el: HTMLElement): WciAttributeRow[] {
  syncWciStateAttribute(el);
  const rows: WciAttributeRow[] = [];
  for (const attr of el.attributes) {
    if (!attr.name.startsWith('data-wci-') || attr.name === 'data-wci-legacy-styles') continue;
    const isJson = JSON_WCI_ATTRS.has(attr.name);
    let rawValue = attr.value;
    let displayValue = attr.value;
    if (attr.name === 'data-wci-state') {
      const live = getLiveWciState(el);
      rawValue = JSON.stringify(live);
      displayValue = JSON.stringify(live, null, 2);
    } else if (isJson) {
      try {
        displayValue = JSON.stringify(JSON.parse(attr.value), null, 2);
      } catch {
        /* raw */
      }
    }
    rows.push({ name: attr.name, rawValue, displayValue, isJson });
  }
  rows.sort((a, b) => {
    const ai = WCI_ATTR_ORDER.indexOf(a.name as (typeof WCI_ATTR_ORDER)[number]);
    const bi = WCI_ATTR_ORDER.indexOf(b.name as (typeof WCI_ATTR_ORDER)[number]);
    const ar = ai === -1 ? WCI_ATTR_ORDER.length : ai;
    const br = bi === -1 ? WCI_ATTR_ORDER.length : bi;
    return ar !== br ? ar - br : a.name.localeCompare(b.name);
  });
  return rows;
}

function formatElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.getAttribute('id');
  const wciId = el.getAttribute('data-wci-id');
  let s = `&lt;${tag}`;
  if (id) s += ` id="${escapeHtml(id)}"`;
  if (wciId) s += ` data-wci-id="${escapeHtml(wciId)}"`;
  return `${s} /&gt;`;
}

function populateNodePicker(nodes: HTMLElement[]): void {
  const sorted = [...nodes].sort((a, b) => {
    const pa = parseInt(a.getAttribute('data-wci-priority') ?? '9', 10);
    const pb = parseInt(b.getAttribute('data-wci-priority') ?? '9', 10);
    if (pa !== pb) return pa - pb;
    return (a.getAttribute('data-wci-id') ?? '').localeCompare(b.getAttribute('data-wci-id') ?? '');
  });

  wciNodeById.clear();
  nodePicker.innerHTML = '<option value="">— jump to node —</option>';
  for (const node of sorted) {
    const id = node.getAttribute('data-wci-id');
    if (!id) continue;
    wciNodeById.set(id, node);
    const role = node.getAttribute('data-wci-role') ?? '';
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${id} (${role})`;
    nodePicker.appendChild(opt);
  }
  nodePicker.disabled = sorted.length === 0;
}

function positionHighlight(el: HTMLElement): void {
  const elRect = el.getBoundingClientRect();
  const wrapRect = viewerWrap.getBoundingClientRect();

  const top = elRect.top - wrapRect.top;
  const left = elRect.left - wrapRect.left;

  highlightBox.style.transform = `translate(${left}px, ${top}px)`;
  highlightBox.style.width = `${elRect.width}px`;
  highlightBox.style.height = `${elRect.height}px`;
  highlightBox.hidden = false;
  highlightBox.classList.add('is-visible');
  highlightBox.setAttribute('aria-hidden', 'false');
  highlightBox.classList.toggle('is-selected', selectedNode === el);

  highlightTag.textContent =
    el.getAttribute('data-wci-id') ?? el.getAttribute('data-wci-role') ?? el.tagName.toLowerCase();
}

function hideHighlight(): void {
  highlightBox.hidden = true;
  highlightBox.classList.remove('is-visible', 'is-selected');
  highlightBox.setAttribute('aria-hidden', 'true');
}

function refreshInspectorPanel(): void {
  const el = selectedNode ?? hoverNode;
  if (!el) return;
  renderInspectorPanel(el, el === selectedNode, true);
}

function onWciDomStateChange(el: HTMLElement): void {
  syncWciStateAttribute(el);
  if (el === selectedNode || el === hoverNode) refreshInspectorPanel();
}

function renderInspectorPanel(el: HTMLElement, isSelected: boolean, forceRefresh = false): void {
  const key = nodeKey(el);
  const sameNode = !forceRefresh && key === displayedNodeKey;

  if (!sameNode) {
    displayedNodeKey = key;
    const attrs = collectWciAttributes(el);
    const role = el.getAttribute('data-wci-role');
    const action = el.getAttribute('data-wci-action');
    const priority = el.getAttribute('data-wci-priority');
    const desc = el.getAttribute('data-wci-desc');

    inspectorNode.innerHTML = formatElementLabel(el);

    const badges: string[] = [];
    if (role) badges.push(`<span class="wci-inspector__badge wci-inspector__badge--role">${escapeHtml(role)}</span>`);
    if (action) badges.push(`<span class="wci-inspector__badge wci-inspector__badge--action">${escapeHtml(action)}</span>`);
    if (priority) badges.push(`<span class="wci-inspector__badge wci-inspector__badge--priority">P${escapeHtml(priority)}</span>`);
    inspectorRoleRow.innerHTML = badges.join('');

    if (desc) {
      inspectorDesc.textContent = desc;
      inspectorDesc.hidden = false;
    } else {
      inspectorDesc.hidden = true;
    }

    inspectorAttrs.innerHTML = `
      <div class="wci-inspector__attrs-title">${attrs.length} attributes</div>
      ${attrs
        .map((row) => {
          let cls = 'wci-attr-row__value';
          let val: string;
          if (!row.rawValue) {
            cls += ' wci-attr-row__value--empty';
            val = '(empty)';
          } else if (row.isJson) {
            cls += ' wci-attr-row__value--json';
            val = escapeHtml(row.displayValue);
          } else {
            val = escapeHtml(row.displayValue);
          }
          return `<div class="wci-attr-row"><div class="wci-attr-row__name">${escapeHtml(row.name)}</div><div class="${cls}">${val}</div></div>`;
        })
        .join('')}
    `;

    const pickerId = el.getAttribute('data-wci-id');
    if (pickerId && nodePicker.value !== pickerId) nodePicker.value = pickerId;
  }

  inspectorEmpty.hidden = true;
  inspectorContent.hidden = false;
  clearBtn.hidden = !isSelected;
  inspectorStatus.textContent = isSelected
    ? `Selected: ${el.getAttribute('data-wci-id') ?? 'element'}`
    : `Hovering: ${el.getAttribute('data-wci-id') ?? 'element'}`;

  positionHighlight(el);
}

function clearSelection(): void {
  selectedNode = null;
  hoverNode = null;
  displayedNodeKey = null;
  inspectorEmpty.hidden = false;
  inspectorContent.hidden = true;
  clearBtn.hidden = true;
  inspectorStatus.textContent = 'No element selected';
  nodePicker.value = '';
  hideHighlight();
}

function showNode(el: HTMLElement, selected: boolean): void {
  if (selected) {
    selectedNode = el;
    hoverNode = el;
  } else {
    hoverNode = el;
  }
  renderInspectorPanel(el, selected);
}

function updateHover(clientX: number, clientY: number): void {
  if (!iframeDoc || !inspectModeToggle.checked) return;
  if (selectedNode) return;

  const node = resolveWciNode(iframeDoc, clientX, clientY);
  if (node === hoverNode) {
    if (node) positionHighlight(node);
    return;
  }

  hoverNode = node;
  if (node) {
    renderInspectorPanel(node, false);
  } else {
    displayedNodeKey = null;
    inspectorEmpty.hidden = false;
    inspectorContent.hidden = true;
    inspectorStatus.textContent = 'No element selected';
    hideHighlight();
  }
}

function syncInspectUI(): void {
  const annotated = viewMode === 'annotated';
  const inspectOn = annotated && inspectModeToggle.checked;

  inspectLayer.hidden = !inspectOn;
  inspectLayer.setAttribute('aria-hidden', inspectOn ? 'false' : 'true');
  inspectHint.hidden = !inspectOn;

  inspectModeLabel.classList.toggle('is-disabled', !annotated);
  inspectModeToggle.disabled = !annotated;
  showAllLabel.classList.toggle('is-disabled', !annotated);
  highlightToggle.disabled = !annotated;
  inspector.hidden = !annotated;
  viewerLayout.classList.toggle('scenarios-preview--raw', !annotated);

  if (iframeDoc && annotated) {
    iframeDoc.documentElement.classList.toggle('wci-inspect-on', highlightToggle.checked);
  }
}

function detachInspector(): void {
  inspectorCleanup?.();
  inspectorCleanup = null;
  iframeDoc = null;
  wciNodes = [];
  wciNodeById.clear();
  selectedNode = null;
  hoverNode = null;
  displayedNodeKey = null;
  cancelAnimationFrame(pointerRaf);
  clearSelection();
  nodePicker.innerHTML = '<option value="">— jump to node —</option>';
  nodePicker.disabled = true;
}

function attachInspector(doc: Document): void {
  detachInspector();
  iframeDoc = doc;

  if (viewMode !== 'annotated') return;

  doc.documentElement.classList.toggle('wci-inspect-on', highlightToggle.checked);
  wciNodes = findWciNodes(doc);
  wciNodes.forEach((el) => el.classList.add('wci-node'));
  populateNodePicker(wciNodes);
  syncInspectUI();

  const onLayerMove = (e: MouseEvent) => {
    cancelAnimationFrame(pointerRaf);
    pointerRaf = requestAnimationFrame(() => updateHover(e.clientX, e.clientY));
  };

  const onLayerClick = (e: MouseEvent) => {
    e.preventDefault();
    if (!iframeDoc) return;
    const node = resolveWciNode(iframeDoc, e.clientX, e.clientY);
    if (!node) {
      clearSelection();
      return;
    }
    if (selectedNode === node && isInspectableActionTarget(node)) {
      performInspectableAction(node);
      showNode(node, true);
      return;
    }
    if (selectedNode === node) {
      clearSelection();
    } else {
      showNode(node, true);
    }
  };

  const onFormInput = (e: Event) => {
    const t = e.target;
    if (!(t instanceof HTMLElement) || !t.closest('[data-wci-id]')) return;
    const el = t.closest<HTMLElement>('[data-wci-id]') ?? (t.matches('[data-wci-id]') ? t : null);
    if (el) onWciDomStateChange(el);
  };

  const onWciStateChange = (e: Event) => {
    const detail = (e as CustomEvent<{ nodeId?: string }>).detail;
    const id = detail?.nodeId;
    const el = id ? wciNodeById.get(id) : null;
    if (el) onWciDomStateChange(el);
  };

  const stateObserver = new MutationObserver((records) => {
    for (const rec of records) {
      if (rec.type !== 'attributes' || rec.attributeName !== 'data-wci-state') continue;
      const el = rec.target;
      if (el instanceof HTMLElement) onWciDomStateChange(el);
    }
  });
  stateObserver.observe(doc.body, {
    attributes: true,
    attributeFilter: ['data-wci-state'],
    subtree: true,
  });

  const onLayerLeave = () => {
    if (!selectedNode) {
      hoverNode = null;
      displayedNodeKey = null;
      inspectorEmpty.hidden = false;
      inspectorContent.hidden = true;
      inspectorStatus.textContent = 'No element selected';
      hideHighlight();
    }
  };

  const onScroll = () => {
    const target = selectedNode ?? hoverNode;
    if (target) positionHighlight(target);
  };

  inspectLayer.addEventListener('mousemove', onLayerMove, { passive: true });
  inspectLayer.addEventListener('click', onLayerClick);
  inspectLayer.addEventListener('mouseleave', onLayerLeave);
  doc.addEventListener('input', onFormInput, true);
  doc.addEventListener('change', onFormInput, true);
  doc.addEventListener('wci:state-change', onWciStateChange);
  doc.defaultView?.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onScroll, { passive: true });

  inspectorCleanup = () => {
    cancelAnimationFrame(pointerRaf);
    stateObserver.disconnect();
    inspectLayer.removeEventListener('mousemove', onLayerMove);
    inspectLayer.removeEventListener('click', onLayerClick);
    inspectLayer.removeEventListener('mouseleave', onLayerLeave);
    doc.removeEventListener('input', onFormInput, true);
    doc.removeEventListener('change', onFormInput, true);
    doc.removeEventListener('wci:state-change', onWciStateChange);
    doc.defaultView?.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
    wciNodes.forEach((el) => el.classList.remove('wci-node'));
    doc.documentElement.classList.remove('wci-inspect-on');
  };
}

// ── Render scenario ───────────────────────────────────────────────────────────

async function renderScenario(id: string): Promise<void> {
  loadingEl.hidden = false;
  viewerEmpty.hidden = true;
  iframe.hidden = true;
  detachInspector();

  try {
    const html = await loadHtml(id, viewMode);
    iframe.srcdoc = viewMode === 'annotated' ? injectInspectorStyles(html) : html;
    iframe.hidden = false;
    viewerWrap.classList.remove('is-empty');

    iframe.onload = () => {
      loadingEl.hidden = true;
      const doc = iframe.contentDocument;
      if (!doc) return;

      if (viewMode === 'annotated') {
        const count = findWciNodes(doc).length;
        wciCountEl.textContent = `${count} nodes`;
        wciCountEl.hidden = false;
        attachInspector(doc);
      } else {
        wciCountEl.hidden = true;
        syncInspectUI();
      }
    };
  } catch (err) {
    loadingEl.hidden = true;
    viewerWrap.classList.add('is-empty');
    iframe.hidden = true;
    viewerEmpty.hidden = false;
    viewerEmpty.textContent = err instanceof Error ? err.message : 'Failed to load scenario.';
    console.error('[scenarios]', err);
  }
}

function formatVsSuite(delta?: VsSuiteMeanMetric): string {
  if (!delta) return '';
  const sign = delta.delta >= 0 ? '+' : '';
  return ` (${sign}${delta.delta} vs suite mean, z=${delta.zScore})`;
}

function formatAnnotationSummary(counts: ScenarioBenchmarkCounts): string {
  const pieces = counts.wciNodes;
  const labels = counts.wciAttributes;
  const dom = counts.domElements ?? counts.totalElements;
  const pct = counts.wciNodeSharePct;
  const vs = counts.vsSuiteMean;
  const pages = counts.inAppPages ?? 1;
  const pageLabel = pages === 1 ? '1 in-app page' : `${pages} in-app pages`;
  if (dom != null && pct != null) {
    return (
      `${pageLabel} · ${pieces} of ${dom} DOM nodes WCI-annotated (${pct}%)` +
      `${formatVsSuite(vs?.domElements)} · ${labels.toLocaleString()} labels` +
      `${formatVsSuite(vs?.wciAttributes)}`
    );
  }
  return `${pageLabel} · ~${labels.toLocaleString()} WCI labels on ${pieces} UI pieces`;
}

function renderBenchmarkInfoPanel(): void {
  const suite = benchmarkInfo.suite;
  const labels = suite.wciAttributes;
  const pieces = suite.wciNodes;
  const inApp = suite.inAppPages;
  const dom = suite.domElements ?? suite.totalElements;
  const share = suite.wciNodeSharePct;
  benchmarkInfoSummary.innerHTML = [
    `<strong>${benchmarkInfo.scenarioCount} fake websites.</strong> `,
    `Average <strong>~${Math.round(inApp?.mean ?? 1)} ± ${Math.round(inApp?.stdDev ?? 0)} in-app pages</strong> per site `,
    `(median ${Math.round(inApp?.median ?? 1)}; 5 multi-page SPAs). `,
    `Typically <strong>~${Math.round(pieces.median)} ± ${Math.round(pieces.stdDev)} WCI nodes</strong> across `,
    `<strong>~${Math.round(dom?.median ?? 0)} ± ${Math.round(dom?.stdDev ?? 0)} DOM nodes</strong> `,
    `(<strong>~${Math.round(share?.median ?? 0)}% ± ${Math.round(share?.stdDev ?? 0)}%</strong> annotated). `,
    `Plus <strong>~${Math.round(labels.median).toLocaleString()} ± ${Math.round(labels.stdDev).toLocaleString()} labels</strong>.`,
  ].join('');

  const ms = evalConfig.inference?.multistep;
  const modelCount = evalConfig.models?.length ?? 0;
  evalConfigSummary.innerHTML = [
    `<strong>temperature ${ms?.temperature ?? 0}</strong>, `,
    `max_tokens <strong>${ms?.maxTokens ?? 800}</strong>, `,
    `reasoning <strong>${ms?.reasoning?.effort ?? 'low'}</strong>. `,
    `<strong>${modelCount}</strong> OpenRouter models · `,
    '5 approach-specific system prompts (multi-step).',
  ].join('');
}

function selectScenario(id: string, updateUrl = true): void {
  const meta = metaById[id];
  if (!meta) return;

  activeId = id;
  if (updateUrl) pushUrlState(id, viewMode);

  document.getElementById('scenario-icon')!.textContent = meta.icon;
  document.getElementById('scenario-title')!.textContent = meta.title;
  document.getElementById('scenario-id')!.textContent = meta.id;

  const tier = scenarioTier(id);
  const displayDiff = displayDifficulty(meta.difficulty);
  const metaRow = document.getElementById('scenario-meta-row')!;
  const tierEl = document.getElementById('scenario-tier')!;
  const diffEl = document.getElementById('scenario-difficulty')!;
  tierEl.textContent = tier === 'handmade' ? 'Handmade' : 'Synthetic';
  tierEl.className = `scenarios-main__tier scenarios-main__tier--${tier}`;
  diffEl.textContent = displayDifficultyLabel(displayDiff);
  diffEl.className = `scenarios-main__difficulty scenarios-main__difficulty--${displayDiff}`;

  const infoRow = benchmarkInfo.scenarios[id as keyof typeof benchmarkInfo.scenarios];
  const perPage = meta.benchmark
    ? { ...meta.benchmark, vsSuiteMean: infoRow?.vsSuiteMean ?? meta.benchmark.vsSuiteMean }
    : infoRow;
  if (perPage && 'wciAttributes' in perPage) {
    scenarioAnnotationsEl.textContent = formatAnnotationSummary(perPage as ScenarioBenchmarkCounts);
    scenarioAnnotationsEl.hidden = false;
  } else {
    scenarioAnnotationsEl.hidden = true;
  }

  metaRow.hidden = false;

  document.getElementById('scenario-desc')!.textContent = meta.description;

  const taskEl = document.getElementById('scenario-task')!;
  const goalEl = document.getElementById('scenario-task-goal')!;
  if (meta.task?.goal) {
    goalEl.textContent = meta.task.goal;
    taskEl.hidden = false;
  } else {
    taskEl.hidden = true;
  }

  challengesList.innerHTML = meta.challenges.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
  challengesCount.textContent = String(meta.challenges.length);
  challengesBlock.hidden = meta.challenges.length === 0;

  headerEl.hidden = false;
  controlsEl.hidden = false;
  syncInspectUI();

  listEl.querySelectorAll('.scenarios-list__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-id') === id);
  });

  void renderScenario(id);
}

function setViewMode(mode: ViewMode): void {
  viewMode = mode;
  document.querySelectorAll<HTMLButtonElement>('.scenarios-view-tab').forEach((tab) => {
    const active = tab.dataset.view === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  syncInspectUI();
  if (activeId) {
    pushUrlState(activeId, viewMode);
    void renderScenario(activeId);
  }
}

function difficultyClass(d: DisplayDifficulty): string {
  return `scenarios-list__difficulty--${d}`;
}

function renderScenarioButton(s: ScenarioListItem): string {
  return `
    <li class="scenarios-list__item">
      <button type="button" class="scenarios-list__btn${s.id === activeId ? ' is-active' : ''}" data-id="${escapeHtml(s.id)}">
        <span class="scenarios-list__icon">${s.icon}</span>
        <span class="scenarios-list__text">
          <span class="scenarios-list__title">${escapeHtml(s.title)}</span>
          <span class="scenarios-list__meta">${escapeHtml(s.id)}</span>
        </span>
        <span class="scenarios-list__difficulty ${difficultyClass(s.displayDifficulty)}">${displayDifficultyLabel(s.displayDifficulty)}</span>
      </button>
    </li>`;
}

function renderList(filter = ''): void {
  const q = filter.trim().toLowerCase();
  const difficulty =
    difficultyFilters.querySelector<HTMLButtonElement>('.scenarios-filter-chip.is-active')
      ?.dataset.difficulty ?? 'all';
  const tier =
    tierFilters.querySelector<HTMLButtonElement>('.scenarios-filter-chip.is-active')?.dataset.tier ??
    'all';

  const visible = scenarioList.filter((s) => {
    if (tier !== 'all' && s.tier !== tier) return false;
    if (difficulty !== 'all' && s.displayDifficulty !== difficulty) return false;
    if (q && !s.searchText.includes(q)) return false;
    return true;
  });

  countEl.textContent =
    visible.length === scenarioList.length
      ? `${scenarioList.length} scenarios`
      : `${visible.length} of ${scenarioList.length} scenarios`;

  const showSections = tier === 'all' && !q;
  const handmade = visible.filter((s) => s.tier === 'handmade');
  const synthetic = visible.filter((s) => s.tier === 'synthetic');

  let html = '';
  if (showSections && handmade.length) {
    html += `<li class="scenarios-list__section scenarios-list__section--handmade">Handmade · ${handmade.length} — ${HANDMADE_SCENARIO_NAMES}</li>`;
    html += handmade.map(renderScenarioButton).join('');
  } else if (!showSections) {
    html += visible.filter((s) => s.tier === 'handmade').map(renderScenarioButton).join('');
  }

  if (showSections && synthetic.length) {
    html += `<li class="scenarios-list__section scenarios-list__section--synthetic">Synthetic · ${synthetic.length}</li>`;
    html += synthetic.map(renderScenarioButton).join('');
  } else if (!showSections) {
    html += visible.filter((s) => s.tier === 'synthetic').map(renderScenarioButton).join('');
  }

  listEl.innerHTML = html;

  listEl.querySelectorAll<HTMLButtonElement>('.scenarios-list__btn').forEach((btn) => {
    btn.addEventListener('click', () => selectScenario(btn.dataset.id!));
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

searchEl.addEventListener('input', () => renderList(searchEl.value));

difficultyFilters.addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('.scenarios-filter-chip');
  if (!chip) return;
  difficultyFilters.querySelectorAll('.scenarios-filter-chip').forEach((c) => {
    c.classList.toggle('is-active', c === chip);
  });
  renderList(searchEl.value);
});

tierFilters.addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('.scenarios-filter-chip');
  if (!chip) return;
  tierFilters.querySelectorAll('.scenarios-filter-chip').forEach((c) => {
    c.classList.toggle('is-active', c === chip);
  });
  renderList(searchEl.value);
});

document.querySelector('.scenarios-view-tabs')!.addEventListener('click', (e) => {
  const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.scenarios-view-tab');
  if (!tab?.dataset.view) return;
  setViewMode(tab.dataset.view as ViewMode);
});

inspectModeToggle.addEventListener('change', () => {
  syncInspectUI();
  if (!inspectModeToggle.checked) clearSelection();
});

highlightToggle.addEventListener('change', () => {
  if (iframeDoc) {
    iframeDoc.documentElement.classList.toggle('wci-inspect-on', highlightToggle.checked);
  }
});

clearBtn.addEventListener('click', clearSelection);

nodePicker.addEventListener('change', () => {
  const id = nodePicker.value;
  if (!id) {
    clearSelection();
    return;
  }
  const node = wciNodeById.get(id);
  if (node) {
    showNode(node, true);
    node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }
});

// Highlight uses transform — set initial position
highlightBox.style.position = 'absolute';
highlightBox.style.top = '0';
highlightBox.style.left = '0';

renderList();
renderBenchmarkInfoPanel();

const { id: urlId, view: urlView } = readUrlState();
viewMode = urlView;
document.querySelectorAll<HTMLButtonElement>('.scenarios-view-tab').forEach((tab) => {
  tab.classList.toggle('is-active', tab.dataset.view === viewMode);
  tab.setAttribute('aria-selected', tab.dataset.view === viewMode ? 'true' : 'false');
});
syncInspectUI();

selectScenario(urlId && metaById[urlId] ? urlId : manifest.scenarios[0], Boolean(urlId));
initMobileNav();
