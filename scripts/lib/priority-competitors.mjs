/**
 * Benchmark discipline for WCI priority — avoids "pick the only / first p=1" shortcuts.
 *
 * - Marks ground-truth primary: data-wci-primary="true", priority 1
 * - Adds 1–2 plausible priority-1 competitors: data-wci-competitor="true"
 * - Demotes mis-tagged p=1 (displays, helper forms, known decoys)
 */

const STOP = new Set(
  'the a an and or to for on in at of with from by is are be this that your you'.split(' ')
);

/** Per-scenario explicit competitors (wci id + short desc). */
export const SCENARIO_COMPETITORS = {
  banking: [
    {
      wciId: 'pay-credit-bill-btn',
      desc: 'Pay credit card bill — plausible banking action but not the $500 checking→savings transfer',
    },
    {
      wciId: 'transfer-2',
      desc: 'Transfer from checking account card — opens alternate flow, not quick-transfer review',
    },
    {
      wciId: 'transfer-3',
      desc: 'Transfer from savings account card — shortcut CTA, not Review Transfer on quick form',
    },
  ],
  'photo-upload': [
    {
      wciId: 'album-iceland-2024-decoy',
      desc: 'Select Iceland 2024 album — similar name to Iceland 2026 but wrong target album',
      action: 'click',
    },
    {
      wciId: 'add-samples',
      desc: 'Stage sample trip photos — enables upload but is not the final upload-to-album action',
    },
  ],
  checkout: [
    {
      wciId: 'apply-promo-btn',
      desc: 'Apply promo code — checkout step but not continue to payment',
    },
    {
      wciId: 'edit-cart-link',
      desc: 'Edit cart — related to order but not the payment continuation CTA',
    },
  ],
  'flight-booking': [
    {
      wciId: 'search-submit-btn',
      desc: 'Search flights — primary search action but not select economy fare SW1042',
    },
    {
      wciId: 'modify-search-btn',
      desc: 'Modify search — flight task distraction from fare selection',
    },
  ],
  'social-feed': [
    {
      wciId: 'reply-p_81924',
      desc: 'Reply to @alice_dev post — same row as Like but wrong action for “like post” goal',
    },
    {
      wciId: 'post-btn',
      desc: 'Publish new post — compose CTA, not like on @alice_dev AgentDOM post',
    },
    {
      wciId: 'load-more-btn',
      desc: 'Load more posts — scroll action, not the like target',
    },
  ],
  'calendar-app': [
    {
      wciId: 'open-series-confirm',
      desc: 'Alternate series confirm — similar scheduling CTA, not weekday standup series',
    },
    {
      wciId: 'create-standup-series-9am',
      desc: 'One-off 9am grid event — looks like standup time but not recurring series button',
    },
  ],
  'admin-dashboard': [
    {
      wciId: 'export-confirm',
      desc: 'Confirm export download in modal — follow-up step, not top-bar Export dashboard action',
    },
    {
      wciId: 'highlight-top-deal',
      desc: 'Highlight top probability deal — analysis helper, not dashboard export',
    },
  ],
  'food-delivery': [
    {
      wciId: 'add-teriyaki-bowl-checkout',
      desc: 'Keyword trap — dup-row label mimics goal; use Add to cart on Tokyo Bowl card id add-teriyaki-checkout',
    },
    {
      wciId: 'chicken-teriyaki-bowl-cart',
      desc: 'Keyword trap — “teriyaki bowl cart” wording; not the restaurant card CTA',
    },
    {
      wciId: 'checkoutbutton',
      desc: 'Cart drawer Proceed to checkout — enabled only after Add to cart on target item',
    },
  ],
  'insurance-quote': [
    {
      wciId: 'zip-only-trigger',
      desc: 'Check 94105 options — ZIP helper, not liability Get quote submit',
    },
    {
      wciId: 'call-agent',
      desc: 'Call me instead — phone agent flow excluded by goal',
    },
    {
      wciId: 'cov-2',
      desc: 'Full coverage radio — goal requires liability only, not full coverage',
    },
  ],
  'job-board': [
    {
      wciId: 'apply-3',
      desc: 'Apply on ACM-447 NYC card — same employer ref but wrong Seattle in-office target posting',
    },
    {
      wciId: 'applyfiltersbtn',
      desc: 'Apply filters sidebar — keyword trap, not Confirm on target job card',
    },
    {
      wciId: 'submitapplicationbtn',
      desc: 'Submit application in modal — second-step CTA after card Confirm, not primary card action',
    },
  ],
};

function goalTokens(meta) {
  const text = [
    meta.task?.goal ?? '',
    meta.tasks?.singleShot?.goal ?? '',
    meta.description ?? '',
  ]
    .join(' ')
    .toLowerCase();
  const out = new Set();
  for (const m of text.match(/[a-z][a-z0-9_-]{2,}/g) ?? []) {
    if (!STOP.has(m)) out.add(m);
  }
  return out;
}

/**
 * @param {Document} doc
 * @param {string} primaryId
 */
function demoteMisassignedPriorityOne(doc, primaryId) {
  doc.querySelectorAll('[data-wci-priority="1"]').forEach((el) => {
    const id = el.getAttribute('data-wci-id');
    if (!id || id === primaryId) return;
    if (el.getAttribute('data-wci-competitor') === 'true') return;

    const role = el.getAttribute('data-wci-role');
    if (role === 'display' || role === 'landmark' || role === 'status' || role === 'nav') {
      el.setAttribute('data-wci-priority', '2');
      return;
    }

    if (role === 'form') {
      el.setAttribute('data-wci-priority', '2');
    }
  });
}

/**
 * @param {Document} doc
 * @param {object} meta
 */
function demoteKnownDecoys(doc, meta) {
  for (const id of meta.groundTruth?.decoyNodeIds ?? []) {
    const el = doc.querySelector(`[data-wci-id="${id}"], #${id}, [data-decoy="${id}"]`);
    if (el) el.setAttribute('data-wci-priority', '5');
  }
}

/**
 * @param {Document} doc
 * @param {object} meta
 * @returns {number}
 */
function promoteHeuristicCompetitors(doc, meta) {
  const primaryId = meta.groundTruth?.wciNodeId;
  if (!primaryId) return 0;
  const tokens = goalTokens(meta);
  const decoys = new Set(meta.groundTruth?.decoyNodeIds ?? []);
  const candidates = [];

  doc.querySelectorAll('[data-wci-id][data-wci-action]').forEach((el) => {
    const id = el.getAttribute('data-wci-id');
    if (!id || id === primaryId || decoys.has(id)) return;
    if (el.getAttribute('data-wci-primary') === 'true') return;
    const role = el.getAttribute('data-wci-role');
    if (role !== 'action' && role !== 'form' && role !== 'nav') return;

    const p = parseInt(el.getAttribute('data-wci-priority') ?? '3', 10);
    if (p >= 5) return;

    const blob = `${id} ${el.getAttribute('data-wci-desc') ?? ''} ${el.textContent ?? ''}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (blob.includes(t)) score += 1;
    }
    if (score < 2) return;
    candidates.push({ el, id, score, p });
  });

  candidates.sort((a, b) => b.score - a.score || a.p - b.p);
  let added = 0;
  const goal = (meta.task?.goal ?? meta.tasks?.singleShot?.goal ?? '').toLowerCase();

  for (const { el, id } of candidates) {
    if (added >= 2) break;
    if (el.getAttribute('data-wci-competitor') === 'true') continue;
    if (/\blike\b/.test(goal) && /^(reply|repost)-/.test(id)) continue;
    if (/\bapplication\b/.test(goal) && /applyfilters|apply-filter/i.test(id)) continue;
    if (/\bacm-447\b/i.test(goal) && /^apply-\d+$/.test(id) && id !== primaryId) continue;
    if (/\bcheckout\b/i.test(goal) && /teriyaki-bowl-checkout|teriyaki-bowl-cart/i.test(id)) continue;
    if (/\bliability\b/i.test(goal) && (id === 'cov-2' || id === 'call-agent')) continue;
    if (id === primaryId) continue;
    el.setAttribute('data-wci-priority', '1');
    el.setAttribute('data-wci-competitor', 'true');
    if (!el.getAttribute('data-wci-desc')?.includes('competitor')) {
      const prev = el.getAttribute('data-wci-desc') ?? id;
      el.setAttribute(
        'data-wci-desc',
        `${prev} — plausible alternative (not primary for this goal)`.slice(0, 120)
      );
    }
    added++;
  }
  return added;
}

/**
 * @param {Document} doc
 * @param {object} meta
 * @param {string} scenarioId
 */
export function applyBenchmarkPriorityDiscipline(doc, meta, scenarioId) {
  const primaryId = meta.groundTruth?.wciNodeId;
  if (!primaryId) return;

  const primaryEl =
    doc.querySelector(`[data-wci-id="${primaryId}"]`) ?? doc.getElementById(primaryId);
  if (primaryEl) {
    primaryEl.setAttribute('data-wci-priority', '1');
    primaryEl.setAttribute('data-wci-primary', 'true');
    primaryEl.removeAttribute('data-wci-competitor');
  }

  demoteMisassignedPriorityOne(doc, primaryId);
  demoteKnownDecoys(doc, meta);

  const explicit = SCENARIO_COMPETITORS[scenarioId] ?? [];
  for (const spec of explicit) {
    const el =
      doc.querySelector(`[data-wci-id="${spec.wciId}"]`) ?? doc.getElementById(spec.wciId);
    if (!el) continue;
    el.setAttribute('data-wci-priority', '1');
    el.setAttribute('data-wci-competitor', 'true');
    el.removeAttribute('data-wci-primary');
    if (spec.desc) el.setAttribute('data-wci-desc', spec.desc.slice(0, 120));
    if (spec.action) el.setAttribute('data-wci-action', spec.action);
    if (spec.role) el.setAttribute('data-wci-role', spec.role);
  }

  promoteHeuristicCompetitors(doc, meta);
}
