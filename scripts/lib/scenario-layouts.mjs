/**
 * Per-scenario raw HTML builders — distinct DOM archetypes per domain.
 * Hard raw HTML: large DOM, generic CTAs, structural selectors, keyword decoys.
 */
import { shell, slug } from './scenario-dom-noise.mjs';
import { REGISTERED_LAYOUTS } from './scenario-layouts-registers.mjs';

/**
 * @param {import('./annotate-html.mjs').AnnotationPlan} plan
 * @param {string[]} rawSelectors
 */
function pack(spec, rawHtml, plan, rawSelectors, description, challenges) {
  return { rawHtml, plan, rawSelectors, description, challenges };
}

/** @type {Record<string, (spec: object) => ReturnType<typeof pack>>} */
export const LAYOUT_BUILDERS = {
  'job-board'(spec) {
    const p = 'hf';
    const layoutExtra = `.${p}-layout{display:grid;grid-template-columns:220px 1fr;min-height:60vh}.${p}-filters{background:#f4f6f8;padding:12px;border-right:1px solid #ddd}.${p}-card{border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin:10px 0}.${p}-card__actions{display:flex;gap:8px;margin-top:8px}`;
    const main = `<div class="${p}-layout"><aside class="${p}-filters"><h2>Filters</h2><label><input type="checkbox" /> Remote only</label>
<label><input type="checkbox" checked /> In-office</label><select><option>Any location</option><option>SF Bay</option></select></aside>
<main role="main"><h1>Open roles</h1><ul>
<li class="${p}-card" data-employer-ref="ACM-102" data-remote="true"><h3>Junior QA — Beta LLC</h3>
<div class="${p}-card__actions"><button type="button" class="${p}-btn ${p}-btn--ghost">Quick Apply</button><button type="button" class="${p}-btn ${p}-btn--ghost">Save</button></div></li>
<li class="${p}-card" data-employer-ref="ACM-447" data-tier="senior-inoffice"><h3>Senior Engineer — Acme Corp</h3><p>React, TypeScript · ref ACM-447</p>
<div class="${p}-card__actions"><button type="button" class="${p}-btn ${p}-btn--ghost">Save</button><button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></li>
<li class="${p}-card" data-employer-ref="ACM-220"><h3>PM — Gamma Inc</h3><div class="${p}-card__actions"><button type="button" class="${p}-btn ${p}-btn--ghost">Save</button></div></li>
</ul></main></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      keywordTrapLabels: ['Apply Senior Engineer Acme', 'Apply to Acme Senior', 'Quick Apply Senior'],
    });
    const primarySel = '[data-employer-ref="ACM-447"] .hf-btn--primary';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: `${spec.title} — job listings with filters` },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Promotional CTA' },
        { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Nav decoy' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Keyword-rich apply decoy' },
      ],
    };
    return pack(spec, rawHtml, plan, [primarySel, '[data-employer-ref="ACM-447"] button.hf-btn--primary'],
      'Job board with filter sidebar, employer reference cards, and generic confirm CTAs.',
      ['Multiple Confirm/Apply buttons', 'Cookie banner and filler links', 'Keyword trap decoys matching employer names']);
  },

  'healthcare-portal'(spec) {
    const p = 'mg';
    const layoutExtra = `.${p}-patient{display:flex;gap:16px;padding:16px;background:#1e40af;color:#fff}.${p}-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px}.${p}-slot{border:1px solid #93c5fd;padding:12px;background:#fff}.${p}-slot__actions{margin-top:8px;display:flex;flex-direction:column;gap:4px}`;
    const main = `<div class="${p}-patient"><strong>Patient:</strong> Jordan Lee · MRN 88291 · Plan PPO Gold</div>
<section class="${p}-slots" role="main"><h1>Next week</h1>
<div class="${p}-slot" data-slot="tue-10-inperson"><span>Tue 10:00</span><div class="${p}-slot__actions"><button type="button" class="${p}-btn ${p}-btn--ghost">In-person</button></div></div>
<div class="${p}-slot" data-slot="tue-1430-video" data-mode="video"><span>Tue 14:30 · Video</span><div class="${p}-slot__actions"><button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></div>
<div class="${p}-slot" data-slot="wed-09"><span>Wed 09:00</span><div class="${p}-slot__actions"><button type="button" class="${p}-btn ${p}-btn--ghost">Call back</button></div></div>
<div class="${p}-slot"><span>Fri 11:00</span><div class="${p}-slot__actions"><button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Request callback</button></div></div>
</section>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      decoyPromo: false,
      keywordTrapLabels: ['Schedule video visit Tuesday', 'Schedule video visit Tue', 'Book Tuesday video'],
    });
    const primarySel = '[data-slot="tue-1430-video"][data-mode="video"] .mg-btn--primary';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'MediGate patient portal — appointment scheduling' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Request callback' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Video visit keyword trap' },
      ],
    };
    return pack(spec, rawHtml, plan, [primarySel, '[data-slot="tue-1430-video"] button.mg-btn--primary'],
      'Healthcare portal with patient banner and slot grid using data-slot attributes.',
      ['Generic Confirm on correct slot', 'In-person and callback decoys', 'Large cookie/filler chrome']);
  },

  'email-client'(spec) {
    const p = 'ip';
    const layoutExtra = `.${p}-frame{display:grid;grid-template-columns:260px 1fr 320px;min-height:70vh}.${p}-inbox{width:100%;border-collapse:collapse}.${p}-inbox tr.unread{font-weight:bold}.${p}-toolbar{display:flex;gap:6px;padding:8px;flex-wrap:wrap}.${p}-pane{border-left:1px solid #ccc;padding:16px}`;
    const main = `<div class="${p}-frame"><aside><ul><li>Inbox</li><li>Sent</li><li>Spam</li></ul></aside>
<div><table class="${p}-inbox" role="main"><thead><tr><th>From</th><th>Subject</th></tr></thead><tbody>
<tr data-thread="digest"><td>news@digest.com</td><td>Weekly roundup</td></tr>
<tr class="unread" data-thread="billing-acme" data-domain="acme.com"><td>billing@acme.com</td><td>Invoice #992</td></tr>
<tr data-thread="social"><td>noreply@social.io</td><td>3 mentions</td></tr>
</tbody></table>
<div class="${p}-toolbar" data-action-bar="thread-tools"><button type="button" class="${p}-btn ${p}-btn--ghost">Reply</button>
<button type="button" class="${p}-btn ${p}-btn--ghost">Forward</button><button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-promo">Upgrade storage</button></div></div>
<aside class="${p}-pane"><h2>Message</h2><p>Invoice attached…</p></aside></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      withAside: false,
      keywordTrapLabels: ['Archive billing thread', 'Archive billing@acme.com', 'Archive acme billing'],
    });
    const primarySel = '[data-action-bar="thread-tools"] .ip-btn--primary';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Inbox table with reading pane' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Upgrade storage' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Archive keyword trap' },
      ],
    };
    return pack(spec, rawHtml, plan, [primarySel, '[data-action-bar="thread-tools"] button.ip-btn--primary'],
      'Email client table layout with generic toolbar Confirm for archive action.',
      ['billing-acme row vs toolbar', 'Reply/Forward duplicates', 'Keyword archive decoys']);
  },

  'calendar-app'(spec) {
    const p = 'cs';
    const layoutExtra = `.${p}-week{display:grid;grid-template-columns:60px repeat(7,1fr);gap:1px;background:#e5e7eb}.${p}-cell{min-height:48px;background:#fff;border:1px solid #eee;font-size:11px}.${p}-modal.is-open{position:fixed;inset:20% 30%;background:#fff;border:2px solid #333;padding:20px;z-index:50}`;
    const main = `<main role="main" class="${p}-cal" style="padding:16px"><h1>Week of May 19</h1>
<div class="${p}-week"><div></div><div class="${p}-cell">Mon</div><div class="${p}-cell">Tue</div><div class="${p}-cell">Wed</div><div class="${p}-cell">Thu</div><div class="${p}-cell">Fri</div><div class="${p}-cell">Sat</div><div class="${p}-cell">Sun</div>
<div>9am</div><div class="${p}-cell"></div><div class="${p}-cell"><button type="button" class="${p}-btn ${p}-btn--ghost">+ Add</button></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div></div>
<button type="button" class="${p}-btn ${p}-btn--primary" data-series="weekday-standup-09">Confirm</button></main>
<div class="${p}-modal is-open" id="event-modal" role="dialog"><h2>New event</h2><input type="text" placeholder="Title" /><button type="button" class="${p}-btn ${p}-btn--ghost">Cancel</button></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      keywordTrapLabels: ['Create weekday 9am standup', 'Create standup series 9am'],
    });
    const primarySel = 'button[data-series="weekday-standup-09"]';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Calendar week grid with event modal' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      landmarks: [{ selector: '#event-modal', wciId: 'event-modal', desc: 'New event modal', priority: 3 }],
      decoys: [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Standup keyword trap' }],
    };
    return pack(spec, rawHtml, plan, [primarySel, 'button.cs-btn--primary[data-series="weekday-standup-09"]'],
      'Calendar grid with modal overlay and generic series confirm.',
      ['+ Add cells vs series confirm', 'Open modal', 'Keyword traps']);
  },

  'food-delivery'(spec) {
    const p = 'qb';
    const layoutExtra = `.${p}-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.${p}-resto{border-radius:12px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)}.${p}-cart{position:fixed;right:0;top:80px;width:260px;border-left:2px solid #f97316;padding:16px;background:#fff}`;
    const main = `<main class="${p}-grid" role="main">
<article class="${p}-resto"><h3>Sushi Zen</h3><button type="button" class="${p}-btn ${p}-btn--ghost">View menu</button></article>
<article class="${p}-resto" data-restaurant="tokyo-bowl" data-item="teriyaki-1299" data-price="12.99"><h3>Tokyo Bowl</h3><p>Teriyaki bowl · $12.99</p>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></article>
<article class="${p}-resto"><h3>Pizza Hub</h3><button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Free delivery</button></article>
</main><aside class="${p}-cart"><h2>Cart (0)</h2><button type="button" class="${p}-btn ${p}-btn--ghost">Clear</button></aside>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      keywordTrapLabels: ['Add Teriyaki Bowl checkout', 'Chicken Teriyaki Bowl cart'],
    });
    const primarySel = '[data-restaurant="tokyo-bowl"][data-item="teriyaki-1299"] .qb-btn--primary';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Restaurant grid with cart drawer' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Free delivery promo' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Teriyaki keyword trap' },
      ],
    };
    return pack(spec, rawHtml, plan, [primarySel, '[data-item="teriyaki-1299"] button.qb-btn--primary'],
      'Restaurant grid with data-item attributes and cart drawer.',
      ['Price/item attributes', 'Generic Confirm', 'Cart + cookie noise']);
  },

  'tax-filing'(spec) {
    const p = 'tx';
    const layoutExtra = `.${p}-wizard{max-width:720px;margin:24px auto}.${p}-steps{display:flex;gap:8px;margin-bottom:24px}.${p}-step{flex:1;padding:8px;background:#e5e7eb;text-align:center}.${p}-step.is-active{background:#3b82f6;color:#fff}.${p}-panel{border:1px solid #d1d5db;padding:20px}`;
    const main = `<div class="${p}-wizard" role="main"><nav class="${p}-steps" aria-label="Progress"><div class="${p}-step">Personal</div>
<div class="${p}-step is-active">Income</div><div class="${p}-step">Deductions</div><div class="${p}-step">Review</div></nav>
<section class="${p}-panel"><h1>Income — W-2</h1><p>Payroll import or manual.</p>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Enter manually</button>
<button type="button" class="${p}-btn ${p}-btn--primary" data-provider="ADP" data-form="W2">Confirm</button>
<input type="file" style="display:none" /></section></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      decoyPromo: false,
      keywordTrapLabels: ['Import W-2 from ADP', 'Import W-2 ADP payroll'],
    });
    const primarySel = 'button[data-provider="ADP"][data-form="W2"]';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Tax filing wizard — income step' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Manual entry' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'ADP import trap' },
      ],
      landmarks: [{ selector: `.${p}-steps`, wciId: 'tax-progress-steps', desc: 'Progress steps', priority: 3 }],
    };
    return pack(spec, rawHtml, plan, [primarySel, 'button.tx-btn--primary[data-provider="ADP"]'],
      'Multi-step tax wizard with provider data attributes.',
      ['Manual vs import', 'Progress bar', 'ADP keyword decoys']);
  },

  'streaming-service'(spec) {
    const p = 'sv';
    const layoutExtra = `.${p}-hero{height:160px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:24px}.${p}-row{display:flex;gap:12px;overflow-x:auto;padding:16px}.${p}-tile{min-width:140px;background:#1f2937;color:#fff;border-radius:6px;padding:12px}`;
    const main = `<div style="background:#0f0f0f;color:#eee"><div class="${p}-hero"><h1>Featured</h1><button type="button" class="${p}-btn ${p}-btn--ghost">Play trailer</button></div>
<section class="${p}-row" role="main"><h2 style="width:100%">Documentaries</h2>
<div class="${p}-tile"><span>Arctic Light</span><button type="button" class="${p}-btn ${p}-btn--ghost">Play</button></div>
<div class="${p}-tile" data-title-id="ocean-deep" data-runtime="52"><strong>Ocean Deep</strong><span> · 52m</span>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div>
<div class="${p}-tile"><span>City Skies</span><button type="button" class="${p}-btn ${p}-btn--ghost">Play</button></div></section></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      decoyPromo: false,
      keywordTrapLabels: ['Add Ocean Deep watchlist', 'Watchlist Ocean Deep documentary'],
    });
    const primarySel = '[data-title-id="ocean-deep"][data-runtime="52"] .sv-btn--primary';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Streaming catalog with hero and title row' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Watchlist trap' }],
    };
    return pack(spec, rawHtml, plan, [primarySel, '[data-title-id="ocean-deep"] button.sv-btn--primary'],
      'Streaming hero and documentary tiles with runtime metadata.',
      ['Play vs confirm', 'data-runtime filter', 'Dark theme + filler']);
  },

  'wiki-edit'(spec) {
    const p = 'ow';
    const layoutExtra = `.${p}-edit{display:grid;grid-template-columns:1fr 1fr;min-height:50vh}.${p}-toolbar{display:flex;gap:8px;padding:8px;background:#f3f4f6;border-bottom:1px solid #ccc}.${p}-editor{padding:16px}.${p}-diff{background:#fff8e1;padding:16px}`;
    const main = `<div class="${p}-toolbar" role="toolbar"><button type="button" class="${p}-btn ${p}-btn--ghost">Bold</button>
<button type="button" class="${p}-btn ${p}-btn--ghost">Link</button><button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Show history</button>
<button type="button" class="${p}-btn ${p}-btn--primary" data-article="web-context-interface" data-action="publish">Confirm</button></div>
<div class="${p}-edit"><textarea class="${p}-editor" role="main" rows="16">== Web Context Interface ==</textarea>
<div class="${p}-diff"><h3>Diff</h3><ins>+ distillation</ins></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, {
      layoutExtra,
      keywordTrapLabels: ['Publish WCI article', 'Publish Web Context Interface changes'],
    });
    const primarySel = 'button[data-article="web-context-interface"][data-action="publish"]';
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Wiki editor with toolbar and diff pane' },
      primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Show history' },
        { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Publish trap' },
      ],
    };
    return pack(spec, rawHtml, plan, [primarySel, 'button.ow-btn--primary[data-action="publish"]'],
      'Wiki split editor with article slug on publish confirm.',
      ['Toolbar noise', 'Diff column', 'Publish keyword traps']);
  },
};

Object.assign(LAYOUT_BUILDERS, REGISTERED_LAYOUTS);

/**
 * @param {object} spec — GENERATED_SPECS entry
 */
export function buildGeneratedLayout(spec) {
  const builder = LAYOUT_BUILDERS[spec.id];
  if (!builder) {
    throw new Error(`No layout builder for scenario: ${spec.id}`);
  }
  return builder(spec);
}
