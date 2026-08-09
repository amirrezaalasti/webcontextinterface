// ─────────────────────────────────────────────────────────────────────────────
// WCI Annotator — derive data-wci-* annotations from unannotated HTML
//
// WCI is inert on a page nobody annotated, which is currently most of the web.
// This module closes that gap from the agent's side: it reconstructs the
// annotation layer from signals the page already carries — accessible names,
// ARIA roles, label associations, form structure, native element semantics.
//
// The result is deliberately weaker than an operator's annotations. An author
// can write "Submit order — charges the saved card and cannot be undone";
// inference can only reach "Place Order". Keeping the two paths separate and
// measurable is the point: the gap between them is exactly what curation buys.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WCI_PRIORITY,
  escapeCssString,
  isCheckableElement,
  isFileInputElement,
  isInputElement,
  isSelectElement,
  isTextAreaElement,
  tagNameOf,
  type WciAction,
  type WciNodeSpec,
  type WciRole,
} from '@webcontextinterface/spec';

/** Elements that bound a task zone even without an explicit ARIA role. */
const LANDMARK_TAGS = new Set(['FORM', 'MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SECTION', 'DIALOG']);

const LANDMARK_ROLES = new Set([
  'form', 'main', 'navigation', 'banner', 'contentinfo',
  'complementary', 'region', 'dialog', 'search',
]);

const STATUS_ROLES = new Set(['status', 'alert', 'log', 'progressbar', 'alertdialog']);

/** Interactive elements an agent can act on. */
const INTERACTIVE_SELECTOR = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
  '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
  '[role="switch"]', '[role="tab"]', '[role="menuitem"]', '[contenteditable="true"]',
  '[onclick]',
].join(',');

/** Elements that carry information worth showing an agent. */
const DISPLAY_SELECTOR = [
  '[role="status"]', '[role="alert"]', '[aria-live]', 'output',
  '[data-testid]', 'h1', 'h2',
].join(',');

/** Words that mark a control as the primary action of its form. */
const PRIMARY_ACTION_WORDS = /\b(submit|save|continue|confirm|place|pay|checkout|book|order|send|apply|sign in|log in|register|create|next|finish|complete)\b/i;

/** Words that mark a control as secondary or destructive-but-not-primary. */
const SECONDARY_ACTION_WORDS = /\b(cancel|back|reset|clear|skip|dismiss|close|later)\b/i;

export interface InferOptions {
  /** Skip elements hidden from assistive technology (default true). */
  skipHidden?: boolean;
  /** Maximum characters of derived description (default 120). */
  maxDescLength?: number;
  /** Include low-value display nodes such as headings (default true). */
  includeDisplay?: boolean;
  /** Prefix for generated ids (default 'n'). */
  idPrefix?: string;
}

/** A derived node plus the evidence behind it. */
export interface InferredNode extends WciNodeSpec {
  /**
   * 0–1 estimate of how well-grounded the derivation is. An explicit ARIA
   * label on a native button scores high; a `<div onclick>` with no accessible
   * name scores low. Reported so downstream consumers can threshold rather
   * than trusting every inference equally.
   */
  confidence: number;
  /** Which signals produced the description, for auditing. */
  evidence: string[];
  /** CSS selector that resolves back to the source element. */
  selector: string;
}

export interface InferenceReport {
  nodes: InferredNode[];
  pageTitle: string;
  /** Elements examined but rejected as non-semantic. */
  skipped: number;
  /** Mean confidence across derived nodes. */
  meanConfidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessible name computation
// ─────────────────────────────────────────────────────────────────────────────

function textOf(el: Element | null | undefined, max: number): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Name a landmark from its heading or legend rather than its text content.
 *
 * `textContent` on a <form> returns every label, option, and paragraph inside
 * it. Truncated to a description that is worse than useless — it buries the
 * one thing that identifies the zone under the contents of the zone.
 */
function landmarkName(el: Element, max: number): { name: string; evidence: string[] } {
  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return { name: aria.slice(0, max), evidence: ['aria-label'] };

  const labelledBy = el.getAttribute('aria-labelledby');
  const doc = el.ownerDocument;
  if (labelledBy && doc) {
    const parts = labelledBy.split(/\s+/)
      .map(id => textOf(doc.getElementById(id), max))
      .filter(Boolean);
    if (parts.length) return { name: parts.join(' ').slice(0, max), evidence: ['aria-labelledby'] };
  }

  const heading = el.querySelector('legend, h1, h2, h3, [role="heading"]');
  const headingText = textOf(heading, max);
  if (headingText) return { name: headingText, evidence: ['heading'] };

  const title = el.getAttribute('title')?.trim();
  if (title) return { name: title.slice(0, max), evidence: ['title'] };

  return { name: '', evidence: [] };
}

/**
 * Approximate the accessible name, following the precedence order browsers use.
 *
 * This is not a full accname implementation — that requires layout and the full
 * ARIA graph. It covers the cases that actually carry meaning on form-driven
 * pages, which is where agent grounding happens.
 */
function accessibleName(el: Element, max: number): { name: string; evidence: string[] } {
  const evidence: string[] = [];
  const doc = el.ownerDocument;

  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return { name: ariaLabel.slice(0, max), evidence: ['aria-label'] };

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && doc) {
    const parts = labelledBy.split(/\s+/)
      .map(id => textOf(doc.getElementById(id), max))
      .filter(Boolean);
    if (parts.length) return { name: parts.join(' ').slice(0, max), evidence: ['aria-labelledby'] };
  }

  // A <label for="…"> or wrapping <label> is the strongest signal on a form.
  const id = el.getAttribute('id');
  if (id && doc) {
    // `CSS.escape` is absent in jsdom and older engines; the spec package's
    // escaper covers the same quoted-string context.
    const label = doc.querySelector(`label[for="${escapeCssString(id)}"]`);
    const labelText = textOf(label, max);
    if (labelText) return { name: labelText, evidence: ['label[for]'] };
  }
  const wrapping = el.closest('label');
  if (wrapping) {
    const clone = wrapping.cloneNode(true) as Element;
    clone.querySelectorAll('input,select,textarea').forEach(n => n.remove());
    const wrapText = textOf(clone, max);
    if (wrapText) return { name: wrapText, evidence: ['wrapping-label'] };
  }

  const own = textOf(el, max);
  if (own) return { name: own, evidence: ['text-content'] };

  for (const [attr, tag] of [
    ['placeholder', 'placeholder'], ['title', 'title'],
    ['alt', 'alt'], ['name', 'name-attr'], ['value', 'value-attr'],
  ] as const) {
    const v = el.getAttribute(attr)?.trim();
    if (v) return { name: v.slice(0, max), evidence: [tag] };
  }

  return { name: '', evidence: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

function inferRole(el: Element): WciRole | null {
  const tag = tagNameOf(el);
  const ariaRole = el.getAttribute('role')?.toLowerCase() ?? '';

  if (STATUS_ROLES.has(ariaRole) || el.hasAttribute('aria-live')) return 'status';
  if (LANDMARK_ROLES.has(ariaRole) || LANDMARK_TAGS.has(tag)) return 'landmark';

  if (isInputElement(el) || isSelectElement(el) || isTextAreaElement(el)) return 'form';
  if (['checkbox', 'radio', 'switch', 'textbox', 'combobox', 'listbox', 'slider'].includes(ariaRole)) {
    return 'form';
  }

  if (tag === 'A' && el.hasAttribute('href')) {
    const href = el.getAttribute('href') ?? '';
    // An in-page anchor triggers behaviour; a real URL changes the page.
    return href.startsWith('#') || href.startsWith('javascript:') ? 'action' : 'nav';
  }
  if (tag === 'BUTTON' || ariaRole === 'button' || el.hasAttribute('onclick')) return 'action';
  if (ariaRole === 'link') return 'nav';

  if (tag === 'OUTPUT' || el.hasAttribute('data-testid') || ['H1', 'H2'].includes(tag)) {
    return 'display';
  }
  return null;
}

function inferAction(el: Element, role: WciRole): WciAction | undefined {
  if (role === 'nav') return 'navigate';
  if (role === 'action') return 'click';

  if (role === 'form') {
    if (isFileInputElement(el)) return 'upload';
    if (isCheckableElement(el)) return 'check';
    if (isSelectElement(el)) return 'select';
    if (isTextAreaElement(el)) return 'fill';
    if (isInputElement(el)) {
      const type = el.type;
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'click';
      return 'fill';
    }
    const ariaRole = el.getAttribute('role')?.toLowerCase();
    if (ariaRole === 'checkbox' || ariaRole === 'radio' || ariaRole === 'switch') return 'check';
    if (el.getAttribute('contenteditable') === 'true') return 'fill';
  }
  return undefined;
}

function inferState(el: Element): Record<string, unknown> {
  const state: Record<string, unknown> = {};

  if (isInputElement(el)) {
    // Both guards narrow to HTMLInputElement, so an `else if` chain would make
    // the second branch unreachable in the type system; read `type` once.
    const inputType = el.type;
    if (inputType === 'checkbox' || inputType === 'radio') {
      state.checked = el.checked;
    } else if (inputType !== 'file' && inputType !== 'password') {
      state.value = el.value;
    }
  } else if (isTextAreaElement(el)) {
    state.value = el.value;
  } else if (isSelectElement(el)) {
    state.value = el.value;
  }

  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    state.disabled = true;
  }
  const checkedAria = el.getAttribute('aria-checked');
  if (checkedAria) state.checked = checkedAria === 'true';
  const expanded = el.getAttribute('aria-expanded');
  if (expanded) state.expanded = expanded === 'true';
  const selected = el.getAttribute('aria-selected');
  if (selected) state.selected = selected === 'true';

  if (el.getAttribute('role') === 'status' || el.hasAttribute('aria-live')) {
    const text = textOf(el, 80);
    if (text) state.text = text;
  }
  return state;
}

function inferOptions(el: Element): string[] | undefined {
  if (isSelectElement(el)) {
    const values = Array.from(el.options).map(o => o.value).filter(Boolean);
    return values.length ? values : undefined;
  }
  // Radio buttons form an implicit choice set keyed by their shared name.
  if (isInputElement(el) && el.type === 'radio' && el.name && el.ownerDocument) {
    const group = el.ownerDocument.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${escapeCssString(el.name)}"]`,
    );
    const values = Array.from(group).map(r => r.value).filter(Boolean);
    return values.length > 1 ? values : undefined;
  }
  return undefined;
}

/**
 * Rank a node's importance without an operator to say so.
 *
 * Priority drives what survives a token budget, so getting this roughly right
 * matters more than getting it exactly right: a submit button that ranks below
 * a footer link is the failure mode worth avoiding.
 */
function inferPriority(el: Element, role: WciRole, name: string): number {
  if (role === 'landmark') return 2;
  if (role === 'status') return 2;

  if (role === 'action') {
    if (isInputElement(el) && el.type === 'submit') return 1;
    if (tagNameOf(el) === 'BUTTON' && (el as HTMLButtonElement).type === 'submit') return 1;
    if (PRIMARY_ACTION_WORDS.test(name)) return 1;
    if (SECONDARY_ACTION_WORDS.test(name)) return 4;
    return 2;
  }

  if (role === 'form') {
    if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true') return 1;
    return 2;
  }

  if (role === 'nav') return 4;
  return 5;
}

/** How much to trust a derivation, given where its name came from. */
function scoreConfidence(el: Element, role: WciRole, evidence: string[]): number {
  let score = 0.5;

  if (evidence.includes('aria-label') || evidence.includes('aria-labelledby')) score += 0.3;
  else if (evidence.includes('label[for]') || evidence.includes('wrapping-label')) score += 0.3;
  else if (evidence.includes('text-content')) score += 0.2;
  else if (evidence.length === 0) score -= 0.3;

  // Native semantics beat a div wearing a role attribute.
  const tag = tagNameOf(el);
  if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'FORM'].includes(tag)) score += 0.15;
  else if (el.hasAttribute('role')) score += 0.05;
  else score -= 0.1;

  if (role === 'display') score -= 0.1;
  if (el.getAttribute('id')) score += 0.05;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

function slugify(text: string, max = 40): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

function cssPath(el: Element): string {
  const id = el.getAttribute('id');
  if (id) return `#${id}`;

  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && parts.length < 5 && tagNameOf(cur) !== 'BODY') {
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    const tag = tagNameOf(cur).toLowerCase();
    const idx = Array.from(parent.children).indexOf(cur) + 1;
    parts.unshift(`${tag}:nth-child(${idx})`);
    cur = parent;
  }
  return parts.join(' > ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

function isHiddenFromAgents(el: Element): boolean {
  if (isInputElement(el) && el.type === 'hidden') return true;

  // aria-hidden, [hidden], and display:none all apply to the whole subtree, so
  // a visible-looking button inside a hidden wrapper is still unreachable.
  // Checking only the element itself would surface controls no user can touch.
  let cur: Element | null = el;
  while (cur) {
    if (cur.getAttribute('aria-hidden') === 'true') return true;
    if (cur.hasAttribute('hidden')) return true;
    const style = cur.getAttribute('style') ?? '';
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return true;
    cur = cur.parentElement;
  }
  return false;
}

/**
 * Derive a WCI node set from a page that carries no `data-wci-*` markup.
 */
export function inferAnnotations(
  root: Document | Element,
  options: InferOptions = {},
): InferenceReport {
  const skipHidden = options.skipHidden ?? true;
  const maxDesc = options.maxDescLength ?? 120;
  const includeDisplay = options.includeDisplay ?? true;
  const prefix = options.idPrefix ?? 'n';

  const doc = 'body' in root ? (root as Document) : (root as Element).ownerDocument!;
  const scanRoot: ParentNode = 'body' in root ? ((root as Document).body ?? doc) : (root as Element);

  const selector = includeDisplay
    ? `${INTERACTIVE_SELECTOR},${DISPLAY_SELECTOR},form,main,nav,section,dialog,[role]`
    : `${INTERACTIVE_SELECTOR},form,main,nav,section,dialog`;

  const candidates = Array.from(scanRoot.querySelectorAll(selector));
  const nodes: InferredNode[] = [];
  const usedIds = new Set<string>();
  const landmarkFor = new Map<Element, string>();
  let skipped = 0;
  let counter = 0;

  // Landmarks first, so scope is resolvable when their children are processed.
  const ordered = [...candidates].sort((a, b) => {
    const aL = inferRole(a) === 'landmark' ? 0 : 1;
    const bL = inferRole(b) === 'landmark' ? 0 : 1;
    return aL - bL;
  });

  for (const el of ordered) {
    if (skipHidden && isHiddenFromAgents(el)) { skipped += 1; continue; }

    const role = inferRole(el);
    if (!role) { skipped += 1; continue; }
    if (role === 'display' && !includeDisplay) { skipped += 1; continue; }

    // A landmark exists to bound a task zone. One with nothing to do inside it
    // is layout, however well-labelled — and it would only cost the agent
    // tokens while adding a scope no node can usefully belong to.
    if (role === 'landmark' && el.querySelectorAll(INTERACTIVE_SELECTOR).length === 0) {
      skipped += 1;
      continue;
    }

    const { name, evidence } = role === 'landmark'
      ? landmarkName(el, maxDesc)
      : accessibleName(el, maxDesc);

    counter += 1;
    let id = el.getAttribute('id')?.trim() || slugify(name) || `${prefix}-${counter}`;
    if (usedIds.has(id)) id = `${id}-${counter}`;
    usedIds.add(id);

    if (role === 'landmark') landmarkFor.set(el, id);

    // Nearest enclosing landmark that was itself derived.
    let scope: string | undefined;
    let ancestor = el.parentElement;
    while (ancestor) {
      const found = landmarkFor.get(ancestor);
      if (found) { scope = found; break; }
      ancestor = ancestor.parentElement;
    }

    const action = inferAction(el, role);
    const options_ = inferOptions(el);
    const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

    nodes.push({
      id,
      role,
      desc: name || `${tagNameOf(el).toLowerCase()} element`,
      ...(action ? { action } : {}),
      state: inferState(el),
      ...(required ? { required: true } : {}),
      ...(options_ ? { options: options_ } : {}),
      ...(scope ? { scope } : {}),
      priority: inferPriority(el, role, name),
      confidence: scoreConfidence(el, role, evidence),
      evidence,
      selector: cssPath(el),
    });
  }

  nodes.sort((a, b) => (a.priority ?? DEFAULT_WCI_PRIORITY) - (b.priority ?? DEFAULT_WCI_PRIORITY));

  const meanConfidence = nodes.length
    ? Number((nodes.reduce((s, n) => s + n.confidence, 0) / nodes.length).toFixed(3))
    : 0;

  return {
    nodes,
    pageTitle: doc.title || '(untitled)',
    skipped,
    meanConfidence,
  };
}
