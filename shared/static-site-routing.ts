/**
 * Cross-app routing for the combined VitePress docs + static Vite demo deployment.
 * VitePress intercepts same-origin HTML links for client-side navigation; paths that
 * are not VitePress pages (demo app, scenario HTML, static assets) must hard-navigate.
 */

export const EXTERNAL_URL_RE = /^(?:[a-z]+:|\/\/)/i;

declare global {
  interface Window {
    __VP_HASH_MAP__?: Record<string, string>;
  }
}

const DEMO_ENTRY_PATHS = new Set([
  '/demo',
  '/demo/index',
  '/demo/index.html',
  '/demo/scenarios',
  '/demo/scenarios.html',
]);

function sanitizeVpFileName(name: string): string {
  return name
    .replace(/[\u0000-\u001F"#$&*+,:;<=>?[\]^`{|}\u007F]/g, '_')
    .replace(/(^|\/)_+(?=[^/]*$)/, '$1');
}

/** True when the path is served by the static Vite demo (not VitePress). */
export function isStaticAppPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/demo' || path.startsWith('/demo/');
}

/** Canonical demo entry URLs (index / scenarios). */
export function resolveDemoEntryUrl(pathname: string, hash = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (!DEMO_ENTRY_PATHS.has(path)) return null;
  if (path === '/demo/scenarios' || path === '/demo/scenarios.html') {
    return `/demo/scenarios.html${hash}`;
  }
  return `/demo/index.html${hash}`;
}

export function isDemoAppPath(pathname: string): boolean {
  return resolveDemoEntryUrl(pathname) !== null;
}

export function toDemoAppUrl(pathname: string, hash = ''): string {
  return resolveDemoEntryUrl(pathname, hash) ?? `${pathname}${hash}`;
}

/** Mirrors VitePress `pathToFile` hash-map lookup (production client build). */
export function isVitePressPagePath(pathname: string, base = '/'): boolean {
  if (typeof window === 'undefined') return false;
  const hashMap = window.__VP_HASH_MAP__;
  if (!hashMap) return false;

  let pagePath = pathname.replace(/\.html$/, '');
  try {
    pagePath = decodeURIComponent(pagePath);
  } catch {
    /* keep raw path */
  }
  pagePath = pagePath.replace(/\/$/, '/index');

  let mdKey =
    sanitizeVpFileName(pagePath.slice(base.length).replace(/\//g, '_') || 'index') + '.md';

  if (hashMap[mdKey.toLowerCase()]) return true;

  mdKey = mdKey.endsWith('_index.md')
    ? mdKey.slice(0, -9) + '.md'
    : mdKey.slice(0, -3) + '_index.md';

  return Boolean(hashMap[mdKey.toLowerCase()]);
}

/**
 * When non-null, the URL must be loaded with a full navigation (not VitePress SPA).
 */
export function resolveHardNavigationTarget(href: string, base = '/'): string | null {
  if (!href || href.startsWith('#') || EXTERNAL_URL_RE.test(href)) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;

  const demoEntry = resolveDemoEntryUrl(url.pathname, url.hash);
  if (demoEntry) return demoEntry;

  const staticTarget = `${url.pathname}${url.search}${url.hash}`;

  if (isStaticAppPath(url.pathname)) return staticTarget;

  if (!isVitePressPagePath(url.pathname, base)) return staticTarget;

  return null;
}

interface VitePressRouterHooks {
  onBeforeRouteChange?: (href: string) => unknown;
  onBeforePageLoad?: (href: string) => unknown;
}

/** Wire hard-navigation for all non-VitePress routes in the docs SPA. */
export function installVitePressStaticRouting(
  router: VitePressRouterHooks,
  base = '/'
): void {
  if (typeof window === 'undefined') return;

  const hardNavigate = (href: string): boolean => {
    const target = resolveHardNavigationTarget(href, base);
    if (!target) return false;
    window.location.assign(target);
    return true;
  };

  const previousOnBeforeRouteChange = router.onBeforeRouteChange;
  router.onBeforeRouteChange = async (href) => {
    if (hardNavigate(href)) return false;
    return previousOnBeforeRouteChange?.(href);
  };

  const previousOnBeforePageLoad = router.onBeforePageLoad;
  router.onBeforePageLoad = async (href) => {
    if (hardNavigate(href)) return false;
    return previousOnBeforePageLoad?.(href);
  };

  window.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('target')) return;

      const linkHref = anchor.getAttribute('href');
      if (!linkHref || linkHref.startsWith('#')) return;

      if (hardNavigate(linkHref)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

/** Canonical demo entry links on static demo pages (index / scenarios). */
export function installDemoStaticRouting(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('target')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const demoTarget = resolveDemoEntryUrl(url.pathname, url.hash);
      if (!demoTarget) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(`${demoTarget}${url.search}`);
    },
    true
  );
}
