/**
 * Shared DOM noise and styling for harder benchmark raw HTML.
 * Primary CTAs use generic labels + structural selectors (no goal-leaking ids).
 */

export const TRACKING = `<div class="px-track" style="position:absolute;width:1px;height:1px;overflow:hidden" aria-hidden="true"><img src="/px.gif" alt="" /></div>`;

export function slug(id) {
  return id.replace(/-/g, '_');
}

export function baseStyles(prefix) {
  return `
.${prefix}-app{font-family:system-ui,sans-serif;font-size:14px;color:#111}
.${prefix}-btn{display:inline-block;padding:8px 14px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;margin:4px;font-size:13px;border-radius:6px}
.${prefix}-btn--primary{background:#2563eb;color:#fff;border-color:#1d4ed8}
.${prefix}-btn--ghost{background:transparent;border-color:transparent;color:#475569}
.${prefix}-btn--decoy{background:#fef9c3;border-color:#fde047}
.${prefix}-btn--muted{background:#e2e8f0;color:#334155}
.${prefix}-cookie{position:fixed;bottom:0;left:0;right:0;background:#0f172a;color:#f8fafc;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;z-index:200;box-shadow:0 -4px 20px rgba(0,0,0,.15)}
.${prefix}-cookie p{flex:1;margin:0;font-size:13px}
.${prefix}-subnav{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0}
.${prefix}-subnav a{color:#475569;text-decoration:none;padding:6px 10px;font-size:12px}
.${prefix}-hdr{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb}
.${prefix}-nav a{margin-right:14px;color:#334155;font-size:13px}
.${prefix}-hdr-promo button{margin-left:6px}
.${prefix}-ftr{padding:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#64748b}
.${prefix}-rail{padding:12px;background:#fafafa;border-left:1px solid #e5e7eb;font-size:12px}
.${prefix}-rail--ads{background:#fffbeb}
.${prefix}-filler{padding:12px 16px;border-top:1px dashed #e2e8f0}
.${prefix}-filler-inner{display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow:hidden}
.${prefix}-ab{display:none}
.${prefix}-dup-row{display:flex;flex-wrap:wrap;gap:6px;padding:8px 0}
`;
}

export function pageOpen(prefix, title, pageId, layoutExtra = '') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title><style>${baseStyles(prefix)}${layoutExtra}</style></head><body>
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
  return (
    pageOpen(prefix, title, pageId, layoutExtra) +
    cookieConsent(prefix) +
    (withAb ? hiddenAbVariant(prefix) : '') +
    noiseHeader(prefix, title, decoyPromo) +
    secondaryNav(prefix, subnavExtra) +
    duplicateSubmitRow(prefix) +
    (keywordTrapLabels.length ? keywordDecoys(prefix, keywordTrapLabels) : '') +
    mainHtml +
    (withAside ? noiseAside(prefix) : '') +
    fillerInteractives(prefix, fillerCount) +
    `<button type="button" class="${prefix}-btn ${prefix}-btn--decoy" data-decoy="decoy-extra" aria-hidden="true" tabindex="-1" style="position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden">Hidden promo</button>` +
    noiseFooter(prefix, title) +
    pageClose()
  );
}
