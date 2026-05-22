/**
 * Per-scenario raw HTML builders — distinct DOM archetypes per domain.
 * Each returns { rawHtml, plan, rawSelectors, description, challenges }.
 */

const TRACKING = `<div class="px-track" style="position:absolute;width:1px;height:1px;overflow:hidden" aria-hidden="true"><img src="/px.gif" alt="" /></div>`;

function slug(id) {
  return id.replace(/-/g, '_');
}

function noiseHeader(prefix, title, decoyPromo = true) {
  return `<header class="${prefix}-hdr">
  <nav class="${prefix}-nav"><a href="/">Home</a><a href="/help">Help</a><a href="/blog">Blog</a></nav>
  <div class="${prefix}-hdr-promo">${decoyPromo ? `<button type="button" class="${prefix}-ad-btn" data-decoy="decoy-promo">Claim Offer</button>` : ''}
    <button type="button" class="${prefix}-ad-btn ${prefix}-ad-btn--alt" data-decoy="decoy-nav">Learn More</button></div>
</header>`;
}

function noiseFooter(prefix, title) {
  return `<footer class="${prefix}-ftr"><small>© Demo ${title}</small><a href="/privacy">Privacy</a><span class="${prefix}-ftr-ad">Sponsored links</span></footer>`;
}

function noiseAside(prefix) {
  return `<aside class="${prefix}-rail ${prefix}-rail--ads" aria-label="Sponsored"><div class="${prefix}-widget"><span>Sponsored</span><a href="/ads">Partner Ad</a></div></aside>`;
}

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
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh;font-family:system-ui,sans-serif}
.${p}-filters{background:#f4f6f8;padding:12px;border-right:1px solid #ddd}
.${p}-card{border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin:10px 0;background:#fff}
.${p}-apply{background:#2563eb;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer}
.${p}-ad-btn{background:#f59e0b;border:0;padding:6px 10px;margin-left:6px}
</style></head><body>
<div class="${p}-layout" data-page="${spec.id}">
${noiseHeader(p, spec.title)}
${noiseAside(p)}
<aside class="${p}-filters"><h2>Filters</h2><label><input type="checkbox" checked /> Remote</label>
<label><input type="checkbox" /> Senior</label><select><option>Any location</option><option>SF Bay</option></select></aside>
<main class="${p}-main" role="main">
<h1>Open roles</h1>
<ul class="${p}-list">
<li class="${p}-card" data-job="other-1"><h3>Junior QA — Beta LLC</h3><button type="button" class="${p}-apply ${p}-apply--ghost">Quick Apply</button></li>
<li class="${p}-card" data-job="acme-senior"><h3>Senior Engineer — Acme Corp</h3><p>React, TypeScript, distributed systems</p>
<button type="button" id="apply-acme-senior" class="${p}-apply" data-action="primary">Apply to Senior Engineer</button></li>
<li class="${p}-card" data-job="other-2"><h3>PM — Gamma Inc</h3><button type="button">Save</button></li>
</ul>
${noiseFooter(p, spec.title)}
</main>${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: `${spec.title} — job listings with filters` },
      primary: { selector: '#apply-acme-senior', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [
        { selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Claim Offer promotional CTA' },
        { selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Learn More nav decoy' },
      ],
    };
    return pack(spec, rawHtml, plan, ['#apply-acme-senior', 'button.hf-apply[data-action="primary"]'],
      'Job board with filter sidebar, job cards list, and multiple apply buttons.',
      ['Similar Apply buttons on other listings', 'Filter sidebar noise', 'Header promo CTA']);
  },

  'healthcare-portal'(spec) {
    const p = 'mg';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-shell{font-family:Georgia,serif;background:#f0f7ff}
.${p}-patient{display:flex;gap:16px;padding:16px;background:#1e40af;color:#fff}
.${p}-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px}
.${p}-slot{border:1px solid #93c5fd;padding:12px;text-align:center;background:#fff}
.${p}-slot button{width:100%;margin-top:8px}
.${p}-book-primary{background:#059669;color:#fff;border:0;padding:10px}
</style></head><body>
<div class="${p}-shell" data-page="${spec.id}">
${noiseHeader(p, spec.title, false)}
<div class="${p}-patient"><div><strong>Patient:</strong> Jordan Lee · MRN 88291</div><div>Plan: PPO Gold</div></div>
<section class="${p}-slots" role="main">
<h1>Appointment slots — next week</h1>
<div class="${p}-slot"><span>Tue 10:00</span><button type="button">In-person</button></div>
<div class="${p}-slot"><span>Tue 14:30</span><button type="button" class="${p}-book-primary" id="schedule-video-tue" data-action="primary">Schedule video visit Tue</button></div>
<div class="${p}-slot"><span>Wed 09:00</span><button type="button">Call back</button></div>
<div class="${p}-slot"><span>Fri 11:00</span><button type="button" data-decoy="decoy-nav">Request callback</button></div>
</section>${noiseFooter(p, spec.title)}${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'MediGate patient portal — appointment scheduling' },
      primary: { selector: '#schedule-video-tue', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Request callback decoy' }],
    };
    return pack(spec, rawHtml, plan, ['#schedule-video-tue', 'button.mg-book-primary'],
      'Healthcare portal with patient header banner and appointment slot grid.',
      ['Multiple slot action buttons', 'In-person vs video visit labels', 'Patient header noise']);
  },

  'email-client'(spec) {
    const p = 'ip';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-frame{display:grid;grid-template-columns:280px 1fr 340px;height:100vh;font-family:ui-monospace,monospace}
.${p}-folders{border-right:1px solid #ccc;padding:8px}
.${p}-inbox{width:100%;border-collapse:collapse}
.${p}-inbox tr{cursor:pointer}
.${p}-inbox tr.unread{font-weight:bold}
.${p}-pane{border-left:1px solid #ccc;padding:16px;background:#fafafa}
.${p}-toolbar button{margin-right:6px}
</style></head><body>
<table class="${p}-frame" data-page="${spec.id}" cellpadding="0" cellspacing="0"><tr>
<td class="${p}-folders">${noiseHeader(p, spec.title)}<ul><li>Inbox</li><li>Sent</li><li>Spam</li></ul>${noiseAside(p)}</td>
<td><table class="${p}-inbox" role="main"><thead><tr><th>From</th><th>Subject</th></tr></thead>
<tbody>
<tr><td>news@digest.com</td><td>Weekly roundup</td></tr>
<tr class="unread" data-thread="billing"><td>billing@acme.com</td><td>Invoice #992 — due</td></tr>
<tr><td>noreply@social.io</td><td>You have 3 mentions</td></tr>
</tbody></table>
<div class="${p}-toolbar"><button type="button">Reply</button><button type="button">Forward</button>
<button type="button" id="archive-billing-thread" data-action="primary">Archive billing thread</button>
<button type="button" data-decoy="decoy-promo">Upgrade storage</button></div></td>
<td class="${p}-pane"><h2>billing@acme.com</h2><p>Your March invoice is attached…</p></td>
</tr></table>${TRACKING}</body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Inbox table with reading pane' },
      primary: { selector: '#archive-billing-thread', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Upgrade storage promo' }],
    };
    return pack(spec, rawHtml, plan, ['#archive-billing-thread'],
      'Email client with folder sidebar, inbox table, and reading pane split layout.',
      ['Inbox rows look clickable', 'Reply/Forward similar to Archive', 'Promo upgrade in toolbar']);
  },

  'calendar-app'(spec) {
    const p = 'cs';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-week{display:grid;grid-template-columns:60px repeat(7,1fr);gap:1px;background:#e5e7eb}
.${p}-cell{min-height:64px;background:#fff;border:1px solid #eee;font-size:11px;padding:4px}
.${p}-modal{display:none}.${p}-modal.is-open{display:block;position:fixed;inset:20% 30%;background:#fff;border:2px solid #333;padding:20px;z-index:5}
.${p}-create{background:#7c3aed;color:#fff;border:0;padding:10px 16px}
</style></head><body>
<div data-page="${spec.id}">
${noiseHeader(p, spec.title)}
<main role="main" class="${p}-cal"><h1>Week of May 19</h1>
<div class="${p}-week">
<div></div><div class="${p}-cell">Mon</div><div class="${p}-cell">Tue</div><div class="${p}-cell">Wed</div><div class="${p}-cell">Thu</div><div class="${p}-cell">Fri</div><div class="${p}-cell">Sat</div><div class="${p}-cell">Sun</div>
<div>9am</div><div class="${p}-cell"></div><div class="${p}-cell"><button type="button" class="${p}-evt" data-open-modal="new">+ Add</button></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div><div class="${p}-cell"></div>
</div>
<button type="button" class="${p}-create" id="create-standup-series" data-action="primary">Create weekday 9am standup series</button>
</main>
<div class="${p}-modal is-open" id="event-modal" role="dialog"><h2>New event</h2><input type="text" placeholder="Title" /><button type="button">Cancel</button></div>
${noiseFooter(p, spec.title)}${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Calendar week grid with event modal' },
      primary: { selector: '#create-standup-series', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      landmarks: [{ selector: '#event-modal', wciId: 'event-modal', desc: 'New event modal', priority: 3 }],
    };
    return pack(spec, rawHtml, plan, ['#create-standup-series', 'button.cs-create'],
      'Calendar week grid with open event modal and series creation CTA.',
      ['Grid +Add cells vs series button', 'Open modal overlay', 'Multiple day columns']);
  },

  'food-delivery'(spec) {
    const p = 'qb';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}
.${p}-resto{border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.${p}-cart{position:fixed;right:0;top:0;width:280px;height:100%;background:#fff;border-left:2px solid #f97316;padding:16px}
.${p}-add{background:#f97316;color:#fff;border:0;width:100%;padding:10px;margin-top:8px}
</style></head><body>
<div data-page="${spec.id}">
${noiseHeader(p, spec.title)}
<main class="${p}-grid" role="main">
<article class="${p}-resto"><h3>Sushi Zen</h3><button type="button">View menu</button></article>
<article class="${p}-resto" data-restaurant="tokyo-bowl"><h3>Tokyo Bowl</h3><p>Chicken Teriyaki Bowl · $12.99</p>
<button type="button" class="${p}-add" id="add-teriyaki-bowl" data-action="primary">Add Teriyaki Bowl &amp; checkout</button></article>
<article class="${p}-resto"><h3>Pizza Hub</h3><button type="button" data-decoy="decoy-promo">Free delivery promo</button></article>
</main>
<aside class="${p}-cart"><h2>Cart (0)</h2><button type="button">Clear</button><p>Empty — add items</p></aside>
${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Restaurant grid with cart drawer' },
      primary: { selector: '#add-teriyaki-bowl', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Free delivery promo on wrong restaurant' }],
    };
    return pack(spec, rawHtml, plan, ['#add-teriyaki-bowl', 'button.qb-add[data-action="primary"]'],
      'Food delivery restaurant card grid with fixed cart drawer.',
      ['View menu vs Add buttons', 'Cart drawer distraction', 'Promo on other restaurant']);
  },

  'tax-filing'(spec) {
    const p = 'tx';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-wizard{max-width:720px;margin:24px auto;font-family:system-ui}
.${p}-steps{display:flex;gap:8px;margin-bottom:24px}
.${p}-step{flex:1;padding:8px;background:#e5e7eb;text-align:center;border-radius:4px}
.${p}-step.is-active{background:#3b82f6;color:#fff}
.${p}-panel{border:1px solid #d1d5db;padding:20px;border-radius:8px}
.${p}-import{background:#16a34a;color:#fff;border:0;padding:12px 20px;font-size:16px}
</style></head><body>
<div class="${p}-wizard" data-page="${spec.id}" role="main">
${noiseHeader(p, spec.title, false)}
<nav class="${p}-steps" aria-label="Progress"><div class="${p}-step">Personal</div><div class="${p}-step is-active">Income</div><div class="${p}-step">Deductions</div><div class="${p}-step">Review</div></nav>
<section class="${p}-panel"><h1>Income — W-2 wages</h1>
<p>Import from payroll provider or enter manually.</p>
<button type="button" data-decoy="decoy-nav">Enter manually</button>
<button type="button" class="${p}-import" id="import-w2-adp" data-action="primary">Import W-2 from ADP</button>
<input type="file" class="hidden-upload" style="display:none" />
</section>
${noiseFooter(p, spec.title)}${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Tax filing wizard — income step' },
      primary: { selector: '#import-w2-adp', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Enter manually decoy' }],
      landmarks: [{ selector: '.tx-steps', wciId: 'tax-progress-steps', desc: 'Multi-step progress indicator', priority: 3 }],
    };
    return pack(spec, rawHtml, plan, ['#import-w2-adp', 'button.tx-import'],
      'Multi-step tax wizard with progress steps and W-2 import panel.',
      ['Manual entry vs import', 'Four-step progress bar', 'Hidden file input']);
  },

  'streaming-service'(spec) {
    const p = 'sv';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-hero{height:200px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:32px}
.${p}-row{display:flex;gap:12px;overflow-x:auto;padding:16px}
.${p}-tile{min-width:140px;background:#1f2937;color:#fff;border-radius:6px;padding:12px}
.${p}-watchlist-btn{background:#e11d48;border:0;color:#fff;padding:8px 12px;margin-top:8px;width:100%}
</style></head><body>
<div data-page="${spec.id}" style="background:#0f0f0f;color:#eee">
${noiseHeader(p, spec.title, false)}
<div class="${p}-hero"><h1>Featured tonight</h1><button type="button">Play trailer</button></div>
<section class="${p}-row" role="main"><h2 style="width:100%">Documentaries</h2>
<div class="${p}-tile"><span>Arctic Light</span><button type="button">Play</button></div>
<div class="${p}-tile" data-title-id="ocean-deep"><strong>Ocean Deep</strong><span> · 52m</span>
<button type="button" class="${p}-watchlist-btn" id="add-ocean-deep" data-action="primary">+ Watchlist</button></div>
<div class="${p}-tile"><span>City Skies</span><button type="button">Play</button></div>
</section>${noiseFooter(p, spec.title)}${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Streaming catalog with hero and title row' },
      primary: { selector: '#add-ocean-deep', wciId: spec.wciId, desc: spec.goal, action: 'click' },
    };
    return pack(spec, rawHtml, plan, ['#add-ocean-deep', 'button.sv-watchlist-btn[data-action="primary"]'],
      'Streaming hero banner plus horizontal documentary title tiles.',
      ['Play vs Watchlist on tiles', 'Hero play trailer', 'Dark theme row scroll']);
  },

  'wiki-edit'(spec) {
    const p = 'ow';
    const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>
.${p}-edit{display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:80vh}
.${p}-toolbar{background:#f3f4f6;padding:8px;border-bottom:1px solid #ccc;grid-column:1/-1;display:flex;gap:8px}
.${p}-editor{padding:16px;font-family:serif}
.${p}-diff{background:#fff8e1;padding:16px;border-left:2px solid #fbbf24}
.${p}-publish{background:#22c55e;color:#fff;border:0;padding:10px 18px;font-weight:bold}
</style></head><body>
<div data-page="${spec.id}">
<div class="${p}-toolbar" role="toolbar">
<button type="button">Bold</button><button type="button">Link</button><button type="button" data-decoy="decoy-nav">Show history</button>
<button type="button" class="${p}-publish" id="publish-wci-article" data-action="primary">Publish changes</button>
</div>
<div class="${p}-edit">
<textarea class="${p}-editor" role="main" rows="20">== Web Context Interface ==\nAgent-readable pages…</textarea>
<div class="${p}-diff"><h3>Diff preview</h3><ins>+ distillation layer</ins></div>
</div>${noiseFooter(p, spec.title)}${TRACKING}</div></body></html>`;
    const plan = {
      pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Wiki editor with toolbar and diff pane' },
      primary: { selector: '#publish-wci-article', wciId: spec.wciId, desc: spec.goal, action: 'click' },
      decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Show history decoy' }],
    };
    return pack(spec, rawHtml, plan, ['#publish-wci-article', 'button.ow-publish'],
      'Wiki edit split view: toolbar, textarea editor, and diff preview column.',
      ['Toolbar formatting vs publish', 'Diff pane noise', 'Show history decoy']);
  },
};

/** Fallback + remaining scenarios — registered below */
function register(id, fn) {
  LAYOUT_BUILDERS[id] = fn;
}

// Batch-register remaining 37 scenarios with distinct structures
register('insurance-quote', (spec) => {
  const p = 'ss';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-cols{display:flex;gap:24px}.${p}-form{flex:2}.${p}-quote{flex:1;background:#ecfdf5;padding:16px;border-radius:8px}.${p}-cta{background:#0d9488;color:#fff;border:0;padding:12px;width:100%}</style></head><body>
<div data-page="${spec.id}"><main class="${p}-cols" role="main"><form class="${p}-form"><h1>Auto quote</h1>
<label>ZIP <input name="zip" value="94105" /></label><fieldset><legend>Coverage</legend><label><input type="radio" name="cov" checked /> Liability</label><label><input type="radio" name="cov" /> Full</label></fieldset>
<button type="submit" class="${p}-cta" id="get-auto-quote-94105" data-action="primary">Get quote for 94105</button></form>
<aside class="${p}-quote"><p>Estimated: —</p><button type="button" data-decoy="decoy-nav">Call agent</button></aside></main>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Insurance quote form with sidebar estimate' }, primary: { selector: '#get-auto-quote-94105', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Call agent' }] }, ['#get-auto-quote-94105'], 'Two-column quote form with coverage radios and estimate sidebar.', ['Call agent decoy', 'Coverage radio noise']);
});

register('real-estate', (spec) => {
  const p = 'hn';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-wrap{display:grid;grid-template-columns:1fr 360px}.${p}-map{height:240px;background:#cbd5e1}.${p}-cards{display:flex;flex-wrap:wrap;gap:10px}.${p}-card{width:45%;border:1px solid #ddd;padding:10px}</style></head><body>
<div class="${p}-wrap" data-page="${spec.id}"><div class="${p}-map" role="img" aria-label="Map"></div><section role="main" class="${p}-cards">
<article class="${p}-card"><h3>2BR · Oak St</h3><button type="button">Tour</button></article>
<article class="${p}-card" data-listing="742-evergreen"><h3>3BR · 742 Evergreen Terrace</h3><button type="button" id="save-listing-742" data-action="primary">Save listing</button></article>
</section>${noiseAside(p)}${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Listings with map' }, primary: { selector: '#save-listing-742', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: `.${p}-rail a`, wciId: 'decoy-promo', desc: 'Partner ad' }] }, ['#save-listing-742'], 'Map + listing cards masonry layout.', ['Tour vs Save', 'Map placeholder']);
});

register('lms-course', (spec) => {
  const p = 'lp';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-layout{display:grid;grid-template-columns:2fr 1fr}.${p}-video{background:#000;height:280px}.${p}-modules{list-style:none;padding:0}.${p}-mod{padding:10px;border-bottom:1px solid #eee}.${p}-done-btn{background:#4f46e5;color:#fff;border:0}</style></head><body>
<div class="${p}-layout" data-page="${spec.id}"><div class="${p}-video" role="main">▶ Module 4: Agents</div><ul class="${p}-modules">
<li class="${p}-mod">Module 3 ✓</li><li class="${p}-mod">Module 4 — in progress <button type="button" class="${p}-done-btn" id="complete-module-4" data-action="primary">Mark complete</button></li>
</ul>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'LMS video + module checklist' }, primary: { selector: '#complete-module-4', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#complete-module-4'], 'Video player with module checklist sidebar.', ['Completed vs active module']);
});

register('support-ticket', (spec) => {
  const p = 'hd';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-ticket{max-width:560px;margin:40px auto}.${p}-prio label{display:block;margin:8px 0}.${p}-submit{background:#dc2626;color:#fff;border:0;padding:12px 24px}</style></head><body>
<form class="${p}-ticket" data-page="${spec.id}" role="main"><h1>New ticket</h1><input type="text" placeholder="Subject" value="Login outage" />
<div class="${p}-prio"><label><input type="radio" name="prio" value="low" /> Low</label><label><input type="radio" name="prio" value="high" checked /> Priority</label></div>
<textarea rows="5">Users cannot log in since 09:00 UTC</textarea>
<button type="submit" class="${p}-submit" id="submit-priority-ticket" data-action="primary">Submit priority ticket</button>
<button type="button" data-decoy="decoy-nav">Save draft</button></form>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Support ticket form' }, primary: { selector: '#submit-priority-ticket', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Save draft' }] }, ['#submit-priority-ticket'], 'Ticket form with priority radio group.', ['Save draft vs submit']);
});

register('ecommerce-search', (spec) => {
  const p = 'sg';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-filters{display:flex;gap:16px;padding:12px;background:#fafafa}.${p}-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.${p}-item{border:1px solid #e5e5e5;padding:8px}</style></head><body>
<div data-page="${spec.id}"><div class="${p}-filters" role="search"><label>Stars <select id="rating-filter"><option>Any</option><option value="4">4+ stars</option></select></label>
<label>Max price <input type="number" id="max-price" value="50" /></label>
<button type="button" id="apply-filters" data-action="primary">Apply filters</button><button type="button" data-decoy="decoy-promo">Flash sale</button></div>
<table class="${p}-grid" role="main"><tr><td class="${p}-item">Widget $12</td><td class="${p}-item">Gadget $45 ★★★★</td></tr></table>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Product search with top filters' }, primary: { selector: '#apply-filters', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Flash sale' }] }, ['#apply-filters'], 'Top filter bar + product results table grid.', ['Flash sale decoy']);
});

register('hotel-booking', (spec) => {
  const p = 'sf';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-results{display:flex;flex-direction:column;gap:12px}.${p}-hotel{display:flex;border:1px solid #ddd;padding:16px;gap:16px}.${p}-book{margin-left:auto;background:#0369a1;color:#fff;border:0;padding:10px}</style></head><body>
<ul class="${p}-results" data-page="${spec.id}" role="main">
<li class="${p}-hotel"><div><h2>Airport Inn</h2><p>$89/night</p></div><button type="button">Select</button></li>
<li class="${p}-hotel" data-hotel="marriott-downtown"><div><h2>Marriott Downtown</h2><p>$189/night · 2 nights</p></div>
<button type="button" class="${p}-book" id="book-marriott" data-action="primary">Book 2 nights</button></li>
</ul>${noiseHeader(p, spec.title)}${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Hotel results list' }, primary: { selector: '#book-marriott', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: `.${p}-ad-btn`, wciId: 'decoy-promo', desc: 'Header promo' }] }, ['#book-marriott'], 'Vertical hotel result cards with book buttons.', ['Select vs Book']);
});

register('weather-app', (spec) => {
  const p = 'sk';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-dash{text-align:center;padding:40px}.${p}-temp{font-size:64px}.${p}-toggle{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px}</style></head><body>
<div class="${p}-dash" data-page="${spec.id}" role="main"><h1>San Francisco</h1><div class="${p}-temp">62°</div>
<div class="${p}-toggle"><span>Rain alerts</span><input type="checkbox" id="rain-alerts-sf" /><label for="rain-alerts-sf"><button type="button" id="enable-rain-alerts" data-action="primary">Enable alerts</button></label></div>
</div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Weather dashboard' }, primary: { selector: '#enable-rain-alerts', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#enable-rain-alerts'], 'Centered weather dashboard with alert toggle.', ['Checkbox + button combo']);
});

register('parking-reservation', (spec) => {
  const p = 'pk';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-garage{display:grid;grid-template-columns:repeat(6,48px);gap:4px}.${p}-spot{width:48px;height:48px;border:1px solid #999;font-size:10px}.${p}-spot.taken{background:#fecaca}.${p}-spot.open{background:#bbf7d0;cursor:pointer}</style></head><body>
<div data-page="${spec.id}" role="main"><h1>Garage B — Saturday 2pm</h1><div class="${p}-garage">
${['A1','A2','B11','B12','B13'].map((s) => `<button type="button" class="${p}-spot ${s==='B12'?'open':'taken'}" ${s==='B12'?'id="reserve-spot-b12" data-action="primary"':''}>${s}</button>`).join('')}
</div><button type="button" data-decoy="decoy-promo">Monthly pass</button>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Parking spot grid' }, primary: { selector: '#reserve-spot-b12', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Monthly pass' }] }, ['#reserve-spot-b12', 'button.pk-spot.open'], 'Parking spot button grid.', ['Taken vs open spots']);
});

register('gym-membership', (spec) => {
  const p = 'fc';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-plans{display:flex;gap:20px;justify-content:center;padding:32px}.${p}-plan{border:2px solid #ddd;border-radius:12px;padding:24px;width:200px}.${p}-plan.featured{border-color:#7c3aed}</style></head><body>
<div class="${p}-plans" data-page="${spec.id}" role="main">
<div class="${p}-plan"><h3>Monthly</h3><p>$49/mo</p><button type="button">Current</button></div>
<div class="${p}-plan featured"><h3>Annual</h3><p>$399/yr</p><button type="button" id="upgrade-annual" data-action="primary">Upgrade to annual</button></div>
</div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Membership pricing cards' }, primary: { selector: '#upgrade-annual', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#upgrade-annual'], 'Pricing plan comparison cards.', ['Current plan button']);
});

register('pharmacy-order', (spec) => {
  const p = 'rx';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-rx-list{width:100%;border-collapse:collapse}.${p}-rx-list td,.${p}-rx-list th{border:1px solid #ddd;padding:10px}.${p}-refill{background:#059669;color:#fff;border:0}</style></head><body>
<table class="${p}-rx-list" data-page="${spec.id}" role="main"><thead><tr><th>Drug</th><th>Dose</th><th>Action</th></tr></thead><tbody>
<tr><td>Metformin</td><td>500mg</td><td><button type="button">View</button></td></tr>
<tr data-rx="lisinopril"><td>Lisinopril</td><td>10mg</td><td><button type="button" class="${p}-refill" id="refill-lisinopril" data-action="primary">Refill</button></td></tr>
</tbody></table><nav>${noiseHeader(p, spec.title, false)}</nav>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Prescription table' }, primary: { selector: '#refill-lisinopril', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: `[data-decoy="decoy-nav"]`, wciId: 'decoy-nav', desc: 'Nav learn more' }] }, ['#refill-lisinopril'], 'Prescription data table with per-row actions.', ['View vs Refill']);
});

register('ride-share', (spec) => {
  const p = 'gr';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-app{display:grid;grid-template-rows:auto 1fr auto;height:100vh}.${p}-map{flex:1;background:#d4d4d8;min-height:300px}.${p}-dest{padding:16px}</style></head><body>
<div class="${p}-app" data-page="${spec.id}"><header>GoRide</header><div class="${p}-map" role="img">Map</div>
<div class="${p}-dest" role="main"><input type="text" value="SFO Terminal 2" id="destination" /><select><option>GoX</option><option>Comfort</option></select>
<button type="button" id="request-ride-sfo" data-action="primary">Request ride</button><button type="button" data-decoy="decoy-promo">50% off first ride</button></div></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Ride share map + destination bar' }, primary: { selector: '#request-ride-sfo', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Promo ride' }] }, ['#request-ride-sfo'], 'Map stack with destination input footer.', ['Promo vs request']);
});

register('voting-poll', (spec) => {
  const p = 'vh';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-ballot{max-width:480px;margin:32px auto;border:2px solid #1e3a8a;padding:24px}.${p}-choice{display:block;margin:12px 0;padding:12px;border:1px solid #ccc}</style></head><body>
<form class="${p}-ballot" data-page="${spec.id}" role="main"><h1>Proposition 12</h1>
<label class="${p}-choice"><input type="radio" name="prop12" value="no" /> No</label>
<label class="${p}-choice"><input type="radio" name="prop12" value="yes" id="vote-yes-prop12" /> Yes — support</label>
<button type="submit" id="cast-vote-prop12" data-action="primary">Cast vote</button></form>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Ballot form' }, primary: { selector: '#cast-vote-prop12', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#cast-vote-prop12'], 'Ballot radio choices in bordered form.', ['Yes radio vs cast button']);
});

register('code-review', (spec) => {
  const p = 'ml';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-pr{display:grid;grid-template-columns:240px 1fr}.${p}-files{background:#f6f8fa}.${p}-diff{font-family:monospace;font-size:12px}.${p}-approve{background:#2da44e;color:#fff;border:0;padding:8px 16px}</style></head><body>
<div class="${p}-pr" data-page="${spec.id}"><aside class="${p}-files"><ul><li>src/api.ts</li><li>tests/api.test.ts</li></ul></aside>
<main class="${p}-diff" role="main"><h1>PR #4182 — Fix timeout</h1><pre>+ await page.waitFor()</pre>
<button type="button" class="${p}-approve" id="approve-pr-4182" data-action="primary">Approve</button><button type="button">Request changes</button>
<button type="button" data-decoy="decoy-promo">Try MergeLab Pro</button></main></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'PR diff review' }, primary: { selector: '#approve-pr-4182', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Pro upsell' }] }, ['#approve-pr-4182'], 'PR file sidebar + diff pane with approve.', ['Request changes vs approve']);
});

register('inventory-mgmt', (spec) => {
  const p = 'sp';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-table{width:100%;border-collapse:collapse}.${p}-table th{background:#374151;color:#fff}.${p}-reorder{background:#f59e0b;border:0;color:#000;padding:6px}</style></head><body>
<table class="${p}-table" data-page="${spec.id}" role="main"><thead><tr><th>SKU</th><th>Qty</th><th></th></tr></thead><tbody>
<tr><td>WH-4400</td><td>120</td><td><button type="button">Adjust</button></td></tr>
<tr data-sku="WH-9921"><td>WH-9921</td><td>12</td><td><button type="button" class="${p}-reorder" id="reorder-wh9921" data-action="primary">Reorder 500</button></td></tr>
</tbody></table>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Inventory SKU table' }, primary: { selector: '#reorder-wh9921', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#reorder-wh9921'], 'Warehouse inventory data table.', ['Adjust vs Reorder']);
});

register('subscription-cancel', (spec) => {
  const p = 'sb';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-billing{padding:32px}.${p}-plan-card{border:1px solid #ddd;padding:20px;border-radius:8px}.${p}-cancel{color:#b91c1c;background:transparent;border:1px solid #b91c1c;padding:10px}</style></head><body>
<div class="${p}-billing" data-page="${spec.id}" role="main"><div class="${p}-plan-card"><h2>Premium — $19/mo</h2><p>Renews Jun 1</p>
<button type="button" class="${p}-cancel" id="cancel-premium" data-action="primary">Cancel subscription</button><button type="button" data-decoy="decoy-promo">Upgrade to Team</button></div></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Billing plan card' }, primary: { selector: '#cancel-premium', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Upgrade upsell' }] }, ['#cancel-premium'], 'Single plan billing card with cancel CTA.', ['Upgrade vs cancel']);
});

register('password-reset', (spec) => {
  const p = 'ag';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-admin{display:grid;grid-template-columns:200px 1fr;min-height:100vh}.${p}-nav{background:#111827;color:#fff;padding:16px}.${p}-panel{padding:32px}</style></head><body>
<div class="${p}-admin" data-page="${spec.id}"><nav class="${p}-nav"><a href="/users">Users</a><a href="/logs">Logs</a></nav>
<main class="${p}-panel" role="main"><h1>Reset password</h1><input type="email" id="user-email" value="user@corp.com" />
<button type="button" id="send-reset-link" data-action="primary">Send reset link</button><button type="button" data-decoy="decoy-nav">Disable account</button></main></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Admin password reset panel' }, primary: { selector: '#send-reset-link', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Disable account' }] }, ['#send-reset-link'], 'Admin sidebar nav + reset form panel.', ['Disable vs send']);
});

register('document-sign', (spec) => {
  const p = 'sn';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-doc{display:flex;height:90vh}.${p}-pages{flex:1;overflow:auto;background:#f5f5f5}.${p}-page{height:400px;margin:8px;border:1px solid #ccc;background:#fff}.${p}-tools{width:200px;border-left:1px solid #ddd;padding:12px}</style></head><body>
<div class="${p}-doc" data-page="${spec.id}"><div class="${p}-pages" role="main">${Array.from({length:12},(_,i)=>`<div class="${p}-page" data-page-num="${i+1}">Page ${i+1}</div>`).join('')}</div>
<aside class="${p}-tools"><button type="button">Initial</button><button type="button" id="sign-page-12" data-action="primary">Sign page 12</button></aside></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Document viewer with sign tools' }, primary: { selector: '#sign-page-12', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#sign-page-12'], 'Scrollable document pages + signing toolbar.', ['Initial vs sign page 12']);
});

register('survey-form', (spec) => {
  const p = 'fl';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-nps{display:flex;justify-content:space-between;max-width:400px}.${p}-nps button{width:36px;height:36px;border-radius:50%;border:1px solid #999}.${p}-nps button.selected{background:#3b82f6;color:#fff}</style></head><body>
<form data-page="${spec.id}" role="main" style="padding:32px"><h1>How likely to recommend?</h1>
<div class="${p}-nps">${[0,1,2,3,4,5,6,7,8,9,10].map((n)=>`<button type="button" data-score="${n}" ${n===9?'class="selected"':''}>${n}</button>`).join('')}</div>
<textarea placeholder="Comment">Great product</textarea>
<button type="submit" id="submit-nps" data-action="primary">Submit NPS</button><button type="button" data-decoy="decoy-promo">Skip &amp; win prize</button></form>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'NPS survey form' }, primary: { selector: '#submit-nps', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Skip prize' }] }, ['#submit-nps'], 'NPS 0–10 button scale + comment textarea.', ['Score buttons vs submit']);
});

register('charity-donate', (spec) => {
  const p = 'gh';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-hero{background:#0ea5e9;color:#fff;padding:48px;text-align:center}.${p}-amounts{display:flex;gap:12px;justify-content:center;margin:24px}.${p}-donate{background:#be123c;color:#fff;border:0;padding:14px 28px}</style></head><body>
<div data-page="${spec.id}"><div class="${p}-hero"><h1>Clean Water Fund</h1></div>
<div class="${p}-amounts" role="main"><button type="button">$10</button><button type="button">$25</button><button type="button">$50</button></div>
<label><input type="checkbox" checked /> Monthly</label>
<button type="button" class="${p}-donate" id="donate-water-25" data-action="primary">Donate $25 monthly</button>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Charity donation landing' }, primary: { selector: '#donate-water-25', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#donate-water-25'], 'Hero + preset amount buttons + donate CTA.', ['Preset amounts vs final donate']);
});

register('flight-checkin', (spec) => {
  const p = 'ac';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-seatmap{display:grid;grid-template-columns:repeat(6,40px);gap:4px}.${p}-seat{width:40px;height:40px;border:1px solid #64748b;font-size:9px}.${p}-seat.taken{background:#94a3b8}.${p}-seat.window{background:#bfdbfe}</style></head><body>
<div data-page="${spec.id}" role="main"><h1>AA882 — Select seat</h1><div class="${p}-seatmap">
${['12A','12B','12C','14A','14B','14C'].map(s=>`<button type="button" class="${p}-seat ${s==='14A'?'window':s==='12A'?'taken':'available'}" ${s==='14A'?'id="select-seat-14a" data-action="primary"':''}>${s}</button>`).join('')}
</div><button type="button" data-decoy="decoy-nav">Skip seats</button>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Seat map grid' }, primary: { selector: '#select-seat-14a', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Skip seats' }] }, ['#select-seat-14a'], 'Airline seat map button grid.', ['Taken 12A vs window 14A']);
});

register('visa-application', (spec) => {
  const p = 'vp';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-wizard ol{display:flex;gap:8px;list-style:none}.${p}-step{display:none}.${p}-step.active{display:block;padding:24px}.${p}-upload{border:2px dashed #6366f1;padding:40px;text-align:center}</style></head><body>
<div data-page="${spec.id}"><ol class="${p}-wizard"><li>Personal</li><li>Documents</li><li>Review</li></ol>
<section class="${p}-step active" role="main"><h1>B-1 Documents</h1><div class="${p}-upload"><p>Passport scan required</p>
<button type="button" id="upload-passport" data-action="primary">Upload passport scan</button></div>
<button type="button" data-decoy="decoy-promo">Expedite for $99</button></section>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Visa wizard documents step' }, primary: { selector: '#upload-passport', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Expedite fee' }] }, ['#upload-passport'], 'Visa OL wizard steps + dashed upload zone.', ['Expedite upsell']);
});

register('stock-trade', (spec) => {
  const p = 'tp';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-terminal{display:grid;grid-template-columns:1fr 320px;height:100vh}.${p}-chart{background:#0c0c0c;color:#22c55e;padding:16px;font-family:monospace}.${p}-order{background:#1e293b;color:#fff;padding:16px}</style></head><body>
<div class="${p}-terminal" data-page="${spec.id}"><div class="${p}-chart" role="main">AAPL 182.44 ▲</div>
<aside class="${p}-order"><h2>Order</h2><select><option>Market</option><option>Limit</option></select>
<input type="number" value="10" id="share-qty" /><button type="button" id="buy-aapl-market" data-action="primary">Buy AAPL</button></aside></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Trading terminal' }, primary: { selector: '#buy-aapl-market', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#buy-aapl-market'], 'Chart pane + order sidebar terminal layout.', ['Market order form']);
});

register('podcast-subscribe', (spec) => {
  const p = 'pw';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-show{display:flex;gap:20px;padding:24px}.${p}-art{width:120px;height:120px;background:#a855f7;border-radius:8px}.${p}-sub{background:#7c3aed;color:#fff;border:0;padding:10px 20px}</style></head><body>
<article class="${p}-show" data-page="${spec.id}" role="main"><div class="${p}-art"></div><div><h1>AI Daily</h1><p>Daily AI news</p>
<button type="button" class="${p}-sub" id="subscribe-ai-daily" data-action="primary">Subscribe</button><button type="button" data-decoy="decoy-promo">Free trial</button></div></article>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Podcast show page' }, primary: { selector: '#subscribe-ai-daily', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Free trial' }] }, ['#subscribe-ai-daily'], 'Podcast show art + subscribe row.', ['Free trial decoy']);
});

register('photo-upload', (spec) => {
  const p = 'ca';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-dropzone{border:3px dashed #94a3b8;padding:60px;text-align:center;border-radius:16px;margin:40px}.${p}-albums{display:flex;gap:12px;flex-wrap:wrap}.${p}-thumb{width:80px;height:80px;background:#e2e8f0}</style></head><body>
<div data-page="${spec.id}" role="main"><div class="${p}-albums">${['Trip','Family','Iceland 2026'].map(a=>`<div class="${p}-thumb">${a}</div>`).join('')}</div>
<div class="${p}-dropzone"><p>Drop photos or</p><button type="button" id="upload-iceland-album" data-action="primary">Upload to Iceland 2026</button></div>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Album grid + dropzone' }, primary: { selector: '#upload-iceland-album', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#upload-iceland-album'], 'Album thumbnails + dashed dropzone upload.', ['Album thumbs noise']);
});

register('forum-post', (spec) => {
  const p = 'df';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-thread{border-bottom:1px solid #ddd;padding:12px}.${p}-meta{color:#6b7280;font-size:12px}.${p}-pin{background:#fbbf24;border:0;padding:6px}</style></head><body>
<ul data-page="${spec.id}" role="main">
<li class="${p}-thread"><span class="${p}-meta">@bob · 2h</span><h3>Random topic</h3></li>
<li class="${p}-thread" data-thread="wci-feedback"><span class="${p}-meta">@alice · pinned?</span><h3>WCI specification feedback</h3>
<button type="button" class="${p}-pin" id="pin-wci-thread" data-action="primary">Pin thread</button></li>
</ul><button type="button" data-decoy="decoy-nav">New post</button>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Forum thread list' }, primary: { selector: '#pin-wci-thread', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'New post' }] }, ['#pin-wci-thread'], 'Forum thread list items with pin action.', ['New post decoy']);
});

register('dating-profile', (spec) => {
  const p = 'mm';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-profile{display:grid;grid-template-columns:300px 1fr;gap:24px;padding:24px}.${p}-photo{height:360px;background:linear-gradient(180deg,#fda4af,#fb7185);border-radius:16px}.${p}-msg{width:100%;padding:12px}</style></head><body>
<div class="${p}-profile" data-page="${spec.id}" role="main"><div class="${p}-photo"></div><div><h1>@river_kayak</h1><p>Kayaking · Photography</p>
<textarea class="${p}-msg" placeholder="Say hi…">Love your adventure photos!</textarea>
<button type="button" id="send-intro-river" data-action="primary">Send intro</button><button type="button" data-decoy="decoy-promo">Boost profile</button></div></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Dating profile view' }, primary: { selector: '#send-intro-river', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Boost profile' }] }, ['#send-intro-river'], 'Profile photo column + message compose.', ['Boost vs send']);
});

register('rental-car', (spec) => {
  const p = 'da';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-search{display:flex;gap:12px;padding:16px;background:#f1f5f9}.${p}-cars{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:16px}.${p}-car{border:1px solid #cbd5e1;padding:16px}</style></head><body>
<div data-page="${spec.id}"><form class="${p}-search"><input value="LAX" /><input type="date" /><select><option>Compact</option></select></form>
<div class="${p}-cars" role="main"><div class="${p}-car"><h3>Economy</h3><button type="button">Select</button></div>
<div class="${p}-car" data-vehicle="compact"><h3>Compact — Friday pickup</h3><button type="button" id="reserve-lax-compact" data-action="primary">Reserve</button></div></div>${TRACKING}</div></body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Car rental search + results' }, primary: { selector: '#reserve-lax-compact', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#reserve-lax-compact'], 'Search bar + car result cards grid.', ['Select vs Reserve']);
});

register('concert-tickets', (spec) => {
  const p = 'tr';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-venue{display:flex;gap:24px}.${p}-seating{flex:1;background:#1e1b4b;color:#fff;padding:24px;border-radius:12px}.${p}-tickets{width:280px}</style></head><body>
<div class="${p}-venue" data-page="${spec.id}" role="main"><section class="${p}-seating"><h1>Neon Pulse Tour</h1><p>GA Floor</p></section>
<aside class="${p}-tickets"><label>Qty <select id="qty"><option>2</option></select></label>
<button type="button" id="buy-neon-ga" data-action="primary">Buy 2 GA tickets</button><button type="button" data-decoy="decoy-promo">VIP upgrade</button></aside></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Concert venue + ticket panel' }, primary: { selector: '#buy-neon-ga', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'VIP upgrade' }] }, ['#buy-neon-ga'], 'Venue seating visual + ticket purchase aside.', ['VIP upsell']);
});

register('grocery-list', (spec) => {
  const p = 'fcart';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-list{list-style:none;padding:0}.${p}-item{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #eee}.${p}-add{background:#16a34a;color:#fff;border:0}</style></head><body>
<ul class="${p}-list" data-page="${spec.id}" role="main"><li class="${p}-item">Milk <button type="button">Remove</button></li>
<li class="${p}-item" data-item="avocados">Organic avocados <button type="button" class="${p}-add" id="add-avocados" data-action="primary">Add to family list</button></li>
</ul><a href="/share" data-decoy="decoy-nav">Share list</a>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Shared grocery list' }, primary: { selector: '#add-avocados', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Share list link' }] }, ['#add-avocados'], 'Grocery list UL with per-item actions.', ['Remove vs Add']);
});

register('pet-adoption', (spec) => {
  const p = 'pm';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-pet{display:flex;gap:20px;padding:24px}.${p}-img{width:200px;height:200px;background:#fcd34d;border-radius:50%}.${p}-apply{background:#ea580c;color:#fff;border:0;padding:12px 24px}</style></head><body>
<div class="${p}-pet" data-page="${spec.id}" role="main" data-pet="max"><div class="${p}-img"></div><div><h1>Max — Golden mix</h1><p>2 years · Good with kids</p>
<button type="button" class="${p}-apply" id="apply-adopt-max" data-action="primary">Submit adoption application</button></div></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Pet profile adoption' }, primary: { selector: '#apply-adopt-max', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#apply-adopt-max'], 'Pet profile hero image + apply CTA.', ['Single pet focus']);
});

register('scholarship-apply', (spec) => {
  const p = 'eg';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-form{max-width:640px;margin:32px auto}.${p}-section{margin-bottom:24px;border-left:4px solid #4f46e5;padding-left:16px}.${p}-submit{background:#4f46e5;color:#fff;border:0;padding:14px;width:100%}</style></head><body>
<form class="${p}-form" data-page="${spec.id}" role="main"><div class="${p}-section"><h2>Academic</h2><input type="text" placeholder="GPA" /></div>
<div class="${p}-section"><h2>STEM essay</h2><textarea rows="6"></textarea></div>
<button type="submit" class="${p}-submit" id="submit-stem-app" data-action="primary">Submit STEM application</button>
<button type="button" data-decoy="decoy-promo">Apply for fee waiver</button></form>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Scholarship multi-section form' }, primary: { selector: '#submit-stem-app', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Fee waiver' }] }, ['#submit-stem-app'], 'Multi-section scholarship application form.', ['Fee waiver decoy']);
});

register('wifi-setup', (spec) => {
  const p = 'nc';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-networks{list-style:none}.${p}-net{padding:16px;border:1px solid #ddd;margin:8px 0;display:flex;justify-content:space-between}.${p}-connect{background:#0284c7;color:#fff;border:0}</style></head><body>
<ul class="${p}-networks" data-page="${spec.id}" role="main">
<li class="${p}-net">Home_5G <span>Locked</span></li>
<li class="${p}-net" data-ssid="Guest_5G">Guest_5G <button type="button" class="${p}-connect" id="connect-guest-5g" data-action="primary">Connect</button></li>
</ul>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'WiFi network list' }, primary: { selector: '#connect-guest-5g', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#connect-guest-5g'], 'WiFi SSID list with connect buttons.', ['Locked vs guest network']);
});

register('invoice-pay', (spec) => {
  const p = 'bf';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-inv{width:100%;border-collapse:collapse}.${p}-inv .overdue{color:#dc2626;font-weight:bold}.${p}-pay{background:#15803d;color:#fff;border:0;padding:8px 16px}</style></head><body>
<table class="${p}-inv" data-page="${spec.id}" role="main"><thead><tr><th>Invoice</th><th>Due</th><th>Amount</th><th></th></tr></thead><tbody>
<tr><td>INV-2026-012</td><td>May 1</td><td>$200</td><td><button type="button">View</button></td></tr>
<tr class="overdue" data-inv="INV-2026-044"><td>INV-2026-044</td><td>Today</td><td>$1,420</td>
<td><button type="button" class="${p}-pay" id="pay-inv-044" data-action="primary">Pay now</button></td></tr>
</tbody></table><button type="button" data-decoy="decoy-nav">Export CSV</button>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Invoice table' }, primary: { selector: '#pay-inv-044', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Export CSV' }] }, ['#pay-inv-044'], 'Invoice payment table with overdue row.', ['View vs Pay']);
});

register('newsletter-sub', (spec) => {
  const p = 'pb';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-landing{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#18181b;color:#fff}.${p}-cta{background:#a855f7;border:0;padding:16px 32px;font-size:18px}</style></head><body>
<div class="${p}-landing" data-page="${spec.id}" role="main"><h1>AI Weekly Digest</h1><input type="email" placeholder="you@email.com" />
<button type="button" class="${p}-cta" id="subscribe-digest" data-action="primary">Subscribe to digest</button>
<button type="button" data-decoy="decoy-promo">Read sample issue</button></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Newsletter landing' }, primary: { selector: '#subscribe-digest', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Sample issue' }] }, ['#subscribe-digest'], 'Centered newsletter landing with email field.', ['Sample issue decoy']);
});

register('api-keys', (spec) => {
  const p = 'dc';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-console{display:grid;grid-template-columns:180px 1fr;min-height:100vh}.${p}-side{background:#0f172a;color:#94a3b8;padding:12px}.${p}-keys td{font-family:monospace}.${p}-rotate{background:#dc2626;color:#fff;border:0}</style></head><body>
<div class="${p}-console" data-page="${spec.id}"><nav class="${p}-side"><a href="/keys">API Keys</a><a href="/logs">Logs</a></nav>
<main role="main"><table class="${p}-keys"><tr><th>Name</th><th>Prefix</th><th></th></tr>
<tr><td>Staging</td><td>sk_test_…</td><td><button type="button">Reveal</button></td></tr>
<tr data-key="prod"><td>Production</td><td>sk_live_…</td><td><button type="button" class="${p}-rotate" id="rotate-prod-key" data-action="primary">Rotate key</button></td></tr>
</table></main></div>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Dev console API keys' }, primary: { selector: '#rotate-prod-key', wciId: spec.wciId, desc: spec.goal, action: 'click' } }, ['#rotate-prod-key'], 'Developer console sidebar + keys table.', ['Reveal vs Rotate']);
});

register('privacy-settings', (spec) => {
  const p = 'pd';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-settings{max-width:520px;margin:40px auto}.${p}-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid #e5e7eb}.${p}-switch{position:relative;width:48px;height:24px}</style></head><body>
<div class="${p}-settings" data-page="${spec.id}" role="main">
<div class="${p}-row"><span>Analytics</span><input type="checkbox" checked /></div>
<div class="${p}-row" data-setting="third-party"><span>Third-party data sharing</span>
<input type="checkbox" checked id="third-party-share" /><button type="button" id="disable-third-party" data-action="primary">Save &amp; disable sharing</button></div>
</div><button type="button" data-decoy="decoy-nav">Download my data</button>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Privacy toggle settings' }, primary: { selector: '#disable-third-party', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-nav"]', wciId: 'decoy-nav', desc: 'Download data' }] }, ['#disable-third-party'], 'Privacy settings rows with toggles.', ['Checkbox vs save button']);
});

register('bug-report', (spec) => {
  const p = 'it';
  const rawHtml = `<!DOCTYPE html><html><head><title>${spec.title}</title><style>.${p}-modal{position:fixed;inset:10% 20%;background:#fff;border:1px solid #333;box-shadow:0 8px 32px;padding:24px;z-index:10}.${p}-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4)}.${p}-file{background:#ef4444;color:#fff;border:0;padding:12px}</style></head><body>
<div class="${p}-overlay"></div><dialog class="${p}-modal" open data-page="${spec.id}" role="main"><h1>Report bug</h1>
<select><option>UI</option><option>Checkout</option></select><textarea>Checkout times out after 30s on mobile</textarea>
<button type="button" class="${p}-file" id="file-checkout-bug" data-action="primary">File bug report</button>
<button type="button" data-decoy="decoy-promo">Chat support instead</button></dialog>${TRACKING}</body></html>`;
  return pack(spec, rawHtml, { pageLandmark: { selector: `[data-page="${spec.id}"]`, wciId: `${slug(spec.id)}-page`, desc: 'Bug report modal' }, primary: { selector: '#file-checkout-bug', wciId: spec.wciId, desc: spec.goal, action: 'click' }, decoys: [{ selector: '[data-decoy="decoy-promo"]', wciId: 'decoy-promo', desc: 'Chat support' }] }, ['#file-checkout-bug'], 'Modal dialog overlay for bug filing.', ['Chat vs file']);
});

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
