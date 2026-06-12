/**
 * Canonical site navigation — shared by the demo app and VitePress docs.
 */

export type SitePage = 'docs' | 'demo' | 'scenarios';

export interface NavLink {
  id: string;
  label: string;
  /** Docs-site path (e.g. `/getting-started`) or absolute external URL. */
  docsHref: string;
  /** Demo-app path relative to demo root (e.g. `./index.html#demo`). */
  demoHref?: string;
  external?: boolean;
  activeOn?: SitePage[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavLink[];
}

export const GITHUB_URL = 'https://github.com/amirrezaalasti/webcontextinterface';
export const DATASET_URL = 'https://doi.org/10.5281/zenodo.20434088';
export const NOTEBOOKLM_URL =
  'https://notebooklm.google.com/notebook/aa9fa965-4a1b-400d-a605-37f0632c2738';
export const WCI_VERSION = 'v1.2';

export const SITE_NAV_GROUPS: NavGroup[] = [
  {
    id: 'docs',
    label: 'Docs',
    items: [
      { id: 'docs-home', label: 'Home', docsHref: '/', activeOn: ['docs'] },
      {
        id: 'guide',
        label: 'Guide',
        docsHref: '/getting-started',
        activeOn: ['docs'],
      },
      {
        id: 'specification',
        label: 'Specification',
        docsHref: '/specification',
        activeOn: ['docs'],
      },
      {
        id: 'benchmark',
        label: 'Benchmark',
        docsHref: '/benchmark',
        activeOn: ['docs'],
      },
      { id: 'api', label: 'API', docsHref: '/api/core', activeOn: ['docs'] },
    ],
  },
  {
    id: 'playground',
    label: 'Playground',
    items: [
      {
        id: 'live-demo',
        label: 'Live Demo',
        docsHref: '/demo/',
        demoHref: './index.html#demo',
        activeOn: ['demo'],
      },
      {
        id: 'scenarios',
        label: 'Scenarios',
        docsHref: '/demo/scenarios',
        demoHref: './scenarios.html',
        activeOn: ['scenarios'],
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      {
        id: 'dataset',
        label: 'Dataset',
        docsHref: DATASET_URL,
        demoHref: DATASET_URL,
        external: true,
      },
      {
        id: 'notebooklm',
        label: 'NotebookLM',
        docsHref: NOTEBOOKLM_URL,
        demoHref: NOTEBOOKLM_URL,
        external: true,
      },
    ],
  },
];

export function resolveDocsBase(): string {
  const path = location.pathname.replace(/\/?demo\/?.*$/, '/');
  return path || '/';
}

export function resolveDemoBase(): string {
  const docsBase = resolveDocsBase();
  return docsBase.endsWith('/') ? `${docsBase}demo/` : `${docsBase}/demo/`;
}

/** True when a path belongs to the static demo app (not VitePress). */
export function isDemoAppPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/demo' || path.startsWith('/demo/');
}

/**
 * Map demo paths to static HTML files on the combined docs+demo deployment.
 * VitePress `cleanUrls` can normalize `/demo/scenarios.html` → `/demo/scenarios`, which 404s in the SPA.
 */
export function toDemoAppUrl(pathname: string, hash = ''): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/demo') return `/demo/index.html${hash}`;
  if (path === '/demo/scenarios') return `/demo/scenarios.html${hash}`;
  return `${pathname}${hash}`;
}

export function hrefForDemoItem(item: NavLink): string {
  if (item.external) return item.docsHref;
  if (item.demoHref) return item.demoHref;
  return item.docsHref;
}

export function hrefForDocsItem(item: NavLink, docsBase: string): string {
  if (item.external) return item.docsHref;
  const base = docsBase.endsWith('/') ? docsBase.slice(0, -1) : docsBase;
  if (item.docsHref === '/') return base || '/';
  return `${base}${item.docsHref}`;
}

export function isItemActive(item: NavLink, page: SitePage): boolean {
  return item.activeOn?.includes(page) ?? false;
}

export function isGroupActive(group: NavGroup, page: SitePage): boolean {
  return group.items.some((item) => isItemActive(item, page));
}

/** VitePress `themeConfig.nav` entries derived from the shared config. */
export function vitePressNav(demoUrl: string, demoBase: string) {
  const demoLink = demoUrl.endsWith('/') ? demoUrl : `${demoUrl}/`;
  const scenariosLink = `${demoBase}scenarios`;

  return [
    {
      text: 'Docs',
      activeMatch: '/(getting-started|specification|api|architecture|distillation|action-protocol|site-policy|llm-integration|benchmark)',
      items: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/getting-started', activeMatch: '/getting-started' },
        { text: 'Specification', link: '/specification' },
        { text: 'Benchmark', link: '/benchmark' },
        { text: 'API', link: '/api/core' },
      ],
    },
    {
      text: 'Playground',
      items: [
        { text: 'Live Demo', link: demoLink },
        { text: 'Scenarios', link: scenariosLink },
      ],
    },
    {
      text: 'Resources',
      items: [
        { text: 'Dataset', link: DATASET_URL, target: '_blank' },
        { text: 'NotebookLM', link: NOTEBOOKLM_URL, target: '_blank' },
      ],
    },
    { text: 'GitHub', link: GITHUB_URL, target: '_blank' },
  ];
}

/** In-page section anchors on the demo home (shown in the header sub-nav). */
export const DEMO_PAGE_SECTIONS = [
  { id: 'spec', label: 'Comparison' },
  { id: 'demo', label: 'Live demo' },
  { id: 'converter', label: 'DOM converter' },
  { id: 'eval-results', label: 'Results' },
  { id: 'eval-config', label: 'Eval config' },
  { id: 'context', label: 'Site context' },
  { id: 'spec-table', label: 'Attributes' },
] as const;

export type DemoPageSection = (typeof DEMO_PAGE_SECTIONS)[number];

/** Return sub-nav sections in document order (matches scroll position on the page). */
export function getOrderedDemoPageSections(): Array<
  DemoPageSection & { element: HTMLElement }
> {
  return DEMO_PAGE_SECTIONS.map((section) => ({
    ...section,
    element: document.getElementById(section.id),
  }))
    .filter(
      (section): section is DemoPageSection & { element: HTMLElement } =>
        section.element !== null
    )
    .sort((a, b) => {
      const relation = a.element.compareDocumentPosition(b.element);
      if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
}

export const PAGE_CONTEXT: Record<
  SitePage,
  { zone: string; title: string; subtitle?: string }
> = {
  docs: {
    zone: 'Documentation',
    title: 'Web Context Interface',
  },
  demo: {
    zone: 'Interactive Playground',
    title: 'Live Demo',
    subtitle: 'Distill annotated DOM and dispatch typed agent actions in real time.',
  },
  scenarios: {
    zone: 'Interactive Playground',
    title: 'Benchmark Scenarios',
    subtitle: 'Browse all 50 raw and annotated HTML fixtures with WCI inspection.',
  },
};
