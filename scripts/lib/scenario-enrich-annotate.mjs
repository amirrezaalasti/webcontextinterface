/**
 * Rebuild annotated.html after raw enrichment.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  buildAnnotatedFromRaw,
  extractAnnotationSpecs,
  injectAnnotations,
} from './annotate-html.mjs';
import { LEGACY_ANNOTATION_SELECTORS } from './legacy-annotation-selectors.mjs';
import { injectLegacyStyles, LEGACY_STYLE_IDS } from './legacy-scenario-styles.mjs';
import { applyBenchmarkPriorityDiscipline } from './priority-competitors.mjs';

function slug(id) {
  return id.replace(/-/g, '_');
}

/**
 * @param {object} meta
 * @returns {import('./annotate-html.mjs').AnnotationPlan}
 */
export function planFromMeta(meta) {
  const primarySel = meta.groundTruth?.rawSelectors?.[0];
  if (!primarySel) throw new Error(`No rawSelectors in meta for ${meta.id}`);

  return {
    pageLandmark: {
      selector: `[data-page="${meta.id}"]`,
      wciId: `${slug(meta.id)}-page`,
      desc: `${meta.title} — ${meta.description ?? 'benchmark page'}`,
    },
    primary: {
      selector: primarySel,
      wciId: meta.groundTruth.wciNodeId,
      desc: meta.task?.goal ?? meta.description ?? '',
      action: 'click',
    },
    decoys: (meta.groundTruth.decoyNodeIds ?? []).map((id) => ({
      selector: `[data-wci-id="${id}"], #${id}, [data-decoy="${id}"]`,
      wciId: id,
      desc: `Decoy control — do not use for the task goal`,
      action: 'click',
    })),
  };
}

const LEGACY_SCENARIO_IDS = new Set([
  'flight-booking',
  'banking',
  'checkout',
  'social-feed',
  'admin-dashboard',
]);

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function completeScenarioAnnotations(doc, scenarioId, meta) {
  const usedIds = new Set();
  
  // Collect all existing manually/legacy annotated IDs
  doc.querySelectorAll('[data-wci-id]').forEach(el => {
    const id = el.getAttribute('data-wci-id');
    if (id) usedIds.add(id);
  });

  const getLandmarkId = (el) => {
    let p = el.parentElement;
    while (p && p !== doc.body) {
      const id = p.getAttribute('data-wci-id');
      const role = p.getAttribute('data-wci-role');
      if (id && (role === 'landmark' || role === 'nav')) {
        return id;
      }
      p = p.parentElement;
    }
    return null;
  };

  const makeUniqueId = (base) => {
    let clean = toSlug(base);
    if (!clean) clean = 'node';
    let cand = clean;
    let count = 2;
    while (usedIds.has(cand)) {
      cand = `${clean}-${count}`;
      count++;
    }
    usedIds.add(cand);
    return cand;
  };

  const findLabel = (el) => {
    if (el.id) {
      const label = doc.querySelector(`label[for="${el.id}"]`);
      if (label && label.textContent.trim()) {
        return label.textContent.trim();
      }
    }
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.textContent.trim()) {
      return parentLabel.textContent.trim();
    }
    let prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL' && prev.textContent.trim()) {
      return prev.textContent.trim();
    }
    if (el.parentElement) {
      const siblingLabel = el.parentElement.querySelector('label');
      if (siblingLabel && siblingLabel.textContent.trim()) {
        return siblingLabel.textContent.trim();
      }
    }
    return null;
  };

  // 1. Identify and annotate landmarks/navigation zones
  const landmarkSelectors = 'main, header, footer, nav, form, section, article, aside, dialog, [role="dialog"], [role="main"], [role="navigation"], [role="form"]';
  doc.querySelectorAll(landmarkSelectors).forEach(el => {
    if (el.tagName === 'BODY' || el.tagName === 'HTML') return;
    if (el.getAttribute('data-wci-id')) return;
    if (el.children.length === 0) return;

    let role = 'landmark';
    if (el.tagName === 'NAV' || el.getAttribute('role') === 'navigation' || el.className.includes('nav') || el.className.includes('menu')) {
      role = 'nav';
    }

    let baseId = el.id || el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const mainClass = el.className.split(' ')[0].replace(/__/g, '-').replace(/--/g, '-');
      if (mainClass) baseId = mainClass;
    }
    const wciId = makeUniqueId(baseId);

    let desc = `Landmark zone for ${el.tagName.toLowerCase()}`;
    const heading = el.querySelector('h1, h2, h3, h4');
    if (heading && heading.textContent.trim()) {
      desc = `${role === 'nav' ? 'Navigation' : 'Section'} for: ${heading.textContent.trim().replace(/\s+/g, ' ')}`;
    } else if (el.id) {
      desc = `Landmark zone: ${el.id}`;
    }

    el.setAttribute('data-wci-role', role);
    el.setAttribute('data-wci-id', wciId);
    el.setAttribute('data-wci-desc', desc);
    el.setAttribute('data-wci-priority', '3');
  });

  // 2. Traverse all elements in the body and annotate form, action, nav, display elements
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of allElements) {
    if (el.getAttribute('data-wci-id')) {
      if (!el.getAttribute('data-wci-scope') && el.getAttribute('data-wci-role') !== 'landmark' && el.getAttribute('data-wci-role') !== 'nav') {
        const scope = getLandmarkId(el);
        if (scope) el.setAttribute('data-wci-scope', scope);
      }
      continue;
    }

    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'path', 'iframe'].includes(tag)) {
      continue;
    }

    let role = null;
    let action = null;
    let desc = null;
    let state = null;
    let options = null;
    let priority = '3';

    // Form fields
    if (tag === 'input' && el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' && el.type !== 'image') {
      role = 'form';
      if (el.type === 'checkbox' || el.type === 'radio') {
        action = el.type === 'checkbox' ? 'check' : 'click';
        state = { checked: el.checked };
      } else {
        action = 'fill';
        state = { value: el.value || '' };
      }
      const labelText = findLabel(el);
      const name = el.getAttribute('name');
      const baseId = el.id || name || (labelText ? toSlug(labelText) : null) || `input-${el.type || 'text'}`;
      const wciId = makeUniqueId(baseId);
      desc = labelText ? `Field for: ${labelText.replace(/\s+/g, ' ')}` : el.placeholder ? `Input field for: ${el.placeholder}` : `Form input field`;
      
      el.setAttribute('data-wci-role', role);
      el.setAttribute('data-wci-id', wciId);
      el.setAttribute('data-wci-desc', desc);
      el.setAttribute('data-wci-action', action);
      el.setAttribute('data-wci-state', JSON.stringify(state));
      if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true') {
        el.setAttribute('data-wci-required', 'true');
      }
    } 
    // Select dropdowns
    else if (tag === 'select') {
      role = 'form';
      action = 'select';
      const labelText = findLabel(el);
      const name = el.getAttribute('name');
      const baseId = el.id || name || (labelText ? toSlug(labelText) : null) || 'select';
      const wciId = makeUniqueId(baseId);
      desc = labelText ? `Dropdown to select: ${labelText.replace(/\s+/g, ' ')}` : `Select dropdown options`;
      state = { selected: el.options[el.selectedIndex]?.text.trim() || '' };
      options = Array.from(el.options).map(o => o.text.trim());

      el.setAttribute('data-wci-role', role);
      el.setAttribute('data-wci-id', wciId);
      el.setAttribute('data-wci-desc', desc);
      el.setAttribute('data-wci-action', action);
      el.setAttribute('data-wci-state', JSON.stringify(state));
      el.setAttribute('data-wci-options', JSON.stringify(options));
    } 
    // Textareas
    else if (tag === 'textarea') {
      role = 'form';
      action = 'fill';
      const labelText = findLabel(el);
      const name = el.getAttribute('name');
      const baseId = el.id || name || (labelText ? toSlug(labelText) : null) || 'textarea';
      const wciId = makeUniqueId(baseId);
      desc = labelText ? `Text area for: ${labelText.replace(/\s+/g, ' ')}` : el.placeholder ? `Text area for: ${el.placeholder}` : `Text area input`;
      state = { value: el.value || '' };

      el.setAttribute('data-wci-role', role);
      el.setAttribute('data-wci-id', wciId);
      el.setAttribute('data-wci-desc', desc);
      el.setAttribute('data-wci-action', action);
      el.setAttribute('data-wci-state', JSON.stringify(state));
    } 
    // Action buttons
    else if (tag === 'button' || (tag === 'input' && (el.type === 'submit' || el.type === 'button')) || el.getAttribute('role') === 'button' || el.hasAttribute('onclick')) {
      role = 'action';
      action = 'click';
      const text = el.textContent.trim();
      const baseId = el.id || el.getAttribute('name') || (text ? toSlug(text) : null) || 'button';
      const wciId = makeUniqueId(baseId);
      desc = text ? `Click to: ${text.replace(/\s+/g, ' ')}` : el.getAttribute('aria-label') ? `Click to: ${el.getAttribute('aria-label')}` : `Action button`;

      el.setAttribute('data-wci-role', role);
      el.setAttribute('data-wci-id', wciId);
      el.setAttribute('data-wci-desc', desc);
      el.setAttribute('data-wci-action', action);
    } 
    // Navigation links
    else if (tag === 'a' && (el.getAttribute('href') || el.getAttribute('data-route'))) {
      const text = el.textContent.trim();
      if (el.closest('.hf-filler') || el.closest('.mg-filler') || el.closest('.sw-filler') || el.closest('.ip-filler') || el.closest('.cs-filler')) continue;
      if (el.className && typeof el.className === 'string' && el.className.includes('filler')) continue;
      const href = el.getAttribute('href') || el.getAttribute('data-route');
      if (href && href.includes('/misc/')) continue;

      role = 'nav';
      action = 'navigate';
      const baseId = el.id || (text ? toSlug(text) : null) || 'link';
      const wciId = makeUniqueId(baseId);
      desc = text ? `Navigate to: ${text.replace(/\s+/g, ' ')}` : `Navigation link to ${href}`;

      el.setAttribute('data-wci-role', role);
      el.setAttribute('data-wci-id', wciId);
      el.setAttribute('data-wci-desc', desc);
      el.setAttribute('data-wci-action', action);
      priority = '4';
    }
    // Data displays (KPIs, prices, status badges)
    else if (
      (el.className && typeof el.className === 'string' && /price|kpi|badge|status|error|alert|total|count/i.test(el.className)) ||
      el.hasAttribute('data-kpi') || el.hasAttribute('data-price') || el.hasAttribute('data-status') ||
      /^[$\u20AC\u00A3\u00A5]\s*\d+/.test(el.textContent.trim())
    ) {
      if (el.children.length === 0 && el.textContent.trim().length > 0 && el.textContent.trim().length < 150) {
        role = 'display';
        const text = el.textContent.trim();
        const baseId = el.id || (el.className ? toSlug(el.className.split(' ')[0]) : null) || 'display';
        const wciId = makeUniqueId(baseId);
        desc = `Display value: ${text.replace(/\s+/g, ' ')}`;
        state = { value: text };

        el.setAttribute('data-wci-role', role);
        el.setAttribute('data-wci-id', wciId);
        el.setAttribute('data-wci-desc', desc);
        el.setAttribute('data-wci-state', JSON.stringify(state));
        priority = '4';
      }
    }

    if (role) {
      el.setAttribute('data-wci-priority', priority);
      const scope = getLandmarkId(el);
      if (scope) el.setAttribute('data-wci-scope', scope);
    }
  }
}

/** @param {Document} doc */
function buildAdminDealsTableState(doc) {
  const rows = [...doc.querySelectorAll('#deals-table tbody tr[data-deal-id]')];
  const deals = rows.map((tr) => {
    const stage = tr.dataset.stage ?? '';
    const probabilityNum = Number(tr.dataset.probability ?? 0);
    return {
      id: tr.dataset.dealId,
      name: tr.querySelector('.qc-table__link')?.textContent?.trim() ?? '',
      probability: `${probabilityNum}%`,
      probabilityNum,
      stage,
      closed: stage === 'closed',
      owner: tr.dataset.owner ?? '',
    };
  });
  const openDeals = deals.filter((d) => !d.closed);
  const highestOpen =
    openDeals.length > 0
      ? openDeals.reduce((best, d) =>
          d.probabilityNum > best.probabilityNum ? d : best
        )
      : null;
  const misleadingClosed = deals.find((d) => d.closed && d.probabilityNum >= 70);
  return {
    deals,
    highestOpenProbabilityDeal: highestOpen
      ? {
          id: highestOpen.id,
          name: highestOpen.name,
          probability: highestOpen.probability,
        }
      : null,
    misleadingClosedDeal: misleadingClosed
      ? {
          id: misleadingClosed.id,
          name: misleadingClosed.name,
          probability: misleadingClosed.probability,
          note: 'Closed-won — ignore when finding highest open-pipeline probability',
        }
      : null,
    compareHint:
      'Use open pipeline rows only; Platform Renewal (70%, closed won) is a decoy for raw HTML comparison',
  };
}

/**
 * Task-aligned WCI overlay for QuantumCRM admin (legacy scenario).
 * @param {Document} doc
 * @param {object} meta
 */
/**
 * Task-aligned WCI overlay for NovaPay banking (legacy scenario).
 * @param {Document} doc
 * @param {object} meta
 */
/**
 * Task-aligned WCI overlay for QuickBite food-delivery.
 * @param {Document} doc
 * @param {object} meta
 */
function refineFoodDeliveryAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Add the Tokyo Bowl teriyaki item priced 12.99 to cart and proceed to checkout';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.querySelector('[data-wci-id="add-teriyaki-checkout-scope"]'), {
    'data-wci-desc':
      'Tokyo Bowl card · data-item teriyaki-1299 · $12.99 · restaurant tokyo-bowl (not sushi/ramen cards)',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('add-teriyaki-checkout'), {
    'data-wci-role': 'action',
    'data-wci-id': 'add-teriyaki-checkout',
    'data-wci-desc': `${goal} — primary Add to cart on this card (id add-teriyaki-checkout); “checkout” follows in cart drawer`,
    'data-wci-action': 'click',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({
      restaurant: 'tokyo-bowl',
      item: 'teriyaki-1299',
      price: '12.99',
      label: 'Add to cart',
    }),
  });

  for (const id of ['add-teriyaki-bowl-checkout', 'chicken-teriyaki-bowl-cart']) {
    set(doc.querySelector(`[data-wci-id="${id}"]`), {
      'data-wci-priority': '5',
      'data-wci-competitor': 'true',
      'data-wci-desc': `Decoy keyword trap (${id}) — not the Tokyo Bowl restaurant card button`,
    });
  }

  set(doc.getElementById('checkoutButton'), {
    'data-wci-role': 'action',
    'data-wci-id': 'checkoutbutton',
    'data-wci-desc':
      'Proceed to checkout in cart drawer — second step after Add to cart; disabled until Tokyo Bowl item added',
    'data-wci-action': 'click',
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
  });

  set(doc.getElementById('confirmCheckout'), {
    'data-wci-priority': '2',
    'data-wci-desc': 'Modal Confirm checkout — third step; not Add to cart on menu card',
  });
}

/**
 * Task-aligned WCI overlay for ShieldSure insurance-quote.
 * @param {Document} doc
 * @param {object} meta
 */
function refineInsuranceQuoteAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Request an auto liability quote for ZIP 94105';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.getElementById('get-auto-quote'), {
    'data-wci-role': 'action',
    'data-wci-id': 'get-auto-quote',
    'data-wci-desc': `${goal} — submit Get quote (liability, ZIP 94105); not full coverage or call-agent`,
    'data-wci-action': 'click',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({ zip: '94105', coverage: 'liability' }),
  });

  const covLiability = doc.querySelector('[data-wci-id="cov"]');
  if (covLiability) {
    covLiability.removeAttribute('data-wci-competitor');
    set(covLiability, {
      'data-wci-priority': '2',
      'data-wci-desc': 'Liability coverage radio — keep selected; final action is Get quote button',
    });
  }

  set(doc.querySelector('[data-wci-id="cov-2"]'), {
    'data-wci-priority': '2',
    'data-wci-competitor': 'true',
    'data-wci-desc': 'Full coverage radio — wrong tier for liability-only quote goal',
  });

  set(doc.getElementById('zip-only-trigger'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc': 'Check 94105 options — informational; not the liability Get quote submit',
  });

  set(doc.getElementById('call-agent'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc': 'Call me instead — phone agent path excluded by goal',
  });

  set(doc.getElementById('compare-plans'), {
    'data-wci-priority': '5',
    'data-wci-desc': 'Compare plans — distractor, not online liability quote submit',
  });
}

/**
 * Task-aligned WCI overlay for HireFlow job-board.
 * @param {Document} doc
 * @param {object} meta
 */
function refineJobBoardAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Submit an application only for the in-office senior role at employer reference ACM-447';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.querySelector('[data-wci-id="apply-senior-engineer-scope"]'), {
    'data-wci-desc':
      'Target card ACM-447 · Senior Engineer Seattle · in-office · React/TS (not NYC/remote duplicates)',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('apply-senior-engineer'), {
    'data-wci-role': 'action',
    'data-wci-id': 'apply-senior-engineer',
    'data-wci-desc': `${goal} — card CTA labeled Confirm on Seattle target card (id apply-senior-engineer)`,
    'data-wci-action': 'click',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({
      employerRef: 'ACM-447',
      location: 'Seattle',
      tier: 'senior-inoffice',
      workStyle: 'office',
      label: 'Confirm',
    }),
  });

  set(doc.querySelector('[data-wci-id="apply-3"]'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-decoy': 'apply-3',
    'data-wci-desc':
      'Apply on ACM-447 NYC duplicate card — same ref, wrong Seattle in-office posting',
  });

  set(doc.getElementById('applyFiltersBtn'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc': 'Apply filters — sidebar trap, not job card Confirm',
  });

  set(doc.getElementById('submitApplicationBtn'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc': 'Modal Submit application — only after opening drawer; not card Confirm',
  });

  set(doc.querySelector('[data-wci-id="apply-4"]'), {
    'data-wci-desc': 'Decoy — Apply on remote-only ACM-447 listing (exclude per goal)',
    'data-wci-priority': '5',
    'data-decoy': 'apply-4',
  });

  set(doc.querySelector('[data-wci-id="apply-2"]'), {
    'data-wci-desc': 'Decoy — Apply on ACM-447X keyword trap (remote, wrong ref)',
    'data-wci-priority': '5',
    'data-decoy': 'apply-2',
  });

  for (const id of ['apply-senior-engineer-acme', 'apply-to-acme-senior']) {
    set(doc.querySelector(`[data-wci-id="${id}"]`), {
      'data-wci-priority': '5',
      'data-wci-desc': `Decoy — header keyword trap (${id}), not Seattle card Confirm`,
    });
  }
}

/**
 * Task-aligned WCI overlay for ChatterBox social-feed (legacy scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refineSocialFeedAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Like the post by @alice_dev about AgentDOM';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.querySelector('[data-post-id="p_81924"]'), {
    'data-wci-id': 'post-p_81924',
    'data-wci-desc':
      'Post by @alice_dev (2h) — AgentDOM checkout thread; target for Like action',
    'data-wci-state': JSON.stringify({
      author: 'alice_dev',
      handle: '@alice_dev',
      postId: 'p_81924',
      topic: 'AgentDOM',
    }),
    'data-wci-priority': '2',
  });

  set(doc.querySelector('[data-wci-id="like-p_81924"]'), {
    'data-wci-role': 'action',
    'data-wci-id': 'like-p_81924',
    'data-wci-desc': `${goal} — heart/Like on @alice_dev post p_81924 (not Reply/Repost)`,
    'data-wci-action': 'click',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({ liked: false, count: 567, author: 'alice_dev' }),
  });

  set(doc.querySelector('[data-wci-id="reply-p_81924"]'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc':
      'Reply to @alice_dev post — plausible row action but wrong for like-only goal',
  });

  set(doc.querySelector('[data-wci-id="repost-p_81924"]'), {
    'data-wci-priority': '2',
  });

  const sponsoredLike = doc.querySelector(
    'article.cb-post--sponsored .cb-post__actions button[aria-label="Like"]'
  );
  set(sponsoredLike, {
    'data-wci-id': 'like-sponsored-ad',
    'data-wci-desc': 'Decoy — Like on promoted TechGear post, not @alice_dev',
    'data-wci-action': 'click',
    'data-wci-priority': '5',
  });

  set(doc.getElementById('dismiss-notifs'), {
    'data-wci-desc': 'Dismiss notification overlay — prerequisite before liking posts',
    'data-wci-priority': '2',
  });
}

function refineBankingAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Transfer $500 from Checking to Savings account';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.querySelector('#quick-transfer'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'quick-transfer',
    'data-wci-desc': 'Quick transfer form — move money between accounts on dashboard',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('xfer-from'), {
    'data-wci-id': 'transfer-from',
    'data-wci-desc': 'Source account — select Checking for this transfer',
    'data-wci-priority': '2',
  });
  set(doc.getElementById('xfer-to'), {
    'data-wci-id': 'transfer-to',
    'data-wci-desc': 'Destination account — select Savings for this transfer',
    'data-wci-priority': '2',
  });
  set(doc.getElementById('xfer-amount'), {
    'data-wci-id': 'transfer-amount',
    'data-wci-desc': 'Transfer amount in USD — enter 500 for this task',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('review-transfer-btn'), {
    'data-wci-role': 'action',
    'data-wci-id': 'review-transfer-btn',
    'data-wci-desc': `${goal} — review and confirm quick transfer (enabled when form valid)`,
    'data-wci-action': 'click',
    'data-wci-scope': 'quick-transfer',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({ disabled: false }),
  });

  for (const id of ['checking-account', 'savings-account', 'credit-card-account']) {
    set(doc.querySelector(`[data-wci-id="${id}"]`), { 'data-wci-priority': '2' });
  }

  set(doc.getElementById('pay-credit-bill-btn'), {
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
    'data-wci-desc':
      'Pay credit card bill — plausible banking CTA but wrong task (not checking→savings transfer)',
  });
}

function refineAdminDashboardAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Find the deal with the highest probability and export the dashboard';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  set(doc.querySelector('#qc-root'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'crm-dashboard',
    'data-wci-desc': `QuantumCRM admin dashboard — ${goal}`,
    'data-wci-priority': '2',
  });

  const dealsState = buildAdminDealsTableState(doc);
  set(doc.querySelector('#deals-table'), {
    'data-wci-role': 'display',
    'data-wci-id': 'deals-table',
    'data-wci-desc':
      'Structured deals table — read probability per row; highest open deal is SaaS Migration — Delta LLC at 80%',
    'data-wci-state': JSON.stringify(dealsState),
    'data-wci-scope': 'recent-deals',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('#recent-deals'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'recent-deals',
    'data-wci-desc':
      'Recent deals panel — filter/search rows, then compare open-pipeline probability before exporting',
    'data-wci-state': JSON.stringify({
      totalDeals: 156,
      showing: 8,
      page: 1,
      totalPages: 20,
    }),
    'data-wci-scope': 'crm-dashboard',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('#export-btn'), {
    'data-wci-role': 'action',
    'data-wci-id': 'export-btn',
    'data-wci-desc': `${goal} — primary control: top-bar Export (opens dashboard report modal)`,
    'data-wci-action': 'click',
    'data-wci-scope': 'crm-dashboard',
    'data-wci-priority': '1',
  });

  set(doc.querySelector('#export-csv-btn'), {
    'data-wci-role': 'action',
    'data-wci-id': 'export-csv-btn',
    'data-wci-desc':
      'Decoy — Pipeline submenu Export CSV (pipeline table only, not dashboard export)',
    'data-wci-action': 'click',
    'data-decoy': 'export-csv-btn',
    'data-wci-scope': 'crm-nav',
    'data-wci-priority': '5',
  });

  set(doc.querySelector('#new-contact-btn'), {
    'data-wci-priority': '4',
    'data-wci-desc': 'Create contact — unrelated to export task',
  });

  for (const id of ['notif-btn', 'refresh-dashboard']) {
    set(doc.querySelector(`#${id}`), {
      'data-wci-desc': 'Decoy top-bar control — do not use for the task goal',
      'data-wci-priority': '5',
    });
  }

  set(doc.querySelector('#shortcuts-overlay'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'shortcuts-overlay',
    'data-wci-desc': 'Blocking overlay — dismiss before interacting with dashboard (press ? opened)',
    'data-wci-priority': '3',
  });

  set(doc.querySelector('#shortcuts-close'), {
    'data-wci-role': 'action',
    'data-wci-id': 'shortcuts-close',
    'data-wci-desc': 'Dismiss keyboard shortcuts overlay',
    'data-wci-action': 'click',
    'data-wci-scope': 'shortcuts-overlay',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('#export-modal'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'export-modal',
    'data-wci-desc': 'Export modal — opens after top-bar Export; confirm download to finish',
    'data-wci-priority': '3',
  });

  set(doc.querySelector('#export-confirm'), {
    'data-wci-role': 'action',
    'data-wci-id': 'export-confirm',
    'data-wci-desc': 'Confirm dashboard export download (secondary step after export-btn)',
    'data-wci-action': 'click',
    'data-wci-scope': 'export-modal',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('#top-probability-row'), {
    'data-wci-role': 'display',
    'data-wci-id': 'top-probability-row',
    'data-wci-desc': 'Highest open-pipeline probability row — SaaS Migration — Delta LLC, 80%',
    'data-wci-state': JSON.stringify({
      dealId: 'd_004',
      name: 'SaaS Migration — Delta LLC',
      probability: '80%',
      stage: 'negotiation',
    }),
    'data-wci-scope': 'deals-table',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('tr[data-deal-id="d_006"]'), {
    'data-wci-role': 'display',
    'data-wci-id': 'deal-foxtrot-closed',
    'data-wci-desc':
      'Misleading row — Platform Renewal — Foxtrot Ltd shows 70% but stage is closed won (exclude from max probability)',
    'data-wci-state': JSON.stringify({
      dealId: 'd_006',
      probability: '70%',
      stage: 'closed',
      closed: true,
    }),
    'data-wci-scope': 'deals-table',
    'data-wci-priority': '5',
  });

  set(doc.querySelector('#highlight-top-deal'), {
    'data-wci-desc': 'Optional helper — highlights highest open probability row (not required)',
    'data-wci-priority': '4',
  });

  set(doc.querySelector('nav.qc-sidebar'), {
    'data-wci-desc':
      'CRM sidebar — decoy Export CSV lives under Pipeline submenu; stay on Dashboard for export-btn',
  });
}

/** @param {Document} doc */
function buildPhotoUploadAlbumState(doc) {
  const cards = [...doc.querySelectorAll('[data-select-album]')];
  const albums = cards.map((card) => {
    const id = card.getAttribute('data-select-album') ?? '';
    const name = card.querySelector('strong')?.textContent?.trim() ?? id;
    return {
      id,
      name,
      selected: card.classList.contains('is-selected'),
      target: id === 'iceland-2026',
      misleading: id === 'iceland-2024',
    };
  });
  const stagedCount = Number(
    doc.getElementById('files-count')?.textContent?.trim() ?? '0'
  );
  const thumbsOn = doc.getElementById('optimize-thumbs')?.checked ?? false;
  return {
    albums,
    selectedAlbumId: albums.find((a) => a.selected)?.id ?? null,
    targetAlbumId: 'iceland-2026',
    misleadingAlbumId: 'iceland-2024',
    stagedFileCount: stagedCount,
    thumbsEnabled: thumbsOn,
    uploadEnabled: !doc.getElementById('upload-iceland-album')?.disabled,
    hint: 'Confirm Iceland 2026 is selected (not Iceland 2024), stage photos, then click upload-iceland-album',
  };
}

/**
 * Task-aligned WCI overlay for CloudAlbum photo-upload (generated scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refinePhotoUploadAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Upload new photos into album Iceland 2026 (not other albums).';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  const pageState = buildPhotoUploadAlbumState(doc);

  set(doc.querySelector('[data-page="photo-upload"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'photo_upload-page',
    'data-wci-desc': `CloudAlbum upload center — ${goal}`,
    'data-wci-state': JSON.stringify(pageState),
    'data-wci-priority': '2',
  });

  set(doc.querySelector('#album-selector'), {
    'data-wci-role': 'display',
    'data-wci-id': 'album-selector',
    'data-wci-desc':
      'Album picker — only Iceland 2026 is the task target; Iceland 2024 has similar name',
    'data-wci-state': JSON.stringify({ albums: pageState.albums }),
    'data-wci-scope': 'photo_upload-page',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('[data-select-album="iceland-2026"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'album-iceland-2026',
    'data-wci-desc': 'Target album — Iceland 2026 (must stay selected before upload)',
    'data-wci-state': JSON.stringify({ albumId: 'iceland-2026', selected: true }),
    'data-wci-scope': 'album-selector',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('[data-select-album="iceland-2024"]'), {
    'data-wci-role': 'action',
    'data-wci-id': 'album-iceland-2024-decoy',
    'data-wci-action': 'click',
    'data-wci-desc':
      'Select Iceland 2024 album — similar name to Iceland 2026 but wrong target album',
    'data-wci-state': JSON.stringify({ albumId: 'iceland-2024', misleading: true }),
    'data-wci-scope': 'album-selector',
    'data-wci-priority': '1',
    'data-wci-competitor': 'true',
  });

  set(doc.querySelector('[data-select-album="family-summer-2025"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'album-family-summer-decoy',
    'data-wci-desc': 'Wrong album — Family Summer 2025 is not the task destination',
    'data-wci-priority': '5',
  });

  set(doc.querySelector('[data-album="iceland-2026"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'upload-iceland-album-scope',
    'data-wci-desc': 'Iceland 2026 upload panel — stage files here, then primary upload button',
    'data-wci-state': JSON.stringify({ album: 'iceland-2026' }),
    'data-wci-priority': '2',
  });

  const uploadBtn = doc.getElementById('upload-iceland-album');
  set(uploadBtn, {
    'data-wci-role': 'action',
    'data-wci-id': 'upload-iceland-album',
    'data-wci-desc': `${goal} — primary CTA inside [data-album="iceland-2026"] panel`,
    'data-wci-action': 'click',
    'data-wci-scope': 'upload-iceland-album-scope',
    'data-wci-priority': '1',
    'data-wci-primary': 'true',
    'data-wci-state': JSON.stringify({
      disabled: false,
      requiresAlbum: 'iceland-2026',
      requiresStagedFiles: false,
      stagedFileCount: 1,
      selector: '[data-album="iceland-2026"] .ca-btn--primary',
    }),
  });

  set(doc.getElementById('add-samples'), {
    'data-wci-desc': 'Stage 3 sample photos so upload button enables (optional helper)',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('optimize-thumbs'), {
    'data-wci-desc':
      'Generate high-quality thumbs — validation task checks thumb settings before upload',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('thumb-count-badge'), {
    'data-wci-desc': 'Staged file count — upload disabled until at least one photo is staged',
    'data-wci-priority': '3',
  });

  set(doc.getElementById('validation-msg'), {
    'data-wci-desc': 'Upload precondition — add staged photos to enable upload-iceland-album',
    'data-wci-priority': '3',
  });

  set(doc.getElementById('cookie-banner'), {
    'data-wci-desc': 'Cookie banner — dismiss (Accept all) before using upload center',
    'data-wci-priority': '3',
  });

  set(doc.getElementById('review-modal'), {
    'data-wci-desc': 'Review modal — optional preview; not required for primary upload task',
    'data-wci-priority': '4',
  });

  for (const sel of [
    '#upload-iceland-2026',
    '#upload-album-iceland-2026',
    '[data-decoy="decoy-promo"].ca-btn--decoy',
    '[data-decoy="decoy-nav"]',
    '#complete-order-now',
    '#view-deal',
    '#decoy-extra',
  ]) {
    doc.querySelectorAll(sel).forEach((el) => {
      if (el.id === 'upload-iceland-album') return;
      const isExtra = el.getAttribute('data-decoy') === 'decoy-extra' || el.id === 'decoy-extra';
      set(el, {
        'data-wci-desc': isExtra
          ? 'Decoy control — do not use for the task goal'
          : 'Decoy keyword trap or promo — not the Iceland 2026 panel upload button',
        'data-wci-priority': '5',
      });
      if (isExtra) el.setAttribute('data-decoy', 'decoy-extra');
    });
  }

  doc.querySelectorAll('.ca-dup-row .ca-btn--decoy').forEach((el) => {
    set(el, {
      'data-wci-desc':
        'Decoy duplicate row — keyword trap mimics goal text; use #upload-iceland-album in wizard panel',
      'data-wci-priority': '5',
    });
  });
}

/**
 * Task-aligned WCI overlay for CalSync calendar-app (generated scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refineCalendarAppAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Create a recurring weekday standup series at 09:00 (not a one-off grid cell event).';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  const seriesBadge = doc.getElementById('series-state-badge');
  const seriesCreated =
    seriesBadge?.classList.contains('cs-badge--ok') ||
    seriesBadge?.textContent?.trim() === 'Series created';

  set(doc.querySelector('[data-page="calendar-app"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'calendar_app-page',
    'data-wci-desc': `CalSync scheduling — ${goal}`,
    'data-wci-state': JSON.stringify({
      targetSeries: 'weekday-standup-09',
      startTime: '09:00',
      repeat: 'weekdays',
      seriesCreated,
      hint: 'Use Recurring series section — not grid + Add cells or one-off modal',
    }),
    'data-wci-priority': '2',
  });

  set(doc.querySelector('.cs-week'), {
    'data-wci-role': 'display',
    'data-wci-id': 'calendar-week-grid',
    'data-wci-desc':
      'Week grid — hover cells reveal + Add for one-off events only (wrong path for weekday standup series)',
    'data-wci-state': JSON.stringify({
      oneOffPath: 'grid-cell + Add opens oneoff-modal',
      notForTask: true,
    }),
    'data-wci-scope': 'calendar_app-page',
    'data-wci-priority': '4',
  });

  set(doc.getElementById('grid-feedback'), {
    'data-wci-desc':
      'Grid hint — one-off cell adds are decoys; use Recurring series for weekday 09:00 standup',
    'data-wci-priority': '3',
  });

  const recurringPanel = doc.getElementById('create-standup-series')?.closest('section.cs-panel');
  set(recurringPanel, {
    'data-wci-role': 'landmark',
    'data-wci-id': 'recurring-series-panel',
    'data-wci-desc': 'Recurring series panel — correct scope for weekday standup at 09:00',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('create-standup-series'), {
    'data-wci-role': 'action',
    'data-wci-id': 'create-standup-series',
    'data-wci-desc': `${goal} — primary CTA: button[data-series="weekday-standup-09"]`,
    'data-wci-action': 'click',
    'data-wci-scope': 'recurring-series-panel',
    'data-wci-priority': '1',
    'data-wci-state': JSON.stringify({
      series: 'weekday-standup-09',
      time: '09:00',
      recurring: true,
      selector: 'button[data-series="weekday-standup-09"]',
    }),
  });

  set(doc.getElementById('oneoff-confirm'), {
    'data-wci-role': 'action',
    'data-wci-id': 'oneoff-confirm-decoy',
    'data-wci-desc': 'Decoy — adds one-off grid event only, not recurring weekday series',
    'data-wci-priority': '5',
  });

  set(doc.getElementById('oneoff-modal'), {
    'data-wci-desc': 'One-off event modal — wrong flow for recurring weekday standup series',
    'data-wci-priority': '5',
  });

  set(doc.getElementById('event-modal'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'event-modal',
    'data-wci-desc': 'Series builder modal — optional; primary action is create-standup-series outside grid',
    'data-wci-priority': '3',
  });

  set(doc.getElementById('open-series-confirm'), {
    'data-wci-desc':
      'Alternate series confirm inside builder modal — ground truth is #create-standup-series in panel',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('open-builder-secondary'), {
    'data-wci-desc': 'Opens series builder preview — helper, not required for primary task',
    'data-wci-priority': '4',
  });

  set(doc.getElementById('save-draft-btn'), {
    'data-wci-desc': 'Save draft only — does not create the recurring series',
    'data-wci-priority': '4',
  });

  set(doc.getElementById('cookie-banner'), {
    'data-wci-desc': 'Cookie banner — dismiss before scheduling actions',
    'data-wci-priority': '3',
  });

  doc.querySelectorAll('.cs-dup-row .cs-btn--decoy').forEach((el) => {
    set(el, {
      'data-wci-desc':
        'Decoy keyword trap — mimics standup goal text; use #create-standup-series in Recurring series panel',
      'data-wci-priority': '5',
    });
  });

  doc.querySelectorAll('.cs-dup-row .cs-btn--ghost').forEach((el) => {
    if (el.textContent?.trim() === 'Confirm') {
      set(el, {
        'data-wci-desc': 'Decoy generic Confirm — not the weekday standup series action',
        'data-wci-priority': '5',
      });
    }
  });

  for (const sel of ['[data-decoy="decoy-promo"]', '[data-decoy="decoy-nav"]', '#decoy-extra']) {
    doc.querySelectorAll(sel).forEach((el) => {
      if (el.id === 'create-standup-series') return;
      const isExtra = el.getAttribute('data-decoy') === 'decoy-extra';
      set(el, {
        'data-wci-desc': isExtra
          ? 'Decoy control — do not use for the task goal'
          : 'Decoy promo/nav — not the recurring series control',
        'data-wci-priority': '5',
      });
      if (isExtra) el.setAttribute('data-decoy', 'decoy-extra');
    });
  }
}

/**
 * Task-aligned WCI overlay for EduGrant scholarship-apply (generated scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refineScholarshipApplyAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Submit STEM scholarship application form (not fee waiver).';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  const applicationType = doc.getElementById('type-waiver')?.checked
    ? 'fee-waiver'
    : 'stem-scholarship';
  const eligibilityConfirmed = doc.getElementById('eligibility-confirm')?.checked ?? false;

  set(doc.querySelector('[data-page="scholarship-apply"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'scholarship_apply-page',
    'data-wci-desc': `EduGrant application portal — ${goal}`,
    'data-wci-state': JSON.stringify({
      targetApplication: 'stem-scholarship',
      applicationType,
      eligibilityConfirmed,
      hint: 'Submit via button[data-app="stem"] — not Fee waiver button or fee-waiver application type',
    }),
    'data-wci-priority': '2',
  });

  set(doc.getElementById('stem-application-form'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'stem-application-form',
    'data-wci-desc': 'Multi-section STEM scholarship form — complete panels then submit',
    'data-wci-scope': 'scholarship_apply-page',
    'data-wci-priority': '2',
  });

  set(doc.querySelector('.eg-callout'), {
    'data-wci-role': 'display',
    'data-wci-id': 'scholarship-callout',
    'data-wci-desc':
      'Task constraint — STEM scholarship only; fee waiver is a separate flow and does not submit the application',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('type-scholarship'), {
    'data-wci-desc': 'Correct application type — STEM scholarship (keep selected)',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('type-waiver'), {
    'data-wci-role': 'form',
    'data-wci-id': 'type-waiver-decoy',
    'data-wci-desc':
      'Wrong application type — fee waiver request only does not submit STEM scholarship',
    'data-wci-priority': '5',
  });

  set(doc.getElementById('eligibility-confirm'), {
    'data-wci-desc':
      'Required — confirm STEM scholarship application (not fee-waiver-only request)',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('waiver-optin'), {
    'data-wci-desc':
      'Optional info about separate waiver programs — does not submit scholarship or replace primary action',
    'data-wci-priority': '4',
  });

  const submitSection = doc.getElementById('submit-stem-scholarship')?.closest('section');
  set(submitSection, {
    'data-wci-role': 'landmark',
    'data-wci-id': 'submit-section',
    'data-wci-desc': 'Review & submit panel — primary STEM scholarship submission lives here',
    'data-wci-priority': '2',
  });

  const submitBtn = doc.getElementById('submit-stem-scholarship');
  set(submitBtn, {
    'data-wci-role': 'action',
    'data-wci-id': 'submit-stem-scholarship',
    'data-wci-desc': `${goal} — primary CTA: button[data-app="stem"]`,
    'data-wci-action': 'click',
    'data-wci-scope': 'submit-section',
    'data-wci-priority': '1',
    'data-wci-state': JSON.stringify({
      app: 'stem',
      applicationType: 'stem-scholarship',
      disabled: submitBtn?.disabled ?? true,
      selector: 'button[data-app="stem"]',
    }),
  });

  doc.querySelectorAll('button[data-decoy="decoy-promo"]').forEach((el) => {
    if (el.id === 'submit-stem-scholarship') return;
    const isFeeWaiver = /fee waiver/i.test(el.textContent ?? '');
    set(el, {
      'data-wci-id': isFeeWaiver ? 'fee-waiver-decoy' : 'decoy-promo',
      'data-wci-desc': isFeeWaiver
        ? 'Decoy — Fee waiver button does not submit STEM scholarship application'
        : 'Decoy control — do not use for the task goal',
      'data-wci-priority': '5',
    });
  });

  doc.querySelectorAll('[data-decoy="decoy-nav"]').forEach((el) => {
    set(el, {
      'data-wci-desc': 'Decoy nav/promo — not the scholarship submit action',
      'data-wci-priority': '5',
    });
  });

  doc.querySelectorAll('.eg-dup-row .eg-btn--decoy').forEach((el) => {
    set(el, {
      'data-wci-desc':
        'Decoy keyword trap — duplicate row above form; use #submit-stem-scholarship in Review & submit panel',
      'data-wci-priority': '5',
    });
  });

  for (const id of ['submit', 'submit-2', 'submit-3']) {
    set(doc.querySelector(`[data-wci-id="${id}"]`), {
      'data-wci-desc': 'Decoy generic Submit — not button[data-app="stem"]',
      'data-wci-priority': '5',
    });
  }

  set(doc.getElementById('cookie-banner'), {
    'data-wci-desc': 'Cookie banner — dismiss before completing application',
    'data-wci-priority': '3',
  });

  for (const sel of ['#decoy-extra', '[data-decoy="decoy-extra"]']) {
    doc.querySelectorAll(sel).forEach((el) => {
      set(el, {
        'data-wci-desc': 'Decoy control — do not use for the task goal',
        'data-wci-priority': '5',
      });
      el.setAttribute('data-decoy', 'decoy-extra');
    });
  }
}

/**
 * Task-aligned WCI overlay for SignNow document-sign (generated scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refineDocumentSignAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Sign employment agreement on page twelve of the document viewer.';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  const nameFilled = Boolean(doc.getElementById('typedName')?.value?.trim());
  const consentChecked = doc.getElementById('consentCheck')?.checked ?? false;

  set(doc.querySelector('[data-page="document-sign"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'document_sign-page',
    'data-wci-desc': `SignNow document viewer — ${goal}`,
    'data-wci-state': JSON.stringify({
      targetPage: 12,
      document: 'Employment Agreement',
      recipient: 'Jordan Applicant',
      hint: 'Signer tools sidebar button[data-sign-page="12"] — not dup-row keyword traps or generic Confirm',
    }),
    'data-wci-priority': '2',
  });

  set(doc.getElementById('docViewer'), {
    'data-wci-role': 'display',
    'data-wci-id': 'document-viewer',
    'data-wci-desc':
      '12-page agreement viewer — Employee Signature block is on page 12 (currently focused)',
    'data-wci-state': JSON.stringify({ currentPage: 12, totalPages: 12, signaturePage: 12 }),
    'data-wci-scope': 'document_sign-page',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('signaturePage'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'signature-page-12',
    'data-wci-desc':
      'Page 12 Employee Signature — enter legal name and electronic consent before sidebar Confirm',
    'data-wci-state': JSON.stringify({
      pageNum: 12,
      requiresTypedName: true,
      requiresConsent: true,
      nameFilled,
      consentChecked,
    }),
    'data-wci-scope': 'document-viewer',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('typedName'), {
    'data-wci-desc': 'Typed signature — required before page 12 sign action succeeds',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('consentCheck'), {
    'data-wci-desc':
      'Electronic signature consent — must be checked before button[data-sign-page="12"] completes',
    'data-wci-priority': '2',
  });

  const signBtn = doc.getElementById('sign-agreement-p12');
  const signerTools = signBtn?.closest('.sn-sidebar-card');
  set(signerTools, {
    'data-wci-role': 'landmark',
    'data-wci-id': 'signer-tools-panel',
    'data-wci-desc':
      'Signer tools — primary Confirm applies only to page 12 via data-sign-page="12"',
    'data-wci-priority': '2',
  });

  set(signBtn, {
    'data-wci-role': 'action',
    'data-wci-id': 'sign-agreement-p12',
    'data-wci-desc': `${goal} — primary CTA: button[data-sign-page="12"] in Signer tools panel`,
    'data-wci-action': 'click',
    'data-wci-scope': 'signer-tools-panel',
    'data-wci-priority': '1',
    'data-wci-state': JSON.stringify({
      signPage: 12,
      requiresTypedName: true,
      requiresConsent: true,
      selector: 'button[data-sign-page="12"]',
    }),
  });

  set(doc.getElementById('focusP12'), {
    'data-wci-desc': 'Nav helper — scrolls viewer to page 12; primary action is Signer tools Confirm',
    'data-wci-priority': '3',
  });

  const initialBtn = signerTools?.querySelector('.sn-btn--ghost');
  set(initialBtn, {
    'data-wci-id': 'initial-page-decoy',
    'data-wci-desc':
      'Decoy — Initial tool only; task requires full page 12 signature via data-sign-page="12"',
    'data-wci-priority': '5',
  });

  set(doc.getElementById('cookieBanner'), {
    'data-wci-desc': 'Cookie banner — dismiss before document signing actions',
    'data-wci-priority': '3',
  });

  doc.querySelectorAll('.sn-dup-row .sn-btn--ghost').forEach((el) => {
    const label = el.textContent?.trim();
    if (label === 'Confirm' || label === 'Submit') {
      set(el, {
        'data-wci-desc': `Decoy generic ${label} — not the page 12 employment agreement signature`,
        'data-wci-priority': '5',
      });
    }
  });

  for (const sel of ['[data-decoy="decoy-promo"]', '[data-decoy="decoy-nav"]', '[data-decoy="decoy-extra"]']) {
    doc.querySelectorAll(sel).forEach((el) => {
      if (el.id === 'sign-agreement-p12') return;
      if (el.closest('.sn-dup-row') && el.classList.contains('sn-btn--decoy')) return;
      const isExtra = el.getAttribute('data-decoy') === 'decoy-extra';
      set(el, {
        'data-wci-desc': isExtra
          ? 'Decoy control — do not use for the task goal'
          : 'Decoy promo/nav — not the page 12 signature control',
        'data-wci-priority': '5',
      });
    });
  }

  doc.querySelectorAll('.sn-dup-row .sn-btn--decoy').forEach((el) => {
    set(el, {
      'data-wci-desc':
        'Decoy keyword trap — mimics page-12 sign goal; use Signer tools button[data-sign-page="12"]',
      'data-wci-priority': '5',
    });
  });
}

/**
 * Task-aligned WCI overlay for AuthGate password-reset (generated scenario).
 * @param {Document} doc
 * @param {object} meta
 */
function refinePasswordResetAnnotations(doc, meta) {
  const goal =
    meta.task?.goal ??
    meta.tasks?.singleShot?.goal ??
    'Send password reset link to user@corp.com (not disable account).';

  const set = (el, attrs) => {
    if (!el) return;
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  };

  const emailValue = doc.getElementById('user-email')?.value?.trim() ?? 'user@corp.com';

  set(doc.querySelector('[data-page="password-reset"]'), {
    'data-wci-role': 'landmark',
    'data-wci-id': 'password_reset-page',
    'data-wci-desc': `AuthGate admin console — ${goal}`,
    'data-wci-state': JSON.stringify({
      targetEmail: 'user@corp.com',
      action: 'send-reset-link',
      avoid: 'disable-account',
      hint: 'Primary button[data-action="send-reset"] — reject Disable account controls',
    }),
    'data-wci-priority': '2',
  });

  const resetPanel = doc.getElementById('reset-form')?.closest('section.ag-panel');
  set(resetPanel, {
    'data-wci-role': 'landmark',
    'data-wci-id': 'reset-action-panel',
    'data-wci-desc':
      'Password reset action panel — send reset link to directory user without disabling account',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('reset-form'), {
    'data-wci-id': 'reset-form',
    'data-wci-desc': 'Reset delivery form — recipient user@corp.com, channel email, identity verified',
    'data-wci-scope': 'reset-action-panel',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('user-email'), {
    'data-wci-desc': 'Target recipient — must be user@corp.com corporate directory account',
    'data-wci-state': JSON.stringify({ value: emailValue, expected: 'user@corp.com' }),
    'data-wci-priority': '2',
  });

  set(doc.getElementById('confirm-identity'), {
    'data-wci-desc': 'Identity verification — required before Send reset link is enabled',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('send-reset-link'), {
    'data-wci-role': 'action',
    'data-wci-id': 'send-reset-link',
    'data-wci-desc': `${goal} — primary CTA: button[data-action="send-reset"]`,
    'data-wci-action': 'click',
    'data-wci-scope': 'reset-form',
    'data-wci-priority': '1',
    'data-wci-state': JSON.stringify({
      recipient: 'user@corp.com',
      action: 'send-reset',
      notDisable: true,
      requiresIdentityCheck: true,
      selector: 'button[data-action="send-reset"]',
    }),
  });

  set(doc.getElementById('disable-decoy-inline'), {
    'data-wci-role': 'action',
    'data-wci-id': 'disable-decoy-inline',
    'data-wci-desc':
      'Decoy — Disable account interrupts sessions; task requires Send reset link only',
    'data-wci-action': 'click',
    'data-wci-priority': '5',
  });

  set(doc.querySelector('.ag-sidebar button[data-decoy="decoy-nav"]'), {
    'data-wci-role': 'action',
    'data-wci-id': 'disable-account-sidebar',
    'data-wci-desc':
      'Decoy — Danger zone Disable account; task is password reset for user@corp.com',
    'data-wci-priority': '5',
  });

  set(doc.querySelector('.ag-warning'), {
    'data-wci-desc':
      'Safety reminder — use password reset first; disabling account is wrong path for this task',
    'data-wci-priority': '2',
  });

  set(doc.getElementById('cookie-banner'), {
    'data-wci-desc': 'Cookie banner — dismiss before admin reset actions',
    'data-wci-priority': '3',
  });

  doc.querySelectorAll('.ag-dup-row .ag-btn--ghost').forEach((el) => {
    const label = el.textContent?.trim();
    if (label === 'Confirm' || label === 'Submit') {
      set(el, {
        'data-wci-desc': `Decoy generic ${label} — not the password reset link action`,
        'data-wci-priority': '5',
      });
    }
  });

  doc.querySelectorAll('.ag-card__actions .ag-btn--danger, .ag-row [data-decoy="decoy-nav"]').forEach((el) => {
    if (el.id === 'send-reset-link') return;
    set(el, {
      'data-wci-desc': 'Decoy account lockout control — task requires Send reset link only',
      'data-wci-priority': '5',
    });
  });

  for (const sel of ['[data-decoy="decoy-promo"]', '[data-decoy="decoy-nav"]', '[data-decoy="decoy-extra"]']) {
    doc.querySelectorAll(sel).forEach((el) => {
      if (el.id === 'send-reset-link') return;
      if (el.closest('.ag-dup-row') && el.classList.contains('ag-btn--decoy')) return;
      const isExtra = el.getAttribute('data-decoy') === 'decoy-extra';
      const isDisable =
        el.textContent?.trim()?.toLowerCase().includes('disable') ||
        el.textContent?.trim()?.toLowerCase().includes('suspend');
      set(el, {
        'data-wci-desc': isExtra
          ? 'Decoy control — do not use for the task goal'
          : isDisable
            ? 'Decoy — account disable/suspend; use Send reset link for user@corp.com'
            : 'Decoy promo/nav — not the password reset link control',
        'data-wci-priority': '5',
      });
    });
  }

  doc.querySelectorAll('.ag-dup-row .ag-btn--decoy').forEach((el) => {
    set(el, {
      'data-wci-desc':
        'Decoy keyword trap — mimics reset goal text; use button[data-action="send-reset"] in form',
      'data-wci-priority': '5',
    });
  });
}

/**
 * @param {string} scenarioId
 * @param {string} rawHtml
 * @param {object} meta
 * @param {string} previousAnnotated
 * @returns {string}
 */
export function rebuildAnnotated(scenarioId, rawHtml, meta, previousAnnotated) {
  let annotated;
  if (LEGACY_SCENARIO_IDS.has(scenarioId)) {
    const selectorByNodeId = LEGACY_ANNOTATION_SELECTORS[scenarioId] ?? {};
    const specs = extractAnnotationSpecs(previousAnnotated).filter((s) => selectorByNodeId[s.nodeId]);
    annotated = injectAnnotations(rawHtml, specs, selectorByNodeId, { scenarioId });
  } else {
    const plan = planFromMeta(meta);
    annotated = buildAnnotatedFromRaw(rawHtml, plan);
  }

  // Parse the annotated HTML back into a JSDOM document
  const dom = new JSDOM(annotated);
  const doc = dom.window.document;
  
  // Apply our complete auto-annotation logic
  completeScenarioAnnotations(doc, scenarioId, meta);

  if (scenarioId === 'admin-dashboard') {
    refineAdminDashboardAnnotations(doc, meta);
  }
  if (scenarioId === 'photo-upload') {
    refinePhotoUploadAnnotations(doc, meta);
  }
  if (scenarioId === 'calendar-app') {
    refineCalendarAppAnnotations(doc, meta);
  }
  if (scenarioId === 'scholarship-apply') {
    refineScholarshipApplyAnnotations(doc, meta);
  }
  if (scenarioId === 'document-sign') {
    refineDocumentSignAnnotations(doc, meta);
  }
  if (scenarioId === 'password-reset') {
    refinePasswordResetAnnotations(doc, meta);
  }
  if (scenarioId === 'banking') {
    refineBankingAnnotations(doc, meta);
  }
  if (scenarioId === 'social-feed') {
    refineSocialFeedAnnotations(doc, meta);
  }
  if (scenarioId === 'job-board') {
    refineJobBoardAnnotations(doc, meta);
  }
  if (scenarioId === 'food-delivery') {
    refineFoodDeliveryAnnotations(doc, meta);
  }
  if (scenarioId === 'insurance-quote') {
    refineInsuranceQuoteAnnotations(doc, meta);
  }

  applyBenchmarkPriorityDiscipline(doc, meta, scenarioId);

  return dom.serialize();
}

/**
 * @param {string} dir
 * @param {string} rawHtml
 * @param {string} annotatedHtml
 * @param {string} scenarioId
 */
export function writeScenarioHtml(dir, rawHtml, annotatedHtml, scenarioId) {
  let raw = rawHtml;
  let ann = annotatedHtml;
  if (LEGACY_STYLE_IDS.includes(scenarioId)) {
    raw = injectLegacyStyles(raw, scenarioId);
    ann = injectLegacyStyles(ann, scenarioId);
  }
  fs.writeFileSync(`${dir}/raw.html`, raw, 'utf8');
  fs.writeFileSync(`${dir}/annotated.html`, ann, 'utf8');
}

/** @param {string} html */
export function countDomNodes(html) {
  return new JSDOM(html).window.document.querySelectorAll('*').length;
}
