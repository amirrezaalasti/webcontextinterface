import {
  GITHUB_URL,
  PAGE_CONTEXT,
  SITE_NAV_GROUPS,
  WCI_VERSION,
  getOrderedDemoPageSections,
  hrefForDemoItem,
  isGroupActive,
  isItemActive,
  resolveDocsBase,
  type SitePage,
} from '../shared/site-nav';
import { initMobileNav } from './nav-mobile';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linkAttrs(item: { external?: boolean }): string {
  if (!item.external) return '';
  return ' target="_blank" rel="noreferrer"';
}

function renderNavGroups(page: SitePage, docsBase: string): string {
  return SITE_NAV_GROUPS.map((group) => {
    const groupActive = isGroupActive(group, page);
    const itemsHtml = group.items
      .map((item) => {
        const href = item.external ? item.docsHref : hrefForDemoItem(item);
        const active = isItemActive(item, page);
        const docsHref =
          item.external || item.id === 'live-demo' || item.id === 'scenarios'
            ? ''
            : `${docsBase}${item.docsHref === '/' ? '' : item.docsHref.replace(/^\//, '')}`;
        const externalMark = item.external ? ' <span class="nav-external" aria-hidden="true">↗</span>' : '';

        return `<a
          href="${escapeHtml(href)}"
          class="nav-link${active ? ' is-active' : ''}"
          data-nav-id="${escapeHtml(item.id)}"
          ${docsHref ? `data-docs-href="${escapeHtml(docsHref)}"` : ''}
          ${linkAttrs(item)}
        >${escapeHtml(item.label)}${externalMark}</a>`;
      })
      .join('');

    return `<div class="nav-group${groupActive ? ' is-active' : ''}" data-nav-group="${escapeHtml(group.id)}">
      <button
        type="button"
        class="nav-group__trigger"
        aria-expanded="false"
        aria-controls="nav-group-${escapeHtml(group.id)}"
      >
        ${escapeHtml(group.label)}
        <span class="nav-group__chevron" aria-hidden="true"></span>
      </button>
      <div class="nav-group__menu" id="nav-group-${escapeHtml(group.id)}" role="menu">
        ${itemsHtml}
      </div>
    </div>`;
  }).join('');
}

function renderDemoSubnav(): string {
  const links = getOrderedDemoPageSections()
    .map(
      (section) =>
        `<a href="#${escapeHtml(section.id)}" class="site-subnav__link" data-section="${escapeHtml(section.id)}">${escapeHtml(section.label)}</a>`
    )
    .join('');

  return `<nav class="site-subnav" aria-label="On this page">
    <div class="site-subnav__inner">
      <span class="site-subnav__label">On this page</span>
      <div class="site-subnav__links">${links}</div>
    </div>
  </nav>`;
}

function renderContextBar(page: SitePage): string {
  const ctx = PAGE_CONTEXT[page];
  if (page === 'docs' || page === 'demo') return '';

  return `<div class="site-context-bar" aria-label="Page context">
    <div class="site-context-bar__inner">
      <span class="site-context-bar__zone">${escapeHtml(ctx.zone)}</span>
      <span class="site-context-bar__sep" aria-hidden="true">/</span>
      <span class="site-context-bar__title">${escapeHtml(ctx.title)}</span>
      ${
        ctx.subtitle
          ? `<span class="site-context-bar__subtitle">${escapeHtml(ctx.subtitle)}</span>`
          : ''
      }
    </div>
  </div>`;
}

export function renderSiteHeader(page: SitePage, mount: HTMLElement): void {
  const docsBase = resolveDocsBase();
  const context = PAGE_CONTEXT[page];
  const brandHref = page === 'scenarios' ? './index.html' : docsBase;
  const showPlaygroundBrand = page !== 'docs';

  mount.innerHTML = `<header class="site-header${showPlaygroundBrand ? ' site-header--playground' : ''}">
    <div class="header-inner">
      <a href="${escapeHtml(brandHref)}" class="logo" aria-label="WCI — Web Context Interface">
        <img src="./logo.png" alt="" class="logo-img" width="36" height="36" decoding="async" />
        <img src="./logo-with-title.png" alt="WCI — Web Context Interface" class="logo-img logo-img--titled" decoding="async" />
        <span class="version-badge">${escapeHtml(WCI_VERSION)}</span>
      </a>

      <button
        type="button"
        class="nav-toggle"
        aria-expanded="false"
        aria-controls="site-nav"
        aria-label="Open menu"
      >
        <span class="nav-toggle__bars" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
      </button>

      <nav class="header-nav" id="site-nav" aria-label="Site">
        <div class="header-nav__groups">
          ${renderNavGroups(page, docsBase)}
        </div>
        <div class="header-nav__actions">
          <a href="${escapeHtml(docsBase)}" class="nav-action nav-action--docs" data-docs-home>Docs home</a>
          <a href="${escapeHtml(GITHUB_URL)}" class="nav-action nav-action--github" target="_blank" rel="noreferrer">
            GitHub <span class="nav-external" aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
    </div>
    ${page === 'demo' ? renderDemoSubnav() : ''}
    ${renderContextBar(page)}
  </header>`;

  document.title =
    page === 'demo'
      ? `WCI Playground — ${context.title}`
      : page === 'scenarios'
        ? `${context.title} — WCI`
        : document.title;

  if (showPlaygroundBrand) {
    document.body.classList.add('demo-playground');
  }
}

function initDesktopDropdowns(): void {
  const groups = document.querySelectorAll<HTMLElement>('.nav-group');
  const closeAll = (except?: HTMLElement): void => {
    groups.forEach((group) => {
      if (group === except) return;
      group.classList.remove('is-open');
      group.querySelector('.nav-group__trigger')?.setAttribute('aria-expanded', 'false');
    });
  };

  groups.forEach((group) => {
    const trigger = group.querySelector<HTMLButtonElement>('.nav-group__trigger');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      if (window.matchMedia('(max-width: 960px)').matches) return;
      event.stopPropagation();
      const willOpen = !group.classList.contains('is-open');
      closeAll(willOpen ? group : undefined);
      group.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
  });

  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

function patchDocsLinks(): void {
  const docsBase = resolveDocsBase();
  document.querySelectorAll<HTMLElement>('[data-docs-href]').forEach((el) => {
    if (!(el instanceof HTMLAnchorElement)) return;
    const docsHref = el.dataset.docsHref;
    if (docsHref) el.href = docsHref;
  });

  const docsHome = document.querySelector<HTMLAnchorElement>('[data-docs-home]');
  if (docsHome) docsHome.href = docsBase;
}

export function initSiteNav(page: SitePage): void {
  const mount = document.getElementById('site-header-mount');
  if (!mount) {
    console.warn('[WCI] #site-header-mount not found — skipping site nav init.');
    return;
  }

  renderSiteHeader(page, mount);
  mount.classList.remove('site-header-mount');
  mount.removeAttribute('aria-busy');
  patchDocsLinks();
  initDesktopDropdowns();
  initMobileNav();
  syncHeaderOffset(mount);
  if (page === 'demo') initSectionSpy(mount);
}

function initSectionSpy(mount: HTMLElement): void {
  const links = mount.querySelectorAll<HTMLAnchorElement>('.site-subnav__link');
  if (!links.length) return;

  const ordered = getOrderedDemoPageSections();
  const sections = ordered.map((s) => s.element);
  if (!sections.length) return;

  const setActive = (id: string | null): void => {
    links.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.section === id);
    });
  };

  const observerRootMargin = (): string => {
    const offset =
      getComputedStyle(document.documentElement).getPropertyValue('--site-header-offset').trim() ||
      '100px';
    return `-${offset} 0px -55% 0px`;
  };

  let observer: IntersectionObserver | null = null;

  const bindObserver = (): void => {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      {
        rootMargin: observerRootMargin(),
        threshold: [0, 0.15, 0.4, 0.65],
      }
    );
    sections.forEach((section) => observer?.observe(section));
  };

  bindObserver();
  window.addEventListener('resize', bindObserver);
}

function syncHeaderOffset(mount: HTMLElement): void {
  const apply = (): void => {
    const header = mount.querySelector('.site-header');
    if (!header) return;
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--site-header-offset', `${height}px`);
    document.documentElement.style.setProperty('scroll-padding-top', `${height + 8}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  if (document.fonts?.ready) void document.fonts.ready.then(apply);
}
