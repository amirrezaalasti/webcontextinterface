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
.sw-root,.sw-theme-light{--bg:#fff;--panel:#f8f9fa;--text:#202124;--muted:#5f6368;--line:#dadce0;--accent:#1a73e8;--accent-soft:#e8f0fe;background:var(--bg);color:var(--text);min-height:100vh}
.sw-hidden{display:none!important}
.sw-container{max-width:1240px;margin:0 auto;padding:0 24px}
.sw-hdr{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.sw-hdr__inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 24px;flex-wrap:wrap}
.sw-hdr__logo{display:flex;align-items:center;gap:10px;color:var(--text);font-weight:500;font-size:22px}
.sw-hdr__logo-img{width:28px;height:28px;border-radius:50%;background:conic-gradient(#4285f4 0 25%,#ea4335 25% 50%,#fbbc04 50% 75%,#34a853 75%)}
.sw-hdr__nav-list{display:flex;gap:4px;flex-wrap:wrap}
.sw-hdr__nav-link{color:var(--muted);padding:8px 14px;border-radius:999px;font-size:14px}
.sw-hdr__nav-link:hover{color:var(--text);background:var(--panel)}
.sw-hdr__right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sw-hdr__nav-item{position:relative}
.sw-hdr__nav-item--has-mega.is-open .sw-mega{display:block}
.sw-mega{display:none;position:absolute;top:100%;left:0;min-width:720px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.12);padding:16px;z-index:60}
.sw-mega__inner{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.sw-mega__heading{font-size:12px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;letter-spacing:.04em}
.sw-mega__col a{display:block;padding:6px 0;color:var(--text);font-size:13px}
.sw-mega__col a:hover{color:var(--accent)}
.sw-mega__promo-card{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--panel)}
.sw-mega__promo-text{display:block;font-size:12px;margin:8px 0}
.sw-mega__promo-cta{color:var(--accent);font-weight:600;font-size:13px}
.sw-search-panel{background:var(--panel);border-bottom:1px solid var(--line);padding:14px 0}
.sw-search-panel__collapsed{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:999px;padding:10px 18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sw-search-bar__summary{display:flex;align-items:center;flex-wrap:wrap;gap:2px;font-size:14px}
.sw-search-bar__route{font-weight:600}
.sw-search-bar__sep,.sw-breadcrumbs{color:var(--muted);margin:0 6px}
.sw-search-form{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.sw-search-form__trip{display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap}
.sw-trip-type{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer}
.sw-search-form__grid{display:grid;grid-template-columns:1fr auto 1fr repeat(4,minmax(120px,1fr));gap:10px;align-items:end}
@media(max-width:1000px){.sw-search-form__grid{grid-template-columns:1fr 1fr}}
.sw-field{display:flex;flex-direction:column;gap:4px;position:relative}
.sw-field label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.sw-field input,.sw-field select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--text)}
.sw-field input:focus,.sw-field select:focus{outline:2px solid var(--accent-soft);border-color:var(--accent)}
.sw-field--airport input{padding-right:42px}
.sw-field__code{position:absolute;right:10px;bottom:10px;font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-soft);padding:2px 6px;border-radius:4px}
.sw-swap-btn{align-self:end;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--accent);margin-bottom:2px}
.sw-suggest{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:40;max-height:220px;overflow:auto;margin-top:4px}
.sw-suggest li{padding:10px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.sw-suggest li:hover{background:var(--accent-soft)}
.sw-suggest__tag{font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}
.sw-suggest__sub{font-size:11px;color:var(--muted)}
.sw-page.sw-hidden{display:none!important}
.sw-hero{padding:48px 24px 32px;text-align:center}
.sw-hero__title{font-size:42px;font-weight:400;margin-bottom:8px}
.sw-hero__sub{color:var(--muted);max-width:560px;margin:0 auto 24px;font-size:16px}
.sw-hero__actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.sw-hero__cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;max-width:720px;margin:0 auto}
.sw-hero-card{text-align:left;padding:16px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer}
.sw-hero-card:hover{border-color:var(--accent);box-shadow:0 2px 8px rgba(26,115,232,.12)}
.sw-hero-card__route{display:block;font-weight:600;margin-bottom:4px}
.sw-hero-card__price{font-size:13px;color:var(--accent)}
.sw-subpage{padding:32px 0 48px;max-width:880px}
.sw-subpage h1{font-size:28px;font-weight:500;margin-bottom:8px}
.sw-subpage p{color:var(--muted);margin-bottom:20px}
.sw-subpage--narrow{max-width:420px}
.sw-subpage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:20px}
.sw-subpage-card{padding:18px;border:1px solid var(--line);border-radius:12px;background:#fff;text-align:left}
.sw-subpage-card--click{cursor:pointer;width:100%;font:inherit;color:inherit}
.sw-subpage-card--click:hover{border-color:var(--accent)}
.sw-subpage-card h3{font-size:16px;margin-bottom:6px}
.sw-deals-list{margin:0 0 20px;padding-left:20px;color:var(--text)}
.sw-deals-list li{margin-bottom:8px}
.sw-signin-form{display:flex;flex-direction:column;gap:14px;margin-top:16px}
.sw-fare-btn--active-cabin,.sw-fare-btn:not(.sw-hidden).sw-fare-btn--economy{border-color:var(--accent)}
.sw-hdr__nav-link.sw-nav--active{background:var(--accent-soft);color:var(--accent)}
.sw-search-form__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
.sw-date-bar{display:flex;align-items:center;gap:8px;padding:16px 24px 0}
.sw-date-bar__nav{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--muted)}
.sw-date-bar__track{display:flex;gap:8px;overflow-x:auto;flex:1;padding-bottom:4px}
.sw-date-bar__day{min-width:88px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff;cursor:pointer;text-align:center}
.sw-date-bar__day--active{border-color:var(--accent);background:var(--accent-soft)}
.sw-date-bar__dow{display:block;font-size:11px;color:var(--muted)}
.sw-date-bar__date{display:block;font-size:13px;font-weight:600;margin:2px 0}
.sw-date-bar__price{display:block;font-size:12px;color:var(--accent);font-weight:600}
.sw-main{padding:20px 0 48px}
.sw-breadcrumbs{font-size:13px;margin-bottom:12px}
.sw-breadcrumbs__list{display:flex;gap:6px;flex-wrap:wrap}
.sw-statusbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;font-size:14px}
.sw-smoke-status{font-size:12px;color:var(--muted);margin-top:4px}
.sw-active-filters{display:flex;gap:8px;flex-wrap:wrap}
.sw-chip{display:inline-flex;padding:4px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:500}
.sw-promo-banner{background:linear-gradient(90deg,#e8f0fe,#fef7e0);border:1px solid #fde293;border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sw-results__layout{display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start}
@media(max-width:900px){.sw-results__layout{grid-template-columns:1fr}}
.sw-filters{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;position:sticky;top:72px}
.sw-filters__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sw-filters__title{font-size:16px;font-weight:600}
.sw-filter-group{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.sw-filter-group__toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;padding:0;font-weight:600;font-size:14px;cursor:pointer;color:var(--text)}
.sw-filter-check{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text)}
.sw-filter-check__count{margin-left:auto;color:var(--muted);font-size:12px}
.sw-filter-subhead{font-size:12px;color:var(--muted);margin-bottom:8px}
.sw-range-slider{position:relative;height:28px;margin:8px 0}
.sw-range-slider__track{position:absolute;top:50%;left:0;right:0;height:4px;background:var(--line);border-radius:999px;transform:translateY(-50%)}
.sw-range-slider__fill{position:absolute;top:0;bottom:0;background:var(--accent);border-radius:999px}
.sw-range-slider__input{position:absolute;width:100%;top:0;height:28px;opacity:0;cursor:pointer}
.sw-range-slider__labels{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.sw-muted{font-size:12px;color:var(--muted);margin-top:8px}
.sw-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sw-time-btn{padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:11px;cursor:pointer;text-align:center}
.sw-time-btn--active{border-color:var(--accent);background:var(--accent-soft)}
.sw-sponsored-label{font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:.05em}
.sw-sponsored-card{margin-top:8px;padding:10px;border:1px dashed var(--line);border-radius:8px;font-size:12px}
.sw-sort-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.sw-sort-bar__count{font-size:14px;color:var(--muted)}
.sw-sort-bar__select{padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:#fff}
.sw-result-card{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:12px;overflow:hidden;transition:box-shadow .15s}
.sw-result-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
.sw-result-card--highlight{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.sw-result-card--promo{border-color:#f9ab00;background:#fffbf0}
.sw-result-card--partner{border-style:dashed;background:var(--panel)}
.sw-result-card__inner{padding:16px;display:flex;flex-wrap:wrap;align-items:center;gap:16px}
.sw-airline-logo{width:32px;height:32px;border-radius:50%;background:#dadce0;flex-shrink:0}
.sw-airline-logo--sw{background:linear-gradient(135deg,#38bdf8,#6366f1)}
.sw-airline-logo--ua{background:#0039a6}
.sw-airline-logo--dl{background:#003366}
.sw-airline-logo--aa{background:#0078d2}
.sw-airline-logo--b6{background:#003087}
.sw-airline-info{display:flex;flex-direction:column;gap:2px;min-width:140px}
.sw-airline-name,.sw-flight-number{font-size:13px}
.sw-flight-number{color:var(--muted)}
.sw-meta-note{font-size:11px;color:#b06000}
.sw-emissions{font-size:11px;color:var(--muted)}
.sw-emissions--low{color:#137333}
.sw-emissions--high{color:#c5221f}
.sw-result-card__times{display:flex;align-items:center;gap:12px;flex:1;min-width:260px}
.sw-time-block{text-align:center}
.sw-time-block__time{font-size:18px;font-weight:600;display:block}
.sw-time-block__airport{font-size:12px;color:var(--muted)}
.sw-flight-path{flex:1;text-align:center;position:relative;min-width:100px}
.sw-flight-path__line{height:2px;background:var(--line);margin:8px 0;position:relative}
.sw-flight-path__line::after{content:'';position:absolute;right:-2px;top:-4px;border:5px solid transparent;border-left-color:var(--muted)}
.sw-flight-path__duration,.sw-flight-path__stops{display:block;font-size:12px;color:var(--muted)}
.sw-flight-path__stop-marker{font-size:11px;font-weight:700;color:var(--accent);margin-bottom:2px}
.sw-result-card__fares{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}
.sw-fare-btn{display:flex;flex-direction:column;align-items:flex-start;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--text);min-width:96px;cursor:pointer}
.sw-fare-btn--economy{border-color:var(--accent)}
.sw-fare-btn.is-selected{background:var(--accent-soft);border-color:var(--accent)}
.sw-fare-btn__price{font-size:18px;font-weight:700;color:var(--accent)}
.sw-fare-btn__class{font-size:12px;font-weight:600}
.sw-fare-btn__basis{font-size:11px;color:var(--muted)}
.sw-result-card__details-toggle{width:100%;padding:10px 16px;border:none;border-top:1px solid var(--line);background:var(--panel);text-align:left;font-size:13px;color:var(--accent);cursor:pointer}
.sw-result-card__details{padding:14px 16px;border-top:1px solid var(--line);background:#fff}
.sw-flight-details__row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--line)}
.sw-fare-table{width:100%;margin-top:12px;font-size:12px;border-collapse:collapse}
.sw-fare-table th,.sw-fare-table td{border:1px solid var(--line);padding:8px;text-align:center}
.sw-promo-badge,.sw-partner-badge{font-size:11px;font-weight:700;color:#b06000;margin-bottom:6px}
.sw-promo-text{font-size:14px}
.sw-link{color:var(--accent)}
.sw-pagination{display:flex;gap:6px;margin-top:16px;flex-wrap:wrap}
.sw-pagination__btn{padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;font-size:13px}
.sw-pagination__btn--active{background:var(--accent);color:#fff;border-color:var(--accent)}
.sw-pagination__btn:disabled{opacity:.4;cursor:not-allowed}
.sw-cookie-banner{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--line);padding:14px 20px;z-index:80;box-shadow:0 -4px 20px rgba(0,0,0,.08)}
.sw-cookie-banner__inner{max-width:1240px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px}
.sw-cookie-banner__actions{display:flex;gap:8px}
.sw-modal[aria-hidden="false"]{display:flex}
.sw-modal{display:none;position:fixed;inset:0;z-index:90;align-items:center;justify-content:center;padding:20px}
.sw-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.4)}
.sw-modal__panel{position:relative;background:#fff;border-radius:16px;padding:24px;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.2)}
.sw-modal__body{margin-top:10px;color:var(--muted)}
.sw-modal__actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.sw-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(12px);background:#323232;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:100}
.sw-toast.is-show{opacity:1;transform:translateX(-50%) translateY(0)}
.sw-footer{border-top:1px solid var(--line);padding:32px 0;margin-top:32px;background:var(--panel)}
.sw-footer__cols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:20px}
.sw-footer__col h4{font-size:13px;margin-bottom:8px}
.sw-footer__col a{display:block;font-size:13px;color:var(--muted);padding:4px 0}
.sw-footer__bottom{font-size:12px;color:var(--muted)}
${btn('sw', '#1a73e8')}
`,

  banking: `${BASE}
.np-app{background:#0b0f1a;color:#e8edf5;min-height:100vh;display:flex;flex-direction:column}
.np-layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh;flex:1}
@media(max-width:900px){.np-layout{grid-template-columns:1fr}}
.np-sidebar{background:#111827;border-right:1px solid #1f2937;padding:16px 12px;display:flex;flex-direction:column;gap:12px;min-height:100vh}
.np-sidebar__menu{flex:1}
.np-sidebar__logo{display:flex;align-items:center;gap:10px;padding:8px;font-weight:700}
.np-logo-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#14b8a6)}
.np-sidebar__link{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:#94a3b8;font-size:13px}
.np-sidebar__item--active .np-sidebar__link{background:#1e293b;color:#f8fafc}
.np-sidebar__footer{margin-top:auto;padding-top:12px;border-top:1px solid #1f2937}
.np-sidebar__user{display:flex;align-items:center;gap:10px;padding:8px}
.np-sidebar__user-name{display:block;font-size:13px;font-weight:600}
.np-sidebar__user-email{display:block;font-size:11px;color:#64748b}
.np-sidebar__logout-btn{background:none;border:none;color:#94a3b8;padding:8px;cursor:pointer;margin-left:auto}
.np-avatar{width:32px;height:32px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.np-avatar--sm{width:28px;height:28px}
.np-icon{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
.np-main{padding:20px 24px 40px;overflow-x:auto;min-width:0}
.np-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.np-topbar__left{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.np-topbar__title{font-size:22px;font-weight:700}
.np-topbar__date{color:#64748b;font-size:13px}
.np-topbar__right{display:flex;align-items:center;gap:10px}
.np-topbar__search-wrap{position:relative}
.np-topbar__search{padding:8px 12px 8px 36px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;min-width:220px}
.np-topbar__search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#64748b}
.np-topbar__notif-btn,.np-topbar__help-btn{position:relative;background:#151d2e;border:1px solid #334155;border-radius:8px;padding:8px 10px;color:#e2e8f0;cursor:pointer}
.np-topbar__notif-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:10px;min-width:16px;height:16px;border-radius:999px;display:flex;align-items:center;justify-content:center}
.np-smoke-status{font-size:12px;color:#64748b;padding:8px 12px;background:#151d2e;border-radius:8px;margin-bottom:16px;border:1px solid #334155}
.np-page{display:block}
.np-page.np-hidden{display:none!important}
.np-hidden{display:none!important}
.np-banner-row{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-bottom:24px}
@media(max-width:900px){.np-banner-row{grid-template-columns:1fr}}
.np-insight-card{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.np-insight-card__label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;display:block}
.np-insight-card__value{font-size:26px;font-weight:700;display:block;margin:4px 0}
.np-insight-card__sub{font-size:12px;color:#64748b;display:block}
.np-status{display:flex;gap:8px;flex-wrap:wrap}
.np-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#334155;color:#e2e8f0}
.np-badge--success{background:#14532d;color:#86efac}
.np-badge--info{background:#1e3a5f;color:#93c5fd}
.np-badge--warning{background:#78350f;color:#fcd34d}
.np-accounts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:24px}
.np-account-card{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:18px}
.np-account-card__header{display:flex;justify-content:space-between;margin-bottom:4px}
.np-account-card__balance-amount{font-size:24px;font-weight:700;margin:8px 0 12px}
.np-account-card__type,.np-account-card__balance-label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
.np-account-card__meta{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#64748b}
.np-account-card__number{font-size:12px;color:#64748b}
.np-content-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;margin-bottom:24px}
@media(max-width:1000px){.np-content-grid{grid-template-columns:1fr}}
.np-content-grid--payments{grid-template-columns:1fr 340px}
.np-quick-transfer{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px}
.np-quick-transfer__header{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.np-quick-transfer__summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;padding:12px;background:#0f172a;border-radius:8px}
.np-mini-stat__label{font-size:11px;color:#64748b}
.np-mini-stat__value{font-size:15px;font-weight:600;margin-top:4px}
.np-quick-transfer__form{display:grid;gap:14px;max-width:480px}
.np-form-row label{display:block;font-size:12px;color:#94a3b8;margin-bottom:6px}
.np-form-row select,.np-form-row input,.np-input,.np-select{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#f1f5f9}
.np-select--sm{padding:6px 10px;font-size:12px;width:auto}
.np-form-error{color:#f87171;font-size:12px;margin-top:4px}
.np-form-hint{color:#64748b;font-size:12px;margin-top:4px}
.np-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:4px}
.np-help-text{color:#64748b;font-size:13px}
.np-muted{color:#64748b;font-size:13px}
.np-activity-panel{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px}
.np-activity-panel__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.np-activity-list{display:flex;flex-direction:column;gap:14px}
.np-activity-list--compact{gap:10px}
.np-activity-item{display:flex;gap:10px;font-size:13px}
.np-activity-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;margin-top:6px;flex-shrink:0}
.np-activity-item__title{font-weight:600;margin-bottom:2px}
.np-activity-item__meta{color:#64748b;font-size:12px}
.np-transactions{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px;margin-bottom:24px}
.np-transactions__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:12px}
.np-transactions__filters{display:flex;gap:8px}
.np-table{width:100%;border-collapse:collapse;font-size:13px}
.np-table th,.np-table td{padding:11px 12px;text-align:left;border-bottom:1px solid #1f2937}
.np-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
.np-table__amount{text-align:right;font-weight:600}
.np-table__amount--debit{color:#f87171}
.np-table__amount--credit{color:#4ade80}
.np-txn-desc{display:flex;align-items:center;gap:10px}
.np-txn-icon{width:32px;height:32px;border-radius:8px;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:16px}
.np-txn-name{display:block;font-weight:500}
.np-txn-cat{display:block;font-size:11px;color:#64748b}
.np-transactions__footer{display:flex;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:12px}
.np-pagination{display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b}
.np-pagination__btn{background:#151d2e;border:1px solid #334155;border-radius:6px;padding:6px 10px;color:#e2e8f0;cursor:pointer}
.np-pagination__btn:disabled{opacity:.4;cursor:not-allowed}
.np-promo-banner{background:linear-gradient(90deg,#1e3a5f,#14532d);border:1px solid #334155;border-radius:12px;padding:18px;margin-bottom:24px}
.np-promo-banner__content{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.np-promo-banner__visual{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#fbbf24,#22c55e)}
.np-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center}
.np-overlay__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6)}
.np-overlay__panel{position:relative;background:#1e293b;border-radius:12px;padding:24px;max-width:400px;border:1px solid #334155}
.np-toast-stack{position:fixed;top:16px;right:16px;z-index:80;max-width:360px}
.np-toast{display:flex;gap:12px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:8px}
.np-toast__close{background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;margin-left:auto}
.np-toast__title{font-weight:600;font-size:13px}
.np-toast__msg{font-size:12px;color:#94a3b8;margin-top:2px}
.np-chat-widget{position:fixed;bottom:24px;right:24px;z-index:90}
.np-chat-widget__trigger{width:52px;height:52px;border-radius:50%;background:#22c55e;border:none;color:#fff;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.np-chat-widget__trigger svg{width:24px;height:24px;stroke:#fff;fill:none}
.np-chat-panel{position:fixed;bottom:88px;right:24px;width:320px;background:#1e293b;border:1px solid #334155;border-radius:12px;z-index:90;display:none;flex-direction:column;max-height:400px}
.np-chat-panel--open{display:flex}
.np-chat-panel__header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #334155}
.np-chat-panel__messages{padding:12px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;max-height:260px}
.np-chat-msg{font-size:13px;padding:8px 12px;border-radius:10px;background:#0f172a;max-width:85%}
.np-chat-msg--agent{background:#14532d;align-self:flex-start}
.np-modal{position:fixed;inset:0;z-index:110;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
.np-modal--open{display:flex}
.np-modal__dialog{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;max-width:440px;width:90%}
.np-footer{border-top:1px solid #1f2937;padding:16px 24px;background:#0b0f1a;margin-top:auto}
.np-footer__inner{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:12px;color:#64748b;max-width:1200px;margin:0 auto}
.np-footer__inner a{color:#94a3b8}
.np-page-intro{margin-bottom:16px}
.np-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid #334155}
.np-tab{padding:8px 14px;font-size:13px;background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;cursor:pointer;margin-bottom:-1px}
.np-tab--active{color:#f8fafc;border-bottom-color:#22c55e;font-weight:600}
.np-accounts-detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.np-detail-card{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px}
.np-detail-card__header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px}
.np-detail-card__header h2{font-size:16px;font-weight:700}
.np-detail-card__label{font-size:12px;color:#94a3b8;display:block}
.np-detail-card__amount{font-size:28px;font-weight:700;display:block;margin:4px 0 12px}
.np-detail-card__meta{list-style:none;padding:0;margin:0 0 16px;font-size:12px;color:#64748b;display:flex;flex-direction:column;gap:4px}
.np-detail-card__actions{display:flex;gap:8px;flex-wrap:wrap}
.np-card{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:20px}
.np-card--panel{margin-bottom:0}
.np-card__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px}
.np-card__title{font-size:16px;font-weight:700;margin-bottom:0}
.np-transfer-steps{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.np-transfer-step{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;padding:8px 14px;border-radius:8px;background:#151d2e;border:1px solid #334155}
.np-transfer-step span{width:22px;height:22px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.np-transfer-step--active{color:#f8fafc;border-color:#22c55e}
.np-transfer-step--active span{background:#22c55e;color:#fff}
.np-transfer-sidebar{margin-top:20px}
.np-scheduled-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #1f2937;font-size:13px}
.np-scheduled-item:last-child{border-bottom:none}
.np-upcoming-list{display:flex;flex-direction:column;gap:12px}
.np-upcoming-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;background:#0f172a;border-radius:8px;font-size:13px}
.np-upcoming-item strong{display:block}
.np-upcoming-item .np-muted{display:block;font-size:12px;margin-top:2px}
.np-cards-layout{display:grid;grid-template-columns:320px 1fr;gap:20px;align-items:start}
@media(max-width:800px){.np-cards-layout{grid-template-columns:1fr}}
.np-card-visual{background:linear-gradient(135deg,#1e293b,#14532d);border-radius:16px;padding:24px;min-height:180px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid #334155}
.np-card-visual--platinum{background:linear-gradient(135deg,#312e81,#0f172a)}
.np-card-visual__chip{width:40px;height:28px;border-radius:4px;background:linear-gradient(135deg,#fbbf24,#d97706)}
.np-card-visual__number{font-size:18px;letter-spacing:.12em;font-weight:600;margin:20px 0}
.np-card-visual__footer{display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;text-transform:uppercase}
.np-card-actions-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.np-promo-inline{background:linear-gradient(135deg,#1e3a5f,#151d2e)}
.np-market-bars{display:flex;flex-direction:column;gap:12px}
.np-market-bar{display:flex;align-items:center;gap:12px;font-size:13px}
.np-market-bar span:first-child{min-width:80px;color:#94a3b8}
.np-market-bar span:last-child{min-width:48px;text-align:right;color:#4ade80;font-weight:600}
.np-market-bar__track{flex:1;height:8px;background:#0f172a;border-radius:999px;overflow:hidden}
.np-market-bar__fill{height:100%;background:linear-gradient(90deg,#22c55e,#14b8a6);border-radius:999px}
.np-settings-layout{display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:start}
@media(max-width:700px){.np-settings-layout{grid-template-columns:1fr}}
.np-settings-nav{display:flex;flex-direction:column;gap:4px}
.np-settings-nav__item{text-align:left;padding:10px 14px;border-radius:8px;background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer}
.np-settings-nav__item--active{background:#1e293b;color:#f8fafc;font-weight:600}
.np-settings-panel{background:#151d2e;border:1px solid #2a3548;border-radius:12px;padding:24px}
.np-settings-form{display:flex;flex-direction:column;gap:14px;max-width:480px}
.np-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #1f2937}
.np-toggle-row:last-child{border-bottom:none}
.np-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}
.np-switch input{opacity:0;width:0;height:0}
.np-switch__slider{position:absolute;cursor:pointer;inset:0;background:#334155;border-radius:999px;transition:.2s}
.np-switch__slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s}
.np-switch input:checked+.np-switch__slider{background:#22c55e}
.np-switch input:checked+.np-switch__slider:before{transform:translateX(20px)}
.np-filter-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.np-filter-row label{font-size:12px;color:#64748b}
${btn('np', '#22c55e')}
.np-btn--danger{background:#dc2626;border-color:#dc2626;color:#fff}
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
.cb-app{background:#000;color:#e7e9ea;min-height:100vh;display:flex;flex-direction:column}
.cb-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border-bottom:1px solid #2f3336;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50;max-width:1280px;margin:0 auto;width:100%}
.cb-topbar__brand{display:flex;align-items:center;gap:12px}
.cb-topbar__search{flex:1;max-width:420px}
.cb-topbar__actions{display:flex;align-items:center;gap:8px}
.cb-layout{display:grid;grid-template-columns:72px minmax(0,600px) minmax(260px,1fr);max-width:1280px;margin:0 auto;min-height:calc(100vh - 57px);flex:1;width:100%}
@media(min-width:1100px){.cb-layout{grid-template-columns:240px minmax(0,600px) minmax(280px,1fr)}}
@media(max-width:1000px){.cb-layout{grid-template-columns:72px 1fr}}
.cb-sidebar--left{border-right:1px solid #2f3336;padding:12px 8px;display:flex;flex-direction:column;align-items:stretch;gap:8px;position:sticky;top:57px;height:calc(100vh - 57px);overflow-y:auto}
@media(min-width:1100px){.cb-sidebar--left{padding:12px 16px;align-items:stretch}}
.cb-sidebar--right{border-left:1px solid #2f3336;padding:16px;display:none;position:sticky;top:57px;height:calc(100vh - 57px);overflow-y:auto}
@media(min-width:1000px){.cb-sidebar--right{display:block}}
.cb-sidebar__logo{display:flex;justify-content:center;margin-bottom:8px}
@media(min-width:1100px){.cb-sidebar__logo{justify-content:flex-start}}
.cb-sidebar__nav{display:flex;flex-direction:column;gap:2px;flex:1}
.cb-sidebar__nav-item a{display:flex;align-items:center;gap:12px;padding:12px;border-radius:999px;color:#e7e9ea;font-size:15px;position:relative;transition:background .15s}
.cb-sidebar__nav-item a:hover{background:rgba(231,233,234,.08)}
.cb-sidebar__nav-item--active a{font-weight:700;background:rgba(231,233,234,.1)}
.cb-sidebar__nav span:not(.cb-badge){display:none}
@media(min-width:1100px){.cb-sidebar__nav span:not(.cb-badge){display:inline}}
.cb-sidebar__nav svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0}
.cb-sidebar__footer{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;font-size:12px;color:#71767b}
.cb-sidebar__footer a{color:#71767b}
.cb-sidebar__footer a:hover{color:#1d9bf0}
.cb-logo-icon{width:40px;height:40px;border-radius:12px;background:#1d9bf0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0}
.cb-main{border-right:1px solid #2f3336;min-height:100%;overflow-x:hidden}
.cb-page{display:block}
.cb-page.cb-hidden{display:none!important}
.cb-page-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2f3336;position:sticky;top:0;background:#000;z-index:10}
.cb-page-header__title{font-size:20px;font-weight:800}
.cb-panel{display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(29,155,240,.08);border-bottom:1px solid #2f3336;font-size:13px}
.cb-panel__dot{width:8px;height:8px;border-radius:50%;background:#00ba7c;animation:cbPulse 2s infinite}
.cb-panel__text{color:#71767b}
.cb-feed-toolbar{display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;color:#71767b;border-bottom:1px solid #2f3336}
.cb-stories{border-bottom:1px solid #2f3336;padding:12px 16px;overflow-x:auto;scrollbar-width:none}
.cb-stories::-webkit-scrollbar{display:none}
.cb-stories__scroll{display:flex;gap:14px}
.cb-story{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;color:#e7e9ea;font-size:11px;cursor:pointer;min-width:64px;transition:transform .15s}
.cb-story:hover{transform:scale(1.04)}
.cb-story__avatar{width:56px;height:56px;border-radius:50%;border:2px solid #2f3336;background:#16181c;display:flex;align-items:center;justify-content:center;overflow:hidden}
.cb-story__avatar img{width:100%;height:100%;object-fit:cover}
.cb-story__avatar--unseen{border-color:#1d9bf0}
.cb-story__avatar--seen{border-color:#536471}
.cb-story__avatar--add{border-style:dashed;font-size:22px;color:#1d9bf0}
.cb-story__name{max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-compose{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #2f3336}
.cb-compose__avatar{width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0}
.cb-compose__avatar img{width:100%;height:100%;object-fit:cover}
.cb-compose__input-wrap{flex:1;min-width:0}
.cb-compose__input{width:100%;min-height:56px;border:none;background:transparent;color:#e7e9ea;resize:none;font-size:18px}
.cb-compose__input:focus{outline:none}
.cb-compose__input::placeholder{color:#536471}
.cb-compose__meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#71767b;margin-top:4px}
.cb-compose__error{color:#f4212e}
.cb-compose__actions{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.cb-compose__tools{display:flex;gap:4px}
.cb-post{padding:14px 16px;border-bottom:1px solid #2f3336;transition:background .15s}
.cb-post:hover{background:rgba(255,255,255,.015)}
.cb-post--sponsored{background:rgba(29,155,240,.06)}
.cb-post--compact{padding:12px 16px}
.cb-post__header{display:flex;gap:10px;margin-bottom:8px;align-items:flex-start}
.cb-post__meta{flex:1;min-width:0;line-height:1.35}
.cb-post__avatar{width:40px;height:40px;border-radius:50%;background:#333;overflow:hidden;flex-shrink:0}
.cb-post__avatar--sm{width:32px;height:32px}
.cb-post__avatar img{width:100%;height:100%;object-fit:cover}
.cb-post__author{font-weight:700;color:#e7e9ea}
.cb-post__author:hover{text-decoration:underline}
.cb-post__handle,.cb-post__time,.cb-post__sep{color:#71767b;font-size:14px}
.cb-post__label{color:#1d9bf0;font-size:12px;font-weight:600}
.cb-post__menu-btn{margin-left:auto;background:none;border:none;color:#71767b;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:999px}
.cb-post__menu-btn:hover{background:rgba(231,233,234,.1);color:#e7e9ea}
.cb-post__body p{margin-bottom:8px;font-size:15px;line-height:1.45}
.cb-post__media{margin-top:8px;border-radius:16px;overflow:hidden;border:1px solid #2f3336}
.cb-post__img{width:100%;display:block;max-height:320px;object-fit:cover}
.cb-post__link-preview{display:flex;border:1px solid #2f3336;border-radius:12px;overflow:hidden;background:#16181c}
.cb-link-preview__img{width:120px;height:80px;object-fit:cover;flex-shrink:0;background:#333}
.cb-link-preview__text{padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0}
.cb-link-preview__domain{font-size:12px;color:#71767b}
.cb-link-preview__title{font-size:14px;font-weight:600;color:#e7e9ea;line-height:1.3}
.cb-post__actions{display:flex;justify-content:space-between;max-width:400px;margin-top:8px}
.cb-post__action-btn{display:flex;align-items:center;gap:6px;background:none;border:none;color:#71767b;font-size:13px;padding:6px 8px;cursor:pointer;transition:all .15s}
.cb-post__action-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
.cb-replies{margin-left:24px;border-left:2px solid #2f3336;padding-left:12px;margin-top:8px}
.cb-reply{padding:8px 0}
.cb-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#1d9bf0;color:#fff;font-size:11px;font-weight:700;margin-left:auto}
.cb-badge--dot{min-width:8px;width:8px;height:8px;padding:0;border-radius:50%;position:absolute;top:8px;right:8px}
.cb-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}
.cb-overlay__backdrop{position:absolute;inset:0;background:rgba(91,112,131,.4);backdrop-filter:blur(2px)}
.cb-overlay__panel{position:relative;background:#000;border-radius:16px;padding:28px 32px;max-width:400px;text-align:center;border:1px solid #2f3336;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.cb-overlay__icon{font-size:36px;margin-bottom:8px}
.cb-overlay__text{color:#8b98a5;margin-top:8px;font-size:14px;line-height:1.45}
.cb-overlay__actions{display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap}
.cb-note{font-size:12px;color:#71767b;margin-top:12px;padding:8px 12px;background:#16181c;border-radius:8px}
.cb-hidden{display:none!important}
.cb-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;background:#1d9bf0;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.4);animation:cbFadeIn .2s ease-out}
.cb-search-input{width:100%;padding:10px 14px;border-radius:999px;border:none;background:#202327;color:#e7e9ea;font-size:14px}
.cb-search-input:focus{outline:2px solid #1d9bf0;outline-offset:1px}
.cb-trending,.cb-suggestions,.cb-smoke-panel{background:#16181c;border-radius:16px;padding:14px;margin-bottom:16px;border:1px solid #2f3336}
.cb-trending--inline{background:transparent;border:none;padding:0}
.cb-trending__item{display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid #2f3336;cursor:default}
.cb-trending__item:last-child{border-bottom:none}
.cb-trending__item--clickable{cursor:pointer;border-radius:8px;padding:10px;margin:0 -10px;border-bottom:none}
.cb-trending__item--clickable:hover{background:rgba(231,233,234,.06)}
.cb-trending__category{font-size:12px;color:#71767b}
.cb-trending__topic{font-size:15px;font-weight:700;color:#e7e9ea}
.cb-trending__count{font-size:12px;color:#71767b}
.cb-suggest-user{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #2f3336}
.cb-suggest-user:last-child{border-bottom:none}
.cb-suggest-user__info{display:flex;align-items:center;gap:10px;min-width:0}
.cb-suggest-user__avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#333}
.cb-suggest-user__name{display:block;font-weight:700;font-size:14px}
.cb-suggest-user__handle{display:block;font-size:12px;color:#71767b}
.cb-smoke-status{font-size:13px;color:#e7e9ea;margin-bottom:8px}
.cb-load-more{padding:16px}
.cb-tabs{display:flex;gap:0;border-bottom:1px solid #2f3336}
.cb-tab{padding:12px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#71767b;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:-1px;transition:color .15s}
.cb-tab:hover{color:#e7e9ea;background:rgba(231,233,234,.04)}
.cb-tab--active{color:#e7e9ea;border-bottom-color:#1d9bf0}
.cb-tabs--profile{margin:0 16px}
.cb-explore-search{padding:12px 16px;border-bottom:1px solid #2f3336}
.cb-explore-panel{padding:8px 16px 16px}
.cb-news-card{background:#16181c;border:1px solid #2f3336;border-radius:12px;padding:14px;margin-bottom:12px;cursor:pointer;transition:background .15s}
.cb-news-card:hover{background:#1a1f24}
.cb-news-card__tag{font-size:11px;color:#1d9bf0;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.cb-news-card h3{font-size:15px;font-weight:700;margin:6px 0 4px;line-height:1.35}
.cb-news-card p{font-size:13px;color:#71767b;line-height:1.4}
.cb-empty-state{padding:32px 16px;text-align:center;color:#71767b;font-size:14px;line-height:1.6}
.cb-messages-layout{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 120px)}
@media(max-width:700px){.cb-messages-layout{grid-template-columns:1fr}}
.cb-dm-list{border-right:1px solid #2f3336;overflow-y:auto}
.cb-dm-item{display:flex;align-items:flex-start;gap:10px;width:100%;padding:12px 14px;background:none;border:none;border-bottom:1px solid #2f3336;color:#e7e9ea;text-align:left;cursor:pointer;position:relative;transition:background .15s}
.cb-dm-item:hover,.cb-dm-item--active{background:rgba(231,233,234,.06)}
.cb-dm-item__avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#333;flex-shrink:0}
.cb-dm-item__body{flex:1;min-width:0}
.cb-dm-item__top{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px;font-size:13px}
.cb-dm-item__top span{color:#71767b;font-size:12px;flex-shrink:0}
.cb-dm-item__body p{font-size:13px;color:#71767b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}
.cb-dm-chat{display:flex;flex-direction:column;min-height:400px}
.cb-dm-chat__header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #2f3336}
.cb-dm-chat__avatar{width:36px;height:36px;border-radius:50%;object-fit:cover}
.cb-dm-chat__handle{display:block;font-size:12px;color:#71767b}
.cb-dm-chat__messages{flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:420px}
.cb-dm-bubble{max-width:75%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.4}
.cb-dm-bubble--them{align-self:flex-start;background:#202327;border-bottom-left-radius:4px}
.cb-dm-bubble--me{align-self:flex-end;background:#1d9bf0;color:#fff;border-bottom-right-radius:4px}
.cb-dm-chat__composer{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #2f3336}
.cb-dm-chat__input{flex:1;padding:10px 14px;border-radius:999px;border:1px solid #2f3336;background:#202327;color:#e7e9ea}
.cb-dm-chat__input:focus{outline:none;border-color:#1d9bf0}
.cb-notif-list{padding:0}
.cb-notif-item{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid #2f3336;transition:background .15s}
.cb-notif-item:hover{background:rgba(231,233,234,.04)}
.cb-notif-item--unread{background:rgba(29,155,240,.06)}
.cb-notif-item__icon{font-size:20px;flex-shrink:0;margin-top:2px}
.cb-notif-item__body{flex:1;min-width:0}
.cb-notif-item__body p{font-size:14px;line-height:1.4;margin:0}
.cb-notif-item__time{font-size:12px;color:#71767b;margin-top:4px;display:block}
.cb-bookmarks-list{padding:0}
.cb-profile-banner{height:160px;background:linear-gradient(135deg,#1d3a5f,#1d9bf0 50%,#7856ff)}
.cb-profile-header{display:flex;justify-content:space-between;align-items:flex-end;padding:0 16px;margin-top:-36px;margin-bottom:12px}
.cb-profile-header__avatar{width:96px;height:96px;border-radius:50%;border:4px solid #000;overflow:hidden;background:#333}
.cb-profile-header__avatar img{width:100%;height:100%;object-fit:cover}
.cb-profile-info{padding:0 16px 16px}
.cb-profile-info__name{font-size:20px;font-weight:800}
.cb-profile-info__handle{color:#71767b;font-size:14px;display:block;margin-top:2px}
.cb-profile-info__bio{margin:12px 0;font-size:14px;line-height:1.45;max-width:480px}
.cb-profile-stats{display:flex;gap:16px;font-size:14px;color:#71767b}
.cb-profile-stats strong{color:#e7e9ea}
.cb-profile-panel{padding:0 0 24px}
.cb-post__action-btn--liked{color:#f91880!important}
.cb-post__action-btn--liked svg{fill:#f91880!important}
.cb-post__action-btn--reposted{color:#00ba7c!important}
.cb-post__action-btn--reposted svg{stroke:#00ba7c!important}
.cb-post__action-btn--bookmarked{color:#1d9bf0!important}
.cb-post__action-btn--bookmarked svg{fill:#1d9bf0!important}
.cb-post__action-btn--replied{color:#1d9bf0!important}
.cb-post__action-btn:hover{border-radius:999px;background-color:rgba(231,233,234,.08)}
.cb-post__action-btn:hover[aria-label="Like"]{color:#f91880;background-color:rgba(249,24,128,.1)}
.cb-post__action-btn:hover[aria-label="Repost"]{color:#00ba7c;background-color:rgba(0,186,124,.1)}
.cb-post__action-btn:hover[aria-label="Reply"]{color:#1d9bf0;background-color:rgba(29,155,240,.1)}
.cb-reply-composer{display:flex;gap:12px;padding:12px 0;border-top:1px solid #2f3336;margin-top:8px;animation:cbFadeIn .2s ease-out}
.cb-reply-composer__avatar{width:32px;height:32px;border-radius:50%;background:#333;overflow:hidden;flex-shrink:0}
.cb-reply-composer__avatar img{width:100%;height:100%;object-fit:cover}
.cb-reply-composer__input-wrap{flex-grow:1}
.cb-reply-composer__input{width:100%;min-height:40px;border:none;background:transparent;color:#e7e9ea;resize:none;font-size:14px}
.cb-reply-composer__input:focus{outline:none}
.cb-reply-composer__actions{display:flex;justify-content:flex-end;align-items:center;margin-top:8px}
.cb-repost-menu{position:absolute;bottom:100%;left:0;z-index:100;background:#000;border:1px solid #2f3336;border-radius:12px;padding:4px 0;min-width:150px;box-shadow:0 4px 12px rgba(0,0,0,.5);margin-bottom:4px;animation:cbFadeIn .15s ease-out}
.cb-repost-menu__item{width:100%;padding:8px 16px;background:none;border:none;color:#e7e9ea;text-align:left;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px}
.cb-repost-menu__item:hover{background:rgba(231,233,234,.1)}
.cb-post__quoted{border:1px solid #2f3336;border-radius:12px;padding:12px;margin-top:8px;background:#000;transition:background-color .2s;cursor:pointer}
.cb-post__quoted:hover{background:rgba(255,255,255,.03)}
.cb-post__quoted .cb-post__header{margin-bottom:4px}
.cb-post__quoted .cb-post__avatar{width:20px;height:20px}
.cb-post__quoted .cb-post__author{font-size:13px}
.cb-post__quoted .cb-post__body p{font-size:13px;margin-bottom:0}
.cb-modal{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;animation:cbFadeIn .2s ease-out}
.cb-modal__backdrop{position:absolute;inset:0;background:rgba(91,112,131,.4);backdrop-filter:blur(2px)}
.cb-modal__panel{position:relative;background:#000;border:1px solid #2f3336;border-radius:16px;padding:16px;width:90%;max-width:500px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.cb-modal__close{position:absolute;top:12px;right:12px;background:none;border:none;color:#71767b;cursor:pointer;font-size:18px}
.cb-modal__close:hover{color:#e7e9ea}
.cb-modal__composer{display:flex;gap:12px;margin-top:24px}
.cb-modal__avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0}
.cb-modal__input-wrap{flex-grow:1}
.cb-modal__input{width:100%;min-height:80px;border:none;background:transparent;color:#e7e9ea;resize:none;font-size:16px}
.cb-modal__input:focus{outline:none}
.cb-modal__footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;border-top:1px solid #2f3336;padding-top:12px}
.cb-modal__count-wrap{color:#71767b;font-size:13px}
@keyframes cbFadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
@keyframes cbPulse{0%,100%{opacity:1}50%{opacity:.4}}
${btn('cb', '#1d9bf0', 'transparent')}
.cb-btn--ghost{color:#e7e9ea}
.cb-btn--compose{margin-top:8px;font-weight:700;padding:12px}
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

  'email-client': `${BASE}
:root{--gm-bg:#f6f8fc;--gm-panel:#fff;--gm-line:#e0e0e0;--gm-muted:#5f6368;--gm-text:#202124;--gm-accent:#1a73e8;--gm-accent-hover:#1765cc;--gm-red:#d93025;--gm-sidebar:#f6f8fc;--gm-unread:#202124;--gm-read:#5f6368}
.gm-app,.ip-app{background:var(--gm-bg);color:var(--gm-text);min-height:100vh;font-family:"Google Sans",Roboto,Arial,sans-serif}
.gm-skip,.ip-skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.gm-skip:focus,.ip-skip:focus{left:16px;top:12px;width:auto;height:auto;padding:8px 12px;background:#fff;border:1px solid var(--gm-line);border-radius:8px;z-index:1000}
.gm-muted,.ip-muted{color:var(--gm-muted);font-size:12px}
.gm-topbar{display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--gm-panel);border-bottom:1px solid var(--gm-line);flex-wrap:wrap}
.gm-topbar__left,.gm-topbar__right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gm-topbar__right{margin-left:auto}
.gm-brand{display:flex;align-items:center;gap:10px}
.gm-logo{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#ea4335,#fbbc04,#34a853,#4285f4);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}
.gm-brand__text{font-size:18px;color:var(--gm-muted);font-weight:400}
.gm-search{flex:1;display:flex;align-items:center;gap:4px;background:#eaf1fb;border-radius:24px;padding:4px 12px;max-width:720px;min-width:200px;position:relative}
.gm-search input{flex:1;border:none;background:transparent;padding:10px 8px;font-size:14px;outline:none;color:var(--gm-text)}
.gm-search__panel{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--gm-line);border-radius:8px;padding:12px;margin-top:4px;box-shadow:0 4px 16px rgba(0,0,0,.12);display:grid;gap:8px;z-index:50}
.gm-search__panel.hidden{display:none!important}
.gm-icon-btn{background:none;border:none;border-radius:50%;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;color:var(--gm-muted);font-size:16px}
.gm-icon-btn:hover{background:rgba(60,64,67,.08)}
.gm-icon-btn:disabled{opacity:.4;cursor:not-allowed}
.gm-badge{display:inline-flex;padding:4px 10px;border-radius:999px;background:#e8f0fe;color:#1967d2;font-size:12px;font-weight:600}
.gm-avatar{width:32px;height:32px;border-radius:50%;background:#1a73e8;color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer}
.ip-dup-row{display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px;background:#fff;border-bottom:1px solid #f1f3f4}
.gm-shell{display:grid;grid-template-columns:256px minmax(0,1fr) 56px;min-height:calc(100vh - 120px)}
@media(max-width:1100px){.gm-shell{grid-template-columns:220px 1fr}.gm-rail{display:none}}
@media(max-width:800px){.gm-shell{grid-template-columns:1fr}.gm-sidebar{position:fixed;left:0;top:0;bottom:0;z-index:100;transform:translateX(-100%);transition:transform .2s;box-shadow:4px 0 24px rgba(0,0,0,.15)}.gm-sidebar:not(.gm-sidebar--collapsed){transform:translateX(0)}}
.gm-sidebar{background:var(--gm-sidebar);padding:8px 8px 16px;display:flex;flex-direction:column;gap:8px;border-right:1px solid var(--gm-line);overflow-y:auto}
.gm-compose{width:100%;justify-content:flex-start;padding:12px 24px;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.12);margin:8px 8px 12px;font-size:14px;font-weight:500}
.gm-compose__icon{font-size:18px;margin-right:8px}
.gm-nav{display:flex;flex-direction:column;gap:2px}
.gm-nav__item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:8px 12px 8px 20px;border:none;background:none;border-radius:0 16px 16px 0;font-size:14px;color:var(--gm-text);cursor:pointer}
.gm-nav__item:hover{background:#e8eaed}
.gm-nav__item--active{background:#d3e3fd;font-weight:600;color:#001d35}
.gm-nav__count{margin-left:auto;background:#d3e3fd;color:#001d35;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px}
.gm-labels{padding:12px 8px 0;border-top:1px solid var(--gm-line);margin-top:8px}
.gm-labels__title{font-size:11px;font-weight:600;color:var(--gm-muted);padding:8px 12px;text-transform:uppercase;letter-spacing:.04em}
.gm-label{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:6px 12px 6px 20px;border:none;background:none;font-size:13px;color:var(--gm-text);cursor:pointer;border-radius:0 16px 16px 0}
.gm-label:hover{background:#e8eaed}
.gm-label__dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.gm-label__dot--green{background:#188038}.gm-label__dot--red{background:#d93025}.gm-label__dot--blue{background:#1a73e8}.gm-label__dot--yellow{background:#f9ab00}
.gm-label--add{color:var(--gm-muted)}
.gm-sidebar__footer{margin-top:auto;padding:12px}
.gm-storage__bar{height:4px;background:#e0e0e0;border-radius:999px;overflow:hidden;margin-bottom:6px}
.gm-storage__fill{height:100%;background:var(--gm-accent)}
.gm-main{padding:12px 16px 32px;min-width:0;overflow-x:auto}
.gm-status-bar,.ip-status-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#fff;border:1px solid var(--gm-line);border-radius:8px;margin-bottom:12px;font-size:13px}
#email-client-smoke-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#e8f0fe;color:#1967d2;font-weight:600;font-size:12px}
.gm-kpi,.ip-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
@media(max-width:720px){.gm-kpi,.ip-kpi{grid-template-columns:repeat(2,1fr)}}
.gm-kpi .ip-panel,.ip-kpi .ip-panel{margin:0;padding:12px;background:#fff;border:1px solid var(--gm-line);border-radius:8px}
.gm-kpi strong,.ip-kpi strong{display:block;font-size:20px}
.gm-tabs{display:flex;gap:0;border-bottom:1px solid var(--gm-line);margin-bottom:0;background:#fff;border-radius:8px 8px 0 0;padding:0 8px}
.gm-tab{padding:12px 20px;border:none;background:none;font-size:14px;color:var(--gm-muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1px}
.gm-tab--active{color:var(--gm-accent);border-bottom-color:var(--gm-accent);font-weight:600}
.gm-toolbar{display:flex;align-items:center;gap:4px;padding:8px 12px;background:#fff;border:1px solid var(--gm-line);border-top:none;flex-wrap:wrap}
.gm-toolbar__spacer{flex:1}
.gm-check{display:flex;align-items:center;padding:4px}
.gm-help{padding:6px 12px;font-size:12px;color:var(--gm-muted);background:#fff;border-left:1px solid var(--gm-line);border-right:1px solid var(--gm-line)}
.gm-split{display:grid;grid-template-columns:minmax(280px,42%) minmax(0,1fr);border:1px solid var(--gm-line);border-top:none;background:#fff;min-height:280px}
@media(max-width:900px){.gm-split{grid-template-columns:1fr}}
.gm-list-pane{overflow-y:auto;border-right:1px solid var(--gm-line);max-height:360px}
.gm-list{width:100%;border:none;border-radius:0}
.gm-list thead{display:none}
.gm-list tbody tr{display:grid;grid-template-columns:36px 36px minmax(100px,140px) minmax(0,1fr) auto 72px;align-items:center;padding:4px 8px;border-bottom:1px solid #f1f3f4;cursor:pointer;font-size:13px}
.gm-list tbody tr:hover{background:#f2f6fc;box-shadow:inset 1px 0 0 #dadce0,inset -1px 0 0 #dadce0}
.gm-list tbody tr.unread .gm-row__from,.gm-list tbody tr.unread .gm-subject{font-weight:700;color:var(--gm-unread)}
.gm-list tbody tr.is-selected{background:#c2dbff}
.gm-list tbody tr.is-archived{opacity:.55}
.gm-list tbody tr.is-archived .gm-subject{text-decoration:line-through}
.gm-list tbody tr.hidden{display:none!important}
.gm-list td{padding:0;border:none;background:transparent!important}
.gm-row__check,.gm-row__star{display:flex;align-items:center;justify-content:center}
.gm-star-btn{background:none;border:none;font-size:16px;color:#dadce0;cursor:pointer;padding:4px;line-height:1}
.gm-star-btn--on{color:#f4b400}
.gm-row__from{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px}
.gm-row__subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gm-read)}
.gm-subject{color:inherit}
.gm-snippet{color:var(--gm-muted);font-weight:400}
.gm-row__tags{display:flex;gap:4px;flex-wrap:wrap}
.gm-row__date{text-align:right;color:var(--gm-muted);font-size:12px;padding-right:4px}
.gm-read-pane{padding:16px 20px;overflow-y:auto;max-height:360px}
.gm-read__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.gm-read__header h2{font-size:20px;font-weight:400;margin:0;flex:1}
.gm-read__actions{display:flex;gap:4px;flex-wrap:wrap}
.gm-read__from{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
.gm-read__avatar{width:40px;height:40px;border-radius:50%;background:#1a73e8;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;flex-shrink:0}
.gm-read__body{font-size:14px;line-height:1.6;color:var(--gm-text);margin-bottom:16px}
.gm-read__body p{margin:0 0 12px}
.gm-banner{margin-top:12px}
.gm-thread-panel,.ip-frame{display:grid;grid-template-columns:180px minmax(0,1fr) minmax(200px,240px);gap:0;margin-top:16px;border:1px solid var(--gm-line);border-radius:8px;overflow:hidden;background:#fff}
@media(max-width:1000px){.gm-thread-panel,.ip-frame{grid-template-columns:1fr}}
.gm-thread-aside{padding:14px;background:#f8f9fa;border-right:1px solid var(--gm-line);font-size:13px}
.gm-thread-aside h2{font-size:13px;font-weight:600;margin:12px 0 8px;color:var(--gm-muted)}
.gm-thread-list li{padding:4px 0;color:var(--gm-text)}
.gm-thread-detail{padding:16px!important;margin:0!important;border:none!important;border-radius:0!important;box-shadow:none!important}
.gm-thread-tools,.ip-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding:10px;background:#f8f9fa;border:1px solid var(--gm-line);border-radius:8px}
.ip-toolbar-note{padding:8px 0;font-size:12px;color:var(--gm-muted)}
.gm-checklist select,.gm-checklist input[type=text]{display:block;width:100%;max-width:480px;margin-top:4px;padding:8px 10px;border:1px solid var(--gm-line);border-radius:4px}
.gm-context,.ip-pane{padding:16px;background:#fafafa;border-left:1px solid var(--gm-line);font-size:13px}
.gm-context-card{padding:12px!important;margin:12px 0 0!important}
.gm-rail{border-left:1px solid var(--gm-line);padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff}
.gm-rail__app{width:40px;height:40px;border:none;background:none;border-radius:50%;cursor:pointer;font-size:18px}
.gm-rail__app:hover{background:#f1f3f4}
.gm-rail__promo{display:none}
@media(min-width:1200px){.gm-rail__promo{display:block;padding:12px;font-size:12px;margin-top:16px;background:#fff8e1;border-radius:8px;width:200px;position:fixed;right:64px;bottom:24px}}
.ip-chip{display:inline-flex;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#e8eaed;color:#3c4043;margin-right:4px}
.ip-chip--unread{background:#d3e3fd;color:#001d35}
.ip-chip--secure{background:#ceead6;color:#137333}
.ip-chip--archived{background:#e8eaed;color:#5f6368}
.ip-panel{border:1px solid var(--gm-line);border-radius:8px;padding:14px;background:#fff;margin:10px 0}
.ip-stack{display:grid;gap:12px}
.ip-cookie{position:fixed;bottom:0;left:0;right:0;background:#202124;color:#fff;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;z-index:200}
.ip-cookie p{flex:1;margin:0;font-size:13px}
.ip-ab{display:none!important}
.ip-filler{padding:12px 20px;border-top:1px dashed var(--gm-line);background:#fafafa}
.ip-filler-inner{display:flex;flex-wrap:wrap;gap:4px;max-height:80px;overflow:hidden;opacity:.6}
.gm-footer,.ip-ftr{padding:16px 20px;border-top:1px solid var(--gm-line);font-size:12px;color:var(--gm-muted);background:#fff}
.gm-modal-backdrop,.ip-modal-backdrop{position:fixed;inset:0;background:rgba(32,33,36,.5);display:none;align-items:center;justify-content:center;z-index:150;padding:16px}
.gm-modal-backdrop.is-open,.ip-modal-backdrop.is-open{display:flex}
.gm-modal,.ip-modal{width:min(100%,560px);background:#fff;border-radius:8px;padding:20px;box-shadow:0 24px 48px rgba(0,0,0,.2)}
.gm-modal__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.gm-modal__header h3{margin:0;font-size:16px;font-weight:500}
.gm-modal__footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.gm-form-row{display:grid;gap:6px;margin:10px 0}
.gm-form-row input,.gm-form-row textarea{width:100%;padding:10px;border:1px solid var(--gm-line);border-radius:4px}
.gm-snooze-options{display:flex;flex-direction:column;gap:8px;margin:12px 0}
.ip-help{font-size:12px;color:var(--gm-muted)}
.ip-error{font-size:12px;color:var(--gm-red);min-height:16px}
.ip-banner{padding:10px 12px;border-radius:8px;border:1px solid #d2e3fc;background:#e8f0fe;color:#174ea6;font-size:13px}
.ip-banner--warn{border-color:#fde68a;background:#fef7e0;color:#92400e}
.hidden{display:none!important}
${btn('ip', '#1a73e8')}
.ip-btn--primary{background:var(--gm-accent);border-color:var(--gm-accent)}
.ip-btn--primary:hover{background:var(--gm-accent-hover)}
.ip-btn--decoy{background:#fef7e0;border-color:#fde68a;color:#713f12}
.ip-btn--ghost:hover{background:#f1f3f4}
.ip-btn--muted{background:#e8eaed;color:#3c4043}
`,

  'real-estate': `${BASE}
.hn-app{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.45;color:#0f172a;background:#f1f5f9;min-height:100vh}
.hn-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.hn-hdr{background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.hn-hdr--sticky{position:sticky;top:0;z-index:40}
.hn-hdr__row{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 20px}
.hn-brand{display:flex;align-items:center;gap:10px;font-weight:700;color:#0f172a;flex-shrink:0}
.hn-brand-badge{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#c026d3,#7c3aed);color:#fff;font-size:16px}
.hn-brand-text{font-size:17px}
.hn-search-bar{display:flex;flex:1;min-width:220px;max-width:520px;gap:8px;align-items:center}
.hn-search-bar input{flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:999px;font-size:14px}
.hn-nav{display:flex;flex-wrap:wrap;align-items:center;gap:2px}
.hn-nav a{color:#475569;text-decoration:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500}
.hn-nav a:hover{background:#f1f5f9;color:#0f172a}
.hn-hdr-promo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto}
.hn-hdr__account{border-radius:999px}
.hn-subnav{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 20px;background:#fff;border-bottom:1px solid #e2e8f0;font-size:12px}
.hn-subnav a{color:#64748b;text-decoration:none;padding:6px 10px;border-radius:4px}
.hn-subnav a:hover{background:#f8fafc;color:#334155}
.hn-subnav__sep{color:#cbd5e1}
.hn-subnav__crumb{margin-left:4px}
.hn-dup-row{display:flex;flex-wrap:wrap;gap:8px;padding:10px 20px;background:#fafafa;border-bottom:1px solid #f1f5f9}
.hn-page-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,300px);gap:0;align-items:start;background:#fff;border-top:1px solid #e2e8f0}
@media(max-width:900px){.hn-page-wrap{grid-template-columns:1fr}}
.hn-page-main{padding:20px 24px 32px;min-height:42vh}
.hn-hero{border-radius:14px;background:linear-gradient(135deg,#faf5ff,#eef2ff);border:1px solid #e9d5ff;padding:18px;margin-bottom:16px}
.hn-hero__top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-start}
.hn-hero h1{font-size:22px;font-weight:700;margin:0 0 8px}
.hn-hero p{margin:0;color:#475569;max-width:60ch}
.hn-hero__actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.hn-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.hn-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;min-width:110px}
.hn-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px;align-items:start}
@media(max-width:980px){.hn-layout{grid-template-columns:1fr}}
.hn-filters{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
.hn-filters h2{font-size:14px;margin:0 0 10px}
.hn-filters label{display:block;margin:10px 0 4px;font-size:13px;font-weight:500;color:#334155}
.hn-filters input:not([type=checkbox]):not([type=radio]),.hn-filters select,.hn-filters textarea{width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px}
.hn-filters fieldset{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:10px 0;background:#fff}
.hn-filters legend{font-weight:600;font-size:12px;padding:0 4px}
.hn-filters table{width:100%;margin-top:12px;font-size:12px}
.hn-filters th,.hn-filters td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}
.hn-results{min-width:0}
.hn-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px}
.hn-statusbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin:10px 0}
.hn-statusbox{padding:10px 12px;border:1px solid #d8b4fe;background:#faf5ff;border-radius:10px;flex:1;min-width:200px}
.hn-map-wrap{position:relative;margin-bottom:12px}
.hn-map-tools{position:absolute;top:10px;right:10px;z-index:2;display:flex;gap:4px;flex-wrap:wrap}
.hn-map{border:1px solid #cbd5e1;border-radius:12px;background:linear-gradient(180deg,#dbeafe,#e2e8f0);height:280px;position:relative;overflow:hidden}
.hn-map--hidden{display:none}
.hn-map-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px);background-size:40px 40px}
.hn-pin{position:absolute;padding:6px 10px;border-radius:999px;background:#fff;border:1px solid #cbd5e1;font-size:12px;box-shadow:0 4px 10px rgba(15,23,42,.08);cursor:pointer}
.hn-pin.is-featured{background:#4c1d95;color:#fff;border-color:#4c1d95}
.hn-pin.is-active{outline:3px solid #c084fc;outline-offset:2px}
.hn-detail{border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;background:#fff}
.hn-detail__hdr{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px}
.hn-detail__copy{margin:0 0 10px;color:#475569}
.hn-detail__stats{display:flex;flex-wrap:wrap;gap:8px}
.hn-listings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.hn-listings--solo .hn-card{max-width:100%}
@media(max-width:760px){.hn-listings{grid-template-columns:1fr}}
.hn-card{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04);cursor:pointer}
.hn-card.is-selected{border-color:#c084fc;box-shadow:0 0 0 2px rgba(192,132,252,.2)}
.hn-card--featured .hn-card__media{border-bottom:2px solid #7c3aed}
.hn-card__media{height:140px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1)}
.hn-card__media--featured{background:linear-gradient(135deg,#ddd6fe,#c4b5fd)}
.hn-card__body{padding:14px}
.hn-card__actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.hn-card__blurb{margin:6px 0;color:#475569;font-size:13px}
.hn-agent-strip{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:16px;margin-top:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
.hn-agent-strip__avatar{width:48px;height:48px;border-radius:50%;background:#7c3aed;color:#fff;display:grid;place-items:center;font-weight:700}
.hn-agent-strip p{margin:4px 0 0}
.hn-rail{padding:16px;margin:16px;background:#fff;border-left:1px solid #e2e8f0;position:sticky;top:72px}
.hn-rail-card label{display:block;margin:8px 0 4px;font-size:12px;font-weight:500}
.hn-rail-card input{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px}
.hn-mortgage-out{font-weight:700;margin-top:10px;color:#4c1d95}
.hn-rail-divider{border:none;border-top:1px solid #f1f5f9;margin:14px 0}
.hn-checklist{padding-left:18px;margin:8px 0;font-size:13px;color:#475569}
.hn-dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin-top:8px}
.hn-dl dt{color:#64748b}
.hn-compare-tray{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#0f172a;color:#f8fafc;padding:12px 18px;border-radius:999px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:80;opacity:0;pointer-events:none;transition:opacity .2s}
.hn-compare-tray.is-visible{opacity:1;pointer-events:auto}
.hn-meta{display:flex;flex-wrap:wrap;gap:8px;color:#64748b;font-size:12px}
.hn-price{font-size:22px;font-weight:800;color:#0f172a}
.hn-address{font-weight:700;color:#1e293b}
.hn-muted{color:#64748b}
.hn-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700}
.hn-badge--ok{background:#dcfce7;color:#166534}
.hn-badge--warn{background:#fef3c7;color:#92400e}
.hn-badge--info{background:#e0e7ff;color:#4338ca}
.hn-checkrow{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px}
.hn-error{color:#b91c1c;font-size:12px;min-height:18px}
.hn-success{color:#166534;font-size:12px;min-height:18px}
.hn-statusbar .hn-statusbar{flex:1}
.hn-select{padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
.hn-select--inline{font-size:13px}
.hn-cookie{position:fixed;bottom:0;left:0;right:0;background:#0f172a;color:#f8fafc;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;z-index:200}
.hn-cookie p{flex:1;margin:0;font-size:13px;min-width:200px}
.hn-ab{display:none!important}
.hn-ftr{padding:16px 20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;background:#fff}
.hn-ftr a{color:#475569;margin-right:8px}
.hn-filler{padding:12px 20px;border-top:1px dashed #e2e8f0;background:#fafafa}
.hn-filler-inner{display:flex;flex-wrap:wrap;gap:4px;max-height:80px;overflow:hidden;opacity:.7}
.hn-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:55;display:none}
.hn-overlay.is-open{display:block}
.hn-modal{display:none;position:fixed;inset:12% auto auto 50%;transform:translateX(-50%);z-index:60;max-width:560px;width:min(92vw,560px);border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#fff;box-shadow:0 20px 40px rgba(15,23,42,.15)}
.hn-modal.is-open{display:block}
.hn-modal label{display:block;margin:10px 0 4px;font-size:13px;font-weight:500}
.hn-modal input,.hn-modal select{width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px}
.hn-modal__hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
.hn-modal__title{font-size:18px;font-weight:700;margin:0}
.hn-modal__foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.hn-favorite{border-color:#c084fc;box-shadow:0 0 0 2px rgba(192,132,252,.15)}
[data-view].is-active{background:#ede9fe;color:#5b21b6;border-color:#c4b5fd}
${btn('hn', 'hsl(291 72% 46%)', 'transparent')}
.hn-btn--primary{background:hsl(291 72% 46%);border-color:hsl(291 72% 38%);color:#fff}
.hn-btn--decoy{background:#fef9c3;border-color:#fde047;color:#713f12}
.hn-btn--muted{background:#e2e8f0;color:#334155}
.hn-btn--full{width:100%}
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
