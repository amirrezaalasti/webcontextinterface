/**
 * Embedded CSS for the five hand-authored legacy benchmark scenarios.
 * Injected into raw.html / annotated.html — does not change DOM or eval selectors.
 */

const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.45}
img{max-width:100%;height:auto}
svg{display:inline-block;vertical-align:middle}
button,input,select,textarea{font:inherit}
a{text-decoration:none}
ul,ol{margin:0;padding:0;list-style:none}
h1,h2,h3,h4,p{margin:0}
`;

function btn(p, primary = '#2563eb', ghost = 'transparent') {
  return `
.${p}-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#f1f5f9;color:#0f172a;font-size:13px;font-weight:500;cursor:pointer}
.${p}-btn--primary{background:${primary};border-color:${primary};color:#fff}
.${p}-btn--ghost,.${p}-btn--link{background:${ghost};border-color:transparent;color:inherit}
.${p}-btn--outline{background:transparent;border-color:currentColor}
.${p}-btn--sm{padding:6px 10px;font-size:12px}
.${p}-btn--full{width:100%}
.${p}-btn:disabled{opacity:.45;cursor:not-allowed}
`;
}

export const LEGACY_STYLES = {
  'flight-booking': `${BASE}
.sw-root,.sw-theme-dark{--bg:#0c1222;--panel:#151d2e;--text:#e8edf5;--muted:#94a3b8;--line:#2a3548;--accent:#38bdf8;background:var(--bg);color:var(--text);min-height:100vh}
.sw-container{max-width:1200px;margin:0 auto;padding:0 20px}
.sw-hdr{background:linear-gradient(180deg,#0f172a,#0c1222);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.sw-hdr__inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;flex-wrap:wrap}
.sw-hdr__logo{display:flex;align-items:center;gap:10px;color:var(--text);font-weight:700}
.sw-hdr__logo-img{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#38bdf8,#6366f1)}
.sw-hdr__nav-list{display:flex;gap:8px;flex-wrap:wrap}
.sw-hdr__nav-link{color:var(--muted);padding:8px 12px;border-radius:6px;font-size:13px}
.sw-hdr__nav-link:hover{color:var(--text);background:rgba(255,255,255,.06)}
.sw-hdr__right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sw-search-bar{background:var(--panel);border-bottom:1px solid var(--line)}
.sw-search-bar__inner{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;gap:12px;flex-wrap:wrap}
.sw-search-bar__route{font-weight:600;font-size:15px}
.sw-search-bar__sep,.sw-breadcrumbs{color:var(--muted);margin:0 6px}
.sw-main{padding:20px 0 48px}
.sw-results__layout{display:grid;grid-template-columns:260px 1fr;gap:24px;align-items:start}
@media(max-width:900px){.sw-results__layout{grid-template-columns:1fr}}
.sw-filters{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}
.sw-filters__title{font-size:15px;font-weight:600;margin-bottom:12px}
.sw-filter-group{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.sw-filter-check{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--muted)}
.sw-filter-check__count{margin-left:auto;color:var(--muted);font-size:12px}
.sw-result-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;margin-bottom:14px;overflow:hidden}
.sw-result-card--promo{border-color:#f59e0b;background:linear-gradient(135deg,#1c1917,#151d2e)}
.sw-result-card__inner{padding:16px;display:grid;gap:14px}
.sw-result-card__inner{display:flex;flex-wrap:wrap;align-items:center;gap:16px}
.sw-airline-logo{width:40px;height:40px;border-radius:8px;background:#334155}
.sw-result-card__fares{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}
.sw-fare-btn{display:flex;flex-direction:column;align-items:flex-start;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:#0f172a;color:var(--text);min-width:100px}
.sw-fare-btn--economy{border-color:var(--accent)}
.sw-fare-btn__price{font-size:18px;font-weight:700}
.sw-fare-btn__basis{font-size:11px;color:var(--muted)}
.sw-sort-bar{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.sw-promo-banner{background:linear-gradient(90deg,#1e3a5f,#312e81);border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
${btn('sw', '#0ea5e9')}
`,

  banking: `${BASE}
.np-app{background:#0b0f1a;color:#e8edf5;min-height:100vh}
.np-layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
@media(max-width:900px){.np-layout{grid-template-columns:1fr}}
.np-sidebar{background:#111827;border-right:1px solid #1f2937;padding:16px 12px;display:flex;flex-direction:column;gap:12px}
.np-sidebar__logo{display:flex;align-items:center;gap:10px;padding:8px;font-weight:700}
.np-logo-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#14b8a6)}
.np-sidebar__link{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:#94a3b8;font-size:13px}
.np-sidebar__item--active .np-sidebar__link{background:#1e293b;color:#f8fafc}
.np-icon{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
.np-main{padding:20px 24px 40px;overflow-x:auto}
.np-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.np-topbar__title{font-size:22px;font-weight:700}
.np-topbar__date{color:#64748b;font-size:13px}
.np-topbar__search{padding:8px 12px 8px 36px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;min-width:220px}
.np-accounts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:24px}
.np-account-card{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:18px}
.np-account-card__balance-amount{font-size:24px;font-weight:700;margin:8px 0 12px}
.np-account-card__type,.np-account-card__balance-label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
.np-quick-transfer{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px;margin-bottom:24px}
.np-quick-transfer__form{display:grid;gap:14px;max-width:480px}
.np-form-row label{display:block;font-size:12px;color:#94a3b8;margin-bottom:6px}
.np-form-row select,.np-form-row input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#f1f5f9}
.np-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center}
.np-overlay__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6)}
.np-overlay__panel{position:relative;background:#1e293b;border-radius:12px;padding:24px;max-width:400px;border:1px solid #334155}
.np-toast-stack{position:fixed;top:16px;right:16px;z-index:80;max-width:360px}
.np-toast{display:flex;gap:12px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:8px}
${btn('np', '#22c55e')}
`,

  checkout: `${BASE}
.vc-app{background:#f1f5f9;color:#0f172a;min-height:100vh}
.vc-header{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:16px 0}
.vc-header__inner{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.vc-container{max-width:1100px;margin:0 auto;padding:0 20px}
.vc-header__steps{display:flex;gap:8px;flex-wrap:wrap}
.vc-step{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.15);font-size:12px}
.vc-step--active,.vc-step--done{background:rgba(255,255,255,.28);font-weight:600}
.vc-checkout-main{padding:28px 0 48px}
.vc-checkout-layout{display:grid;grid-template-columns:1fr 340px;gap:28px;align-items:start}
@media(max-width:900px){.vc-checkout-layout{grid-template-columns:1fr}}
.vc-checkout-section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.vc-checkout-section__title{font-size:16px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.vc-checkout-section__num{width:24px;height:24px;border-radius:50%;background:#eef2ff;color:#4f46e5;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.vc-form-row{margin-bottom:12px}
.vc-label{display:block;font-size:12px;font-weight:500;color:#64748b;margin-bottom:6px}
.vc-input,.vc-select{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
.vc-form-row--half,.vc-form-row--third{display:grid;gap:12px}
.vc-form-row--half{grid-template-columns:1fr 1fr}
.vc-form-row--third{grid-template-columns:2fr 1fr 1fr}
.vc-address-card{display:flex;gap:12px;width:100%;text-align:left;padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;cursor:pointer}
.vc-address-card--selected{border-color:#4f46e5;background:#eef2ff}
.vc-shipping-opt{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer;background:#fff}
.vc-shipping-opt__price{margin-left:auto;font-weight:600}
.vc-order-summary{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;position:sticky;top:16px}
.vc-order-summary__title{font-size:16px;font-weight:600;margin-bottom:14px}
.vc-order-line{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#475569}
.vc-order-line--total{font-weight:700;font-size:16px;color:#0f172a;border-top:1px solid #e2e8f0;margin-top:8px;padding-top:12px}
${btn('vc', '#4f46e5')}
.vc-btn--jumbo{padding:14px 24px;font-size:15px}
`,

  'social-feed': `${BASE}
.cb-app{background:#000;color:#e7e9ea;min-height:100vh}
.cb-layout{display:grid;grid-template-columns:72px minmax(0,600px) minmax(260px,1fr);max-width:1280px;margin:0 auto;min-height:100vh}
@media(max-width:1000px){.cb-layout{grid-template-columns:72px 1fr}}
.cb-sidebar--left{border-right:1px solid #2f3336;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:8px}
.cb-sidebar--right{border-left:1px solid #2f3336;padding:16px;display:none}
@media(min-width:1000px){.cb-sidebar--right{display:block}}
.cb-sidebar__nav-item a{display:flex;align-items:center;gap:12px;padding:12px;border-radius:999px;color:#e7e9ea;font-size:15px}
.cb-sidebar__nav-item--active a{font-weight:700;background:rgba(231,233,234,.1)}
.cb-sidebar__nav svg{width:26px;height:26px;stroke:currentColor;fill:none}
.cb-logo-icon{width:40px;height:40px;border-radius:12px;background:#1d9bf0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
.cb-main{border-right:1px solid #2f3336;min-height:100vh}
.cb-stories{border-bottom:1px solid #2f3336;padding:12px 16px;overflow-x:auto}
.cb-stories__scroll{display:flex;gap:14px}
.cb-story{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;color:#e7e9ea;font-size:11px;cursor:pointer}
.cb-story__avatar{width:56px;height:56px;border-radius:50%;border:2px solid #1d9bf0;background:#16181c;display:flex;align-items:center;justify-content:center}
.cb-compose{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #2f3336}
.cb-compose__input{width:100%;min-height:56px;border:none;background:transparent;color:#e7e9ea;resize:none;font-size:18px}
.cb-compose__input:focus{outline:none}
.cb-compose__actions{display:flex;align-items:center;gap:8px;margin-top:8px}
.cb-post{padding:14px 16px;border-bottom:1px solid #2f3336}
.cb-post--sponsored{background:rgba(29,155,240,.06)}
.cb-post__header{display:flex;gap:10px;margin-bottom:8px}
.cb-post__avatar{width:40px;height:40px;border-radius:50%;background:#333}
.cb-post__author{font-weight:700;color:#e7e9ea}
.cb-post__handle,.cb-post__time,.cb-post__sep{color:#71767b;font-size:14px}
.cb-post__body p{margin-bottom:8px;font-size:15px}
.cb-post__actions{display:flex;justify-content:space-between;max-width:360px;margin-top:8px}
.cb-post__action-btn{display:flex;align-items:center;gap:6px;background:none;border:none;color:#71767b;font-size:13px;padding:6px;cursor:pointer}
.cb-post__action-btn:hover{color:#1d9bf0}
.cb-replies{margin-left:24px;border-left:2px solid #2f3336;padding-left:12px;margin-top:8px}
.cb-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}
.cb-overlay__backdrop{position:absolute;inset:0;background:rgba(91,112,131,.4)}
.cb-overlay__panel{position:relative;background:#000;border-radius:16px;padding:28px 32px;max-width:400px;text-align:center;border:1px solid #2f3336}
.cb-overlay__actions{display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap}
.cb-hidden{display:none!important}
.cb-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;background:#1d9bf0;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.cb-search-input{width:100%;padding:10px 14px;border-radius:999px;border:none;background:#202327;color:#e7e9ea}
.cb-trending,.cb-suggestions{background:#16181c;border-radius:16px;padding:14px;margin-bottom:16px}
.cb-sidebar__section-title{font-size:18px;font-weight:800;margin-bottom:12px}
${btn('cb', '#1d9bf0', 'transparent')}
.cb-btn--ghost{color:#e7e9ea}
`,

  'admin-dashboard': `${BASE}
.qc-app{background:#f4f6f9;color:#1e293b;min-height:100vh}
.qc-layout{display:grid;grid-template-columns:280px minmax(0,1fr) minmax(300px,340px);min-height:100vh;max-width:1680px;margin:0 auto}
@media(max-width:1200px){.qc-layout{grid-template-columns:280px 1fr}.qc-panel--right{display:none}}
.qc-sidebar{background:#fff;border-right:1px solid #e2e8f0;padding:16px 12px}
.qc-main{padding:24px 28px 48px;overflow-x:auto}
.qc-kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:24px}
.qc-kpi-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;display:flex;gap:14px;min-height:100px}
.qc-kpi-card__value{font-size:24px;font-weight:700}
.qc-dashboard-row{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;margin-bottom:24px}
.qc-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px}
.qc-recent-deals{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;overflow-x:auto}
.qc-table{width:100%;border-collapse:collapse;font-size:13px}
.qc-hidden{display:none!important}
.qc-shortcuts-overlay,.qc-export-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}
${btn('qc', '#6366f1')}
.qc-btn--danger{background:#fef2f2;border-color:#fecaca;color:#dc2626}
`,
};

const STYLE_MARKER = 'data-wci-legacy-styles';

/**
 * @param {string} html
 * @param {string} scenarioId
 * @returns {string}
 */
export function injectLegacyStyles(html, scenarioId) {
  const css = LEGACY_STYLES[scenarioId];
  if (!css) return html;
  if (html.includes(STYLE_MARKER)) {
    return html.replace(
      new RegExp(`<style[^>]*${STYLE_MARKER}[^>]*>[\\s\\S]*?</style>`, 'i'),
      `<style ${STYLE_MARKER}="1">${css}</style>`
    );
  }
  const styleTag = `<style ${STYLE_MARKER}="1">${css}</style>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(
      /<html([^>]*)>/i,
      `<html$1><head><meta charset="utf-8"/>${styleTag}</head>`
    );
  }
  return `${styleTag}${html}`;
}

export const LEGACY_STYLE_IDS = Object.keys(LEGACY_STYLES);
