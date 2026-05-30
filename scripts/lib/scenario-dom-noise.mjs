/**
 * Shared DOM noise and styling for harder benchmark raw HTML.
 * Primary CTAs use generic labels + structural selectors (no goal-leaking ids).
 */

export const TRACKING = `<div class="px-track" style="position:absolute;width:1px;height:1px;overflow:hidden" aria-hidden="true"><img src="/px.gif" alt="" /></div>`;

export function slug(id) {
  return id.replace(/-/g, '_');
}

/** Stable accent per scenario prefix (visual variety, same DOM). */
function themeAccent(prefix) {
  const hues = [221, 262, 199, 24, 330, 173, 291, 142];
  let h = 0;
  for (let i = 0; i < prefix.length; i++) h = (h + prefix.charCodeAt(i) * 17) % hues.length;
  const hue = hues[h];
  return {
    primary: `hsl(${hue} 72% 46%)`,
    primaryDark: `hsl(${hue} 72% 38%)`,
    soft: `hsl(${hue} 60% 96%)`,
    border: `hsl(${hue} 35% 88%)`,
  };
}

const CSS_RESET = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0}
img,svg{max-width:100%;vertical-align:middle}
button{cursor:pointer}
a{color:inherit}
ul,ol{margin:0;padding:0}
table{border-collapse:collapse}
`;

export function baseStyles(prefix) {
  const t = themeAccent(prefix);
  const p = prefix;
  return `${CSS_RESET}
.${p}-app{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.45;color:#0f172a;background:#f1f5f9;min-height:100vh}
.${p}-hdr{background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.${p}-hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;flex-wrap:wrap;gap:12px}
.${p}-nav{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.${p}-nav a{margin-right:0;color:#475569;text-decoration:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500}
.${p}-nav a:hover{background:#f1f5f9;color:#0f172a}
.${p}-hdr-promo{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.${p}-subnav{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 20px;background:#fff;border-bottom:1px solid #e2e8f0}
.${p}-subnav a{color:#64748b;text-decoration:none;padding:6px 10px;font-size:12px;border-radius:4px}
.${p}-subnav a:hover{background:#f8fafc;color:#334155}
.${p}-dup-row{display:flex;flex-wrap:wrap;gap:8px;padding:10px 20px;background:#fafafa;border-bottom:1px solid #f1f5f9}
.${p}-page-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,260px);gap:0;align-items:start;background:#fff;border-top:1px solid #e2e8f0}
@media(max-width:900px){.${p}-page-wrap{grid-template-columns:1fr}}
.${p}-page-main{padding:20px 24px 32px;min-height:42vh}
.${p}-page-main>h1,.${p}-page-main [role=main]>h1,.${p}-page-main main>h1{font-size:22px;font-weight:700;margin:0 0 16px;color:#0f172a}
.${p}-page-main h2,.${p}-page-main h3{margin:12px 0 8px;font-weight:600;color:#1e293b}
.${p}-page-main p{margin:0 0 10px;color:#475569;max-width:65ch}
.${p}-page-main label{display:block;margin:10px 0 6px;font-size:13px;font-weight:500;color:#334155}
.${p}-page-main input:not([type=checkbox]):not([type=radio]):not([type=hidden]),.${p}-page-main select,.${p}-page-main textarea{
  display:block;width:100%;max-width:480px;margin-top:4px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-size:14px;color:#0f172a}
.${p}-page-main input:focus,.${p}-page-main select:focus,.${p}-page-main textarea:focus{outline:2px solid ${t.primary};outline-offset:1px;border-color:${t.primary}}
.${p}-page-main fieldset{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:12px 0;background:#f8fafc}
.${p}-page-main legend{font-weight:600;padding:0 6px;font-size:13px}
.${p}-page-main table{width:100%;margin:12px 0;font-size:13px}
.${p}-page-main th,.${p}-page-main td{padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
.${p}-page-main th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:600}
.${p}-page-main tr:hover td{background:#fafafa}
.${p}-page-main article,.${p}-page-main .${p}-card,.${p}-page-main .${p}-resto,.${p}-page-main .${p}-slot,.${p}-page-main .${p}-tile{
  border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:10px 0;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.${p}-page-main ul:not([class]){list-style:none;padding:0}
.${p}-page-main ul:not([class]) li{padding:8px 10px;border-radius:6px;margin:4px 0}
.${p}-page-main ul:not([class]) li:hover{background:#f8fafc}
.${p}-page-main dialog,.${p}-page-main .${p}-modal{
  border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fff;box-shadow:0 20px 40px rgba(15,23,42,.15)}
.${p}-page-main .${p}-modal.is-open,.${p}-page-main [role=dialog]{position:fixed;inset:15% 25%;z-index:60;max-width:520px;margin:auto}
.${p}-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;margin:4px 4px 4px 0;font-size:13px;font-weight:500;border-radius:8px;transition:background .12s,border-color .12s}
.${p}-btn:hover{background:#f8fafc}
.${p}-btn--primary{background:${t.primary};color:#fff;border-color:${t.primaryDark}}
.${p}-btn--primary:hover{filter:brightness(1.05)}
.${p}-btn--ghost{background:transparent;border-color:transparent;color:#475569}
.${p}-btn--ghost:hover{background:#f1f5f9;color:#0f172a}
.${p}-btn--decoy{background:#fef9c3;border-color:#fde047;color:#713f12}
.${p}-btn--muted{background:#e2e8f0;color:#334155;border-color:#cbd5e1}
.${p}-btn:disabled{opacity:.5;cursor:not-allowed}
.${p}-cookie{position:fixed;bottom:0;left:0;right:0;background:#0f172a;color:#f8fafc;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;z-index:200;box-shadow:0 -4px 20px rgba(0,0,0,.2)}
.${p}-cookie p{flex:1;margin:0;font-size:13px;min-width:200px}
.${p}-rail{padding:16px;margin:16px;background:${t.soft};border:1px solid ${t.border};border-radius:12px;font-size:13px;color:#334155;line-height:1.5}
@media(min-width:901px){.${p}-rail{border-left:1px solid #e2e8f0;border-radius:0;margin:16px 16px 16px 0;background:#fffbeb}}
.${p}-rail--ads strong{display:block;margin-bottom:8px;color:#92400e}
.${p}-rail a{color:#b45309;font-weight:500}
.${p}-ftr{padding:16px 20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;background:#fff}
.${p}-ftr a{color:#475569;margin-right:8px}
.${p}-filler{padding:12px 20px;border-top:1px dashed #e2e8f0;background:#fafafa}
.${p}-filler-inner{display:flex;flex-wrap:wrap;gap:4px;max-height:100px;overflow:hidden;opacity:.7}
.${p}-ab{display:none!important}
.${p}-layout{display:grid;gap:16px;align-items:start}
.${p}-filters,.${p}-frame aside:first-child{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
.${p}-filters h2,.${p}-frame aside h2{font-size:14px;margin:0 0 10px}
.${p}-card__actions,.${p}-slot__actions,.${p}-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
.${p}-wizard{max-width:760px}
.${p}-steps{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
.${p}-step{flex:1;min-width:80px;padding:10px 8px;background:#e2e8f0;text-align:center;border-radius:8px;font-size:12px;font-weight:500;color:#64748b}
.${p}-step.is-active{background:${t.primary};color:#fff}
.${p}-panel{border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fff}
.${p}-hero{border-radius:12px;margin-bottom:8px}
.${p}-row{display:flex;gap:12px;overflow-x:auto;padding:8px 0}
.${p}-grid{display:grid;gap:14px}
.${p}-cart{border:1px solid #fed7aa;background:#fff7ed;border-radius:12px}
.${p}-inbox tr.unread td{font-weight:600;background:#eff6ff}
.${p}-patient{border-radius:10px}
.${p}-slots{display:grid;gap:10px}
.${p}-week{background:#e2e8f0;border-radius:8px;overflow:hidden}
.${p}-cell{background:#fff;padding:8px;min-height:44px}
.${p}-edit textarea{width:100%;min-height:200px;font-family:ui-monospace,monospace;font-size:13px}
.${p}-diff{border-radius:8px}
.${p}-toolbar{background:#f8fafc;border-radius:8px 8px 0 0;padding:10px;border:1px solid #e2e8f0;border-bottom:none}
`;
}

export function pageOpen(prefix, title, pageId, layoutExtra = '') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>${baseStyles(prefix)}${layoutExtra}</style></head><body>
<div class="${prefix}-app" data-page="${pageId}">`;
}

export function pageClose() {
  return `${TRACKING}</div></body></html>`;
}

export function cookieConsent(prefix) {
  return `<div class="${prefix}-cookie" role="dialog" aria-label="Cookie preferences">
  <p>We use cookies for analytics, personalization, and ads. Manage preferences or accept to continue.</p>
  <button type="button" class="${prefix}-btn ${prefix}-btn--muted">Reject non-essential</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--primary">Accept all</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Customize</button>
</div>`;
}

export function hiddenAbVariant(prefix) {
  return `<div class="${prefix}-ab" data-experiment="checkout-v3" data-variant="B" aria-hidden="true">
  <button type="button" class="${prefix}-btn ${prefix}-btn--primary">COMPLETE ORDER NOW</button>
  <button type="button" class="${prefix}-btn">Continue as guest — express</button>
</div>`;
}

export function duplicateSubmitRow(prefix) {
  return `<div class="${prefix}-dup-row" aria-label="Quick actions">
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Submit</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Continue</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Save changes</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Confirm</button>
</div>`;
}

export function noiseHeader(prefix, title, decoyPromo = true) {
  return `<header class="${prefix}-hdr">
  <nav class="${prefix}-nav" aria-label="Global"><a href="/">Home</a><a href="/help">Help</a><a href="/blog">Blog</a><a href="/account">Account</a></nav>
  <div class="${prefix}-hdr-promo">${decoyPromo ? `<button type="button" class="${prefix}-btn ${prefix}-btn--decoy" data-decoy="decoy-promo">Claim Offer</button>` : ''}
    <button type="button" class="${prefix}-btn ${prefix}-btn--ghost" data-decoy="decoy-nav">Learn More</button></div>
</header>`;
}

export function secondaryNav(prefix, extraLabels = []) {
  const defaults = ['Overview', 'Reports', 'Settings', 'Billing', 'Support'];
  const labels = [...defaults, ...extraLabels].slice(0, 12);
  return `<nav class="${prefix}-subnav" aria-label="Secondary">${labels.map((l) => `<a href="#">${l}</a>`).join('')}
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Submit</button>
  <button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Continue</button>
</nav>`;
}

export function noiseFooter(prefix, title) {
  return `<footer class="${prefix}-ftr"><small>© Demo ${title}</small> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
  <span> · Sponsored content may appear in feeds.</span></footer>`;
}

export function noiseAside(prefix) {
  return `<aside class="${prefix}-rail ${prefix}-rail--ads" aria-label="Sponsored">
  <div><strong>Sponsored</strong></div>
  <a href="/ads/1">Partner offer — limited time</a><br/>
  <button type="button" class="${prefix}-btn ${prefix}-btn--decoy" data-decoy="decoy-promo">View deal</button>
</aside>`;
}

/** Many low-value interactives (pushes primary CTAs later in candidate lists). */
export function fillerInteractives(prefix, count = 48) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const kind = i % 4;
    if (kind === 0) items.push(`<a href="/misc/${i}" class="${prefix}-btn ${prefix}-btn--ghost">Link ${i + 1}</a>`);
    else if (kind === 1) items.push(`<button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Action ${i + 1}</button>`);
    else if (kind === 2) items.push(`<button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Submit</button>`);
    else items.push(`<button type="button" class="${prefix}-btn ${prefix}-btn--ghost">Continue</button>`);
  }
  return `<div class="${prefix}-filler" aria-hidden="true"><div class="${prefix}-filler-inner">${items.join('')}</div></div>`;
}

/** Keyword-rich decoy CTAs that confuse raw-html keyword heuristics. */
export function keywordDecoys(prefix, labels) {
  return `<div class="${prefix}-dup-row">${labels
    .map((text, i) => {
      const decoy = i === 0 ? 'decoy-promo' : i === 1 ? 'decoy-nav' : 'decoy-extra';
      return `<button type="button" class="${prefix}-btn ${prefix}-btn--decoy" data-decoy="${decoy}">${text}</button>`;
    })
    .join('')}</div>`;
}

export function shell(prefix, title, pageId, mainHtml, opts = {}) {
  const {
    layoutExtra = '',
    decoyPromo = true,
    subnavExtra = [],
    keywordTrapLabels = [],
    fillerCount = 44,
    withAside = true,
    withAb = true,
  } = opts;
  const pageBody =
    `<div class="${prefix}-page-wrap"><div class="${prefix}-page-main">${mainHtml}</div>` +
    (withAside ? noiseAside(prefix) : '') +
    `</div>`;
  return (
    pageOpen(prefix, title, pageId, layoutExtra) +
    cookieConsent(prefix) +
    (withAb ? hiddenAbVariant(prefix) : '') +
    noiseHeader(prefix, title, decoyPromo) +
    secondaryNav(prefix, subnavExtra) +
    duplicateSubmitRow(prefix) +
    (keywordTrapLabels.length ? keywordDecoys(prefix, keywordTrapLabels) : '') +
    pageBody +
    fillerInteractives(prefix, fillerCount) +
    `<button type="button" class="${prefix}-btn ${prefix}-btn--decoy" data-decoy="decoy-extra" aria-hidden="true" tabindex="-1" style="position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden">Hidden promo</button>` +
    noiseFooter(prefix, title) +
    pageClose()
  );
}
