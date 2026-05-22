/**
 * Hardened layout builders (register batch) — imported into scenario-layouts.mjs
 */
import { shell, slug } from './scenario-dom-noise.mjs';

function pack(spec, rawHtml, plan, rawSelectors, description, challenges) {
  return { rawHtml, plan, rawSelectors, description, challenges };
}

function decoys3(p) {
  return [
    { selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Promo CTA' },
    { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Nav decoy' },
    { selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Keyword trap' },
  ];
}

function pagePlan(spec, primarySel, desc, decoys = []) {
  return {
    pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc },
    primary: { selector: primarySel, wciId: spec.wciId, desc: spec.goal, action: 'click' },
    decoys,
  };
}

/** @type {Record<string, (spec: object) => ReturnType<typeof pack>>} */
export const REGISTERED_LAYOUTS = {
  'insurance-quote'(spec) {
    const p = 'ss';
    const main = `<main class="${p}-cols" role="main" style="display:flex;gap:24px;padding:16px"><form class="${p}-form" style="flex:2"><h1>Auto quote</h1>
<label>ZIP <input name="zip" value="94105" readonly /></label><fieldset><legend>Coverage</legend>
<label><input type="radio" name="cov" value="liability" checked /> Liability</label><label><input type="radio" name="cov" value="full" /> Full</label></fieldset>
<button type="submit" class="${p}-btn ${p}-btn--primary" data-quote-zip="94105" data-cov="liability">Confirm</button></form>
<aside style="flex:1"><button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Call agent</button></aside></main>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Get quote for 94105', 'Get auto quote ZIP 94105'] });
    const sel = 'form button[data-quote-zip="94105"][data-cov="liability"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Quote form', decoys3(p).slice(0, 2)), [sel, 'button[data-quote-zip="94105"]'], 'Two-column quote form.', ['Liability vs full', 'Keyword quote traps']);
  },

  'real-estate'(spec) {
    const p = 'hn';
    const main = `<div style="display:grid;grid-template-columns:1fr 360px"><div style="height:200px;background:#cbd5e1" role="img" aria-label="Map"></div>
<section role="main" style="padding:16px;display:flex;flex-wrap:wrap;gap:10px">
<article style="border:1px solid #ddd;padding:10px;width:45%" data-listing="oak-2br"><h3>2BR · Oak St</h3><button type="button" class="${p}-btn ${p}-btn--ghost">Tour</button></article>
<article style="border:1px solid #ddd;padding:10px;width:45%" data-listing="evergreen-742" data-beds="3"><h3>3BR · 742 Evergreen Terrace</h3>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></article></section></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Save listing 742', 'Save 742 Evergreen'] });
    const sel = '[data-listing="evergreen-742"] .hn-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Listings + map', decoys3(p)), [sel], 'Map + listing cards.', ['Tour vs Confirm']);
  },

  'lms-course'(spec) {
    const p = 'lp';
    const main = `<div style="display:grid;grid-template-columns:2fr 1fr"><div style="background:#000;height:240px;color:#fff;padding:16px" role="main">Module 4 playback</div>
<ul style="list-style:none;padding:12px"><li>Module 3 ✓</li><li data-module="4" data-status="in-progress">Module 4
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></li></ul></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Mark complete Module 4', 'Complete module four'] });
    const sel = '[data-module="4"] .lp-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'LMS modules', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Video + module list.', ['Module 3 done']);
  },

  'support-ticket'(spec) {
    const p = 'hd';
    const main = `<form style="max-width:560px;margin:24px auto" role="main"><h1>New ticket</h1><input type="text" value="Login outage" />
<div><label><input type="radio" name="prio" value="low" /> Low</label><label><input type="radio" name="prio" value="high" checked /> High</label></div>
<textarea rows="4">Outage since 09:00 UTC</textarea>
<button type="submit" class="${p}-btn ${p}-btn--primary" data-prio="high" data-topic="login-outage">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Save draft</button></form>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Submit priority ticket', 'Submit priority login'] });
    const sel = 'button[data-prio="high"][data-topic="login-outage"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Ticket form', decoys3(p).slice(1)), [sel], 'Priority ticket form.', ['Draft vs confirm']);
  },

  'ecommerce-search'(spec) {
    const p = 'sg';
    const main = `<div role="search" style="display:flex;gap:16px;padding:12px;background:#fafafa"><label>Stars <select id="rating-filter"><option>Any</option><option value="4">4+</option></select></label>
<label>Max <input type="number" id="max-price" value="50" /></label>
<button type="button" class="${p}-btn ${p}-btn--primary" data-filter="rating-price">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Flash sale</button></div>
<table role="main" style="width:100%;border-collapse:collapse"><tr><td>Widget $12</td><td>Gadget $45 ★★★★</td></tr></table>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Apply filters 4 star', 'Apply rating price filter'] });
    const sel = 'button[data-filter="rating-price"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Search filters', decoys3(p).slice(0, 2)), [sel], 'Filter bar + grid.', ['Flash sale']);
  },

  'hotel-booking'(spec) {
    const p = 'sf';
    const main = `<ul role="main" style="list-style:none;padding:16px">
<li style="display:flex;border:1px solid #ddd;padding:16px;margin:8px 0" data-hotel="airport-inn"><div style="flex:1"><h2>Airport Inn</h2></div><button type="button" class="${p}-btn ${p}-btn--ghost">Select</button></li>
<li style="display:flex;border:1px solid #ddd;padding:16px;margin:8px 0" data-hotel="marriott-downtown" data-nights="2"><div style="flex:1"><h2>Marriott Downtown</h2><p>2 nights</p></div>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></li></ul>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Book Marriott downtown', 'Book 2 nights Marriott'] });
    const sel = '[data-hotel="marriott-downtown"] .sf-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Hotel results', decoys3(p)), [sel], 'Hotel list.', ['Select vs Confirm']);
  },

  'weather-app'(spec) {
    const p = 'sk';
    const main = `<div role="main" style="text-align:center;padding:40px"><h1>San Francisco</h1><div style="font-size:64px">62°</div>
<div style="margin-top:24px" data-city="SF" data-alert="rain"><span>Precipitation alerts</span>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Enable rain alerts San Francisco', 'Enable SF rain alerts'] });
    const sel = '[data-city="SF"][data-alert="rain"] .sk-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Weather dash', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Weather dashboard.', ['Alert traps']);
  },

  'parking-reservation'(spec) {
    const p = 'pk';
    const spots = ['A1', 'A2', 'B11', 'B12', 'B13', 'B14', 'C01', 'C02'];
    const grid = spots
      .map(
        (s) =>
          `<button type="button" class="${p}-btn ${s === 'B12' ? `${p}-btn--primary` : `${p}-btn--ghost`} ${s === 'B12' ? 'open' : 'taken'}" ${s === 'B12' ? 'data-spot="B12" data-open="true"' : 'disabled'}>${s}</button>`
      )
      .join('');
    const main = `<main role="main" style="padding:16px"><h1>Garage B · Saturday 14:00</h1><div style="display:grid;grid-template-columns:repeat(6,48px);gap:4px">${grid}</div>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Monthly pass</button></main>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Reserve spot B12', 'Reserve garage B12 Saturday'] });
    const sel = 'button[data-spot="B12"][data-open="true"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Parking grid', decoys3(p).slice(0, 2)), [sel, 'button.pk-btn--primary.open'], 'Spot grid.', ['Taken spots']);
  },

  'gym-membership'(spec) {
    const p = 'fc';
    const main = `<div role="main" style="display:flex;gap:20px;justify-content:center;padding:32px">
<div style="border:2px solid #ddd;padding:24px"><h3>Monthly</h3><button type="button" class="${p}-btn ${p}-btn--ghost">Current</button></div>
<div style="border:2px solid #7c3aed;padding:24px" data-plan="annual"><h3>Annual</h3><button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Upgrade to annual', 'Upgrade annual plan'] });
    const sel = '[data-plan="annual"] .fc-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Plans', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Pricing cards.', ['Current plan']);
  },

  'pharmacy-order'(spec) {
    const p = 'rx';
    const main = `<table role="main" style="width:100%;border-collapse:collapse"><thead><tr><th>Drug</th><th>Dose</th><th></th></tr></thead><tbody>
<tr><td>Metformin</td><td>500mg</td><td><button type="button" class="${p}-btn ${p}-btn--ghost">View</button></td></tr>
<tr data-rx="lisinopril-10"><td>Lisinopril</td><td>10mg</td><td><button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></td></tr>
</tbody></table>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Refill Lisinopril', 'Refill Lisinopril 10mg'] });
    const sel = 'tr[data-rx="lisinopril-10"] .rx-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Rx table', decoys3(p).slice(1)), [sel], 'Prescription table.', ['View vs confirm']);
  },

  'ride-share'(spec) {
    const p = 'gr';
    const main = `<div style="display:grid;grid-template-rows:auto 1fr auto;min-height:50vh"><div style="background:#d4d4d8;min-height:200px">Map</div>
<div role="main" style="padding:16px"><input type="text" value="SFO Terminal 2" readonly data-dest="SFO-T2" />
<button type="button" class="${p}-btn ${p}-btn--primary" data-dest="SFO-T2">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">50% off first ride</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Request ride SFO', 'Request ride SFO Terminal 2'] });
    const sel = 'button[data-dest="SFO-T2"].gr-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Ride app', decoys3(p).slice(0, 2)), [sel], 'Map + dest bar.', ['Promo ride']);
  },

  'voting-poll'(spec) {
    const p = 'vh';
    const main = `<form role="main" style="max-width:480px;margin:32px auto;border:2px solid #1e3a8a;padding:24px" data-measure="12">
<h1>Measure 12</h1><label style="display:block;margin:12px 0"><input type="radio" name="m12" value="no" /> No</label>
<label style="display:block;margin:12px 0"><input type="radio" name="m12" value="yes" checked data-vote="yes" /> Yes</label>
<button type="submit" class="${p}-btn ${p}-btn--primary" data-measure-submit="12">Confirm</button></form>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Cast vote Proposition 12', 'Vote yes Proposition 12'] });
    const sel = 'button[data-measure-submit="12"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Ballot', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Ballot form.', ['Yes radio vs confirm']);
  },

  'code-review'(spec) {
    const p = 'ml';
    const main = `<div style="display:grid;grid-template-columns:240px 1fr"><aside style="background:#f6f8fa;padding:8px"><ul><li>api.ts</li></ul></aside>
<main role="main" style="padding:16px" data-pr="4182"><h1>PR 4182</h1><pre>+ waitFor()</pre>
<button type="button" class="${p}-btn ${p}-btn--primary" data-pr-action="approve">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--ghost">Request changes</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Try Pro</button></main></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Approve PR 4182', 'Approve pull request 4182'] });
    const sel = '[data-pr="4182"] button[data-pr-action="approve"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'PR review', decoys3(p).slice(0, 2)), [sel], 'PR diff.', ['Request changes']);
  },

  'inventory-mgmt'(spec) {
    const p = 'sp';
    const main = `<table role="main" style="width:100%;border-collapse:collapse"><thead><tr><th>SKU</th><th>Qty</th><th></th></tr></thead><tbody>
<tr><td>WH-4400</td><td>120</td><td><button type="button" class="${p}-btn ${p}-btn--ghost">Adjust</button></td></tr>
<tr data-sku="WH-9921"><td>WH-9921</td><td>12</td><td><button type="button" class="${p}-btn ${p}-btn--primary" data-qty="500">Confirm</button></td></tr>
</tbody></table>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Reorder WH-9921', 'Reorder 500 WH-9921'] });
    const sel = 'tr[data-sku="WH-9921"] .sp-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Inventory', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'SKU table.', ['Adjust row']);
  },

  'subscription-cancel'(spec) {
    const p = 'sb';
    const main = `<div role="main" style="padding:32px"><div style="border:1px solid #ddd;padding:20px" data-plan="premium">
<h2>Premium</h2><p>Renews Jun 1</p><button type="button" class="${p}-btn ${p}-btn--primary" data-cancel="next-cycle">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Upgrade Team</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Cancel Premium subscription', 'Cancel subscription Premium'] });
    const sel = '[data-plan="premium"] button[data-cancel="next-cycle"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Billing', decoys3(p).slice(0, 2)), [sel], 'Plan card.', ['Upgrade']);
  },

  'password-reset'(spec) {
    const p = 'ag';
    const main = `<div style="display:grid;grid-template-columns:200px 1fr;min-height:50vh"><nav style="background:#111827;color:#fff;padding:16px"><a href="/users">Users</a></nav>
<main role="main" style="padding:32px"><h1>Reset</h1><input type="email" value="user@corp.com" data-user="user@corp.com" />
<button type="button" class="${p}-btn ${p}-btn--primary" data-action="send-reset">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Disable account</button></main></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Send reset link user@corp.com', 'Send password reset'] });
    const sel = 'button[data-action="send-reset"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Admin reset', decoys3(p).slice(1)), [sel], 'Admin panel.', ['Disable']);
  },

  'document-sign'(spec) {
    const p = 'sn';
    const pages = Array.from({ length: 12 }, (_, i) => `<div style="height:120px;margin:8px;border:1px solid #ccc" data-page-num="${i + 1}">Pg ${i + 1}</div>`).join('');
    const main = `<div style="display:flex"><div role="main" style="flex:1;overflow:auto">${pages}</div>
<aside style="width:200px;padding:12px;border-left:1px solid #ddd"><button type="button" class="${p}-btn ${p}-btn--ghost">Initial</button>
<button type="button" class="${p}-btn ${p}-btn--primary" data-sign-page="12">Confirm</button></aside></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Sign page 12', 'Sign employment agreement page 12'] });
    const sel = 'button[data-sign-page="12"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Doc viewer', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Pages + tools.', ['Initial']);
  },

  'survey-form'(spec) {
    const p = 'fl';
    const nps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      .map((n) => `<button type="button" class="${p}-btn ${p}-btn--ghost" data-score="${n}">${n}</button>`)
      .join('');
    const main = `<form role="main" style="padding:32px"><h1>NPS</h1><div style="display:flex;gap:4px">${nps}</div>
<textarea>Great product</textarea><button type="submit" class="${p}-btn ${p}-btn--primary" data-nps-submit="9">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Skip prize</button></form>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Submit NPS 9', 'Submit NPS score 9'] });
    const sel = 'button[data-nps-submit="9"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'NPS form', decoys3(p).slice(0, 2)), [sel], 'NPS scale.', ['Skip']);
  },

  'charity-donate'(spec) {
    const p = 'gh';
    const main = `<div style="background:#0ea5e9;color:#fff;padding:48px;text-align:center"><h1>Clean Water Fund</h1></div>
<div role="main" style="text-align:center;padding:24px"><button type="button" class="${p}-btn ${p}-btn--ghost">$10</button>
<button type="button" class="${p}-btn ${p}-btn--ghost">$25</button><label><input type="checkbox" checked /> Monthly</label>
<button type="button" class="${p}-btn ${p}-btn--primary" data-fund="water" data-amt="25">Confirm</button></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Donate $25 monthly clean water', 'Donate water fund $25'] });
    const sel = 'button[data-fund="water"][data-amt="25"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Donation', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Donation hero.', ['Preset amounts']);
  },

  'flight-checkin'(spec) {
    const p = 'ac';
    const seats = ['12A', '12B', '12C', '14A', '14B', '14C']
      .map(
        (s) =>
          `<button type="button" class="${p}-btn ${s === '14A' ? `${p}-btn--primary` : `${p}-btn--ghost`}" ${s === '12A' ? 'disabled' : ''} ${s === '14A' ? 'data-seat="14A" data-window="true"' : ''}>${s}</button>`
      )
      .join('');
    const main = `<main role="main" style="padding:16px"><h1>AA882 seats</h1><div style="display:grid;grid-template-columns:repeat(6,40px);gap:4px">${seats}</div>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Skip seats</button></main>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Select seat 14A', 'Select window seat 14A AA882'] });
    const sel = 'button[data-seat="14A"][data-window="true"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Seat map', decoys3(p).slice(1)), [sel], 'Seat grid.', ['12A taken']);
  },

  'visa-application'(spec) {
    const p = 'vp';
    const main = `<ol style="display:flex;gap:8px;list-style:none;padding:16px"><li>Personal</li><li>Documents</li><li>Review</li></ol>
<section role="main" style="padding:24px"><h1>B-1 Documents</h1><div style="border:2px dashed #6366f1;padding:40px;text-align:center">
<button type="button" class="${p}-btn ${p}-btn--primary" data-doc="passport-scan">Confirm</button></div>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Expedite $99</button></section>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Upload passport scan', 'Upload passport B-1'] });
    const sel = 'button[data-doc="passport-scan"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Visa wizard', decoys3(p).slice(0, 2)), [sel], 'Visa upload.', ['Expedite']);
  },

  'stock-trade'(spec) {
    const p = 'tp';
    const main = `<div style="display:grid;grid-template-columns:1fr 320px;min-height:50vh"><div style="background:#0c0c0c;color:#22c55e;padding:16px" role="main">AAPL 182.44</div>
<aside style="background:#1e293b;color:#fff;padding:16px"><select><option selected>Market</option><option>Limit</option></select>
<input type="number" value="10" data-shares="10" /><button type="button" class="${p}-btn ${p}-btn--primary" data-symbol="AAPL" data-order="market">Confirm</button></aside></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Buy AAPL market', 'Buy 10 shares AAPL'] });
    const sel = 'button[data-symbol="AAPL"][data-order="market"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Terminal', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Trading UI.', ['Limit option']);
  },

  'podcast-subscribe'(spec) {
    const p = 'pw';
    const main = `<article role="main" style="display:flex;gap:20px;padding:24px" data-show="ai-daily"><div style="width:120px;height:120px;background:#a855f7"></div>
<div><h1>AI Daily</h1><button type="button" class="${p}-btn ${p}-btn--primary" data-subscribe="ai-daily">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Free trial</button></div></article>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Subscribe AI Daily', 'Subscribe show AI Daily'] });
    const sel = '[data-show="ai-daily"] button[data-subscribe="ai-daily"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Podcast', decoys3(p).slice(0, 2)), [sel], 'Show page.', ['Trial']);
  },

  'photo-upload'(spec) {
    const p = 'ca';
    const main = `<div role="main" style="padding:24px"><div style="display:flex;gap:12px">${['Trip', 'Family', 'Iceland 2026'].map((a) => `<div style="width:80px;height:80px;background:#e2e8f0">${a}</div>`).join('')}</div>
<div style="border:3px dashed #94a3b8;padding:60px;text-align:center;margin-top:16px" data-album="iceland-2026">
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Upload Iceland 2026', 'Upload album Iceland 2026'] });
    const sel = '[data-album="iceland-2026"] .ca-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Albums', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Album grid.', ['Thumbs']);
  },

  'forum-post'(spec) {
    const p = 'df';
    const main = `<ul role="main" style="list-style:none;padding:0">
<li style="border-bottom:1px solid #ddd;padding:12px"><h3>Random</h3></li>
<li style="border-bottom:1px solid #ddd;padding:12px" data-thread="wci-feedback"><h3>WCI specification feedback</h3>
<button type="button" class="${p}-btn ${p}-btn--primary" data-pin="wci-feedback">Confirm</button></li></ul>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">New post</button>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Pin WCI thread', 'Pin WCI specification feedback'] });
    const sel = '[data-thread="wci-feedback"] button[data-pin="wci-feedback"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Forum', decoys3(p).slice(1)), [sel], 'Thread list.', ['New post']);
  },

  'dating-profile'(spec) {
    const p = 'mm';
    const main = `<div role="main" style="display:grid;grid-template-columns:300px 1fr;gap:24px;padding:24px" data-profile="river_kayak">
<div style="height:300px;background:#fda4af;border-radius:16px"></div><div><h1>@river_kayak</h1><textarea>Love your adventure photos!</textarea>
<button type="button" class="${p}-btn ${p}-btn--primary" data-send-intro="river_kayak">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Boost profile</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Send intro river_kayak', 'Message river_kayak'] });
    const sel = '[data-profile="river_kayak"] button[data-send-intro="river_kayak"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Profile', decoys3(p).slice(0, 2)), [sel], 'Dating profile.', ['Boost']);
  },

  'rental-car'(spec) {
    const p = 'da';
    const main = `<form style="display:flex;gap:12px;padding:16px;background:#f1f5f9"><input value="LAX" /><input type="date" /><select><option selected>Compact</option></select></form>
<div role="main" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px">
<div style="border:1px solid #cbd5e1;padding:16px"><h3>Economy</h3><button type="button" class="${p}-btn ${p}-btn--ghost">Select</button></div>
<div style="border:1px solid #cbd5e1;padding:16px" data-vehicle="compact-lax-friday"><h3>Compact Friday</h3>
<button type="button" class="${p}-btn ${p}-btn--primary">Confirm</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Reserve LAX compact Friday', 'Reserve compact LAX'] });
    const sel = '[data-vehicle="compact-lax-friday"] .da-btn--primary';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Car rental', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Search + cards.', ['Select']);
  },

  'concert-tickets'(spec) {
    const p = 'tr';
    const main = `<div role="main" style="display:flex;gap:24px;padding:16px" data-event="neon-pulse"><section style="flex:1;background:#1e1b4b;color:#fff;padding:24px"><h1>Neon Pulse</h1><p>GA Floor</p></section>
<aside style="width:280px"><select><option>2</option></select>
<button type="button" class="${p}-btn ${p}-btn--primary" data-tickets="ga-2">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">VIP upgrade</button></aside></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Buy Neon Pulse GA', 'Buy 2 GA Neon Pulse'] });
    const sel = '[data-event="neon-pulse"] button[data-tickets="ga-2"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Concert', decoys3(p).slice(0, 2)), [sel], 'Venue + tickets.', ['VIP']);
  },

  'grocery-list'(spec) {
    const p = 'fcart';
    const main = `<ul role="main" style="list-style:none;padding:0"><li style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #eee">Milk
<button type="button" class="${p}-btn ${p}-btn--ghost">Remove</button></li>
<li style="display:flex;justify-content:space-between;padding:12px" data-item="organic-avocados">Organic avocados
<button type="button" class="${p}-btn ${p}-btn--primary" data-add-family="avocados">Confirm</button></li></ul>
<a href="/share" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Share list</a>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Add avocados family list', 'Add organic avocados list'] });
    const sel = '[data-item="organic-avocados"] button[data-add-family="avocados"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Grocery list', decoys3(p).slice(1)), [sel], 'List UL.', ['Share']);
  },

  'pet-adoption'(spec) {
    const p = 'pm';
    const main = `<div role="main" style="display:flex;gap:20px;padding:24px" data-pet="max"><div style="width:200px;height:200px;background:#fcd34d;border-radius:50%"></div>
<div><h1>Max</h1><button type="button" class="${p}-btn ${p}-btn--primary" data-adopt="max">Confirm</button></div></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Submit adoption Max', 'Apply adopt Max dog'] });
    const sel = '[data-pet="max"] button[data-adopt="max"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Pet profile', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Pet page.', ['Trap labels']);
  },

  'scholarship-apply'(spec) {
    const p = 'eg';
    const main = `<form role="main" style="max-width:640px;margin:32px auto"><div style="border-left:4px solid #4f46e5;padding-left:16px;margin-bottom:16px"><h2>STEM</h2><textarea rows="4"></textarea></div>
<button type="submit" class="${p}-btn ${p}-btn--primary" data-app="stem">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Fee waiver</button></form>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Submit STEM scholarship', 'Submit STEM application'] });
    const sel = 'button[data-app="stem"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Scholarship form', decoys3(p).slice(0, 2)), [sel], 'Multi-section form.', ['Waiver']);
  },

  'wifi-setup'(spec) {
    const p = 'nc';
    const main = `<ul role="main" style="list-style:none;padding:16px"><li style="display:flex;justify-content:space-between;padding:16px;border:1px solid #ddd;margin:8px 0">Home_5G <span>Locked</span></li>
<li style="display:flex;justify-content:space-between;padding:16px;border:1px solid #ddd" data-ssid="Guest_5G">Guest_5G
<button type="button" class="${p}-btn ${p}-btn--primary" data-connect-ssid="Guest_5G">Confirm</button></li></ul>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Connect Guest_5G', 'Connect guest network Guest_5G'] });
    const sel = 'button[data-connect-ssid="Guest_5G"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'WiFi list', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'SSID list.', ['Home locked']);
  },

  'invoice-pay'(spec) {
    const p = 'bf';
    const main = `<table role="main" style="width:100%;border-collapse:collapse"><thead><tr><th>Invoice</th><th>Due</th><th></th></tr></thead><tbody>
<tr><td>INV-2026-012</td><td>May 1</td><td><button type="button" class="${p}-btn ${p}-btn--ghost">View</button></td></tr>
<tr data-inv="INV-2026-044" style="color:#dc2626;font-weight:bold"><td>INV-2026-044</td><td>Today</td>
<td><button type="button" class="${p}-btn ${p}-btn--primary" data-pay-inv="INV-2026-044">Confirm</button></td></tr>
</tbody></table><button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Export CSV</button>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Pay INV-2026-044', 'Pay invoice 044 today'] });
    const sel = 'button[data-pay-inv="INV-2026-044"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Invoices', decoys3(p).slice(1)), [sel], 'Invoice table.', ['View row']);
  },

  'newsletter-sub'(spec) {
    const p = 'pb';
    const main = `<div role="main" style="min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#18181b;color:#fff">
<h1>AI Weekly Digest</h1><input type="email" placeholder="email" />
<button type="button" class="${p}-btn ${p}-btn--primary" data-newsletter="ai-digest">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Read sample</button></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Subscribe AI digest', 'Subscribe weekly AI digest'] });
    const sel = 'button[data-newsletter="ai-digest"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Newsletter', decoys3(p).slice(0, 2)), [sel], 'Landing.', ['Sample']);
  },

  'api-keys'(spec) {
    const p = 'dc';
    const main = `<div style="display:grid;grid-template-columns:180px 1fr;min-height:50vh"><nav style="background:#0f172a;color:#94a3b8;padding:12px"><a href="/keys">Keys</a></nav>
<main role="main"><table style="width:100%"><tr><th>Name</th><th></th></tr>
<tr><td>Staging</td><td><button type="button" class="${p}-btn ${p}-btn--ghost">Reveal</button></td></tr>
<tr data-key="production"><td>Production</td><td><button type="button" class="${p}-btn ${p}-btn--primary" data-rotate="production">Confirm</button></td></tr>
</table></main></div>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Rotate production API key', 'Rotate prod key'] });
    const sel = 'tr[data-key="production"] button[data-rotate="production"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'API console', [{ selector: '[data-decoy="decoy-extra"]', wciId: 'decoy-extra', desc: 'Trap' }]), [sel], 'Keys table.', ['Reveal']);
  },

  'privacy-settings'(spec) {
    const p = 'pd';
    const main = `<div role="main" style="max-width:520px;margin:40px auto">
<div style="display:flex;justify-content:space-between;padding:16px 0;border-bottom:1px solid #e5e7eb"><span>Analytics</span><input type="checkbox" checked /></div>
<div style="display:flex;justify-content:space-between;padding:16px 0" data-setting="third-party"><span>Third-party sharing</span>
<input type="checkbox" checked id="tp-share" /><button type="button" class="${p}-btn ${p}-btn--primary" data-save="disable-third-party">Confirm</button></div></div>
<button type="button" class="${p}-btn ${p}-btn--ghost" data-decoy="decoy-nav">Download data</button>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { keywordTrapLabels: ['Disable third-party sharing', 'Save disable third party'] });
    const sel = 'button[data-save="disable-third-party"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Privacy', decoys3(p).slice(1)), [sel], 'Toggle rows.', ['Download']);
  },

  'bug-report'(spec) {
    const p = 'it';
    const main = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.4)"></div>
<dialog open role="main" style="position:fixed;inset:15% 20%;padding:24px;z-index:50"><h1>Report</h1>
<select data-category="checkout"><option>UI</option><option selected>Checkout</option></select>
<textarea>Checkout times out mobile</textarea><button type="button" class="${p}-btn ${p}-btn--primary" data-file-bug="checkout-timeout">Confirm</button>
<button type="button" class="${p}-btn ${p}-btn--decoy" data-decoy="decoy-promo">Chat support</button></dialog>`;
    const rawHtml = shell(p, spec.title, spec.id, main, { withAb: false, keywordTrapLabels: ['File checkout timeout bug', 'File bug checkout timeout'] });
    const sel = 'button[data-file-bug="checkout-timeout"]';
    return pack(spec, rawHtml, pagePlan(spec, sel, 'Bug modal', decoys3(p).slice(0, 2)), [sel], 'Modal dialog.', ['Chat']);
  },
};
