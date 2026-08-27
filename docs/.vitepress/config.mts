import { defineConfig } from 'vitepress';
import { vitePressNav } from '../../shared/site-nav';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_SHORT_NAME,
  SITE_URL,
  vitePressCanonicalPath,
  websiteJsonLd,
} from '../../shared/site-seo';

const repo =
  process.env.VITEPRESS_GITHUB_REPO ??
  process.env.GITHUB_REPOSITORY ??
  'amirrezaalasti/webcontextinterface';
const base = process.env.VITEPRESS_BASE ?? '/';
const demoUrl =
  process.env.VITEPRESS_DEMO_URL ??
  (process.env.NODE_ENV === 'production' ? `${base}demo/` : 'http://localhost:5173');
const demoBase = demoUrl.endsWith('/') ? demoUrl : `${demoUrl}/`;

const jsonLd = JSON.stringify(websiteJsonLd());

export default defineConfig({
  title: SITE_NAME,
  titleTemplate: ':title · WCI',
  description: SITE_DESCRIPTION,
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [/^http:\/\/localhost/],

  sitemap: {
    hostname: SITE_URL,
  },

  transformHead({ pageData }) {
    const canonical = vitePressCanonicalPath(pageData.relativePath, base);
    return [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
    ];
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}logo.png` }],
    ['meta', { name: 'application-name', content: SITE_NAME }],
    ['meta', { name: 'apple-mobile-web-app-title', content: SITE_SHORT_NAME }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    [
      'meta',
      {
        name: 'google-site-verification',
        content: '8J50ZQRqMWvOeLK_G5meB9KWiU3DFNyg8Kuwwd3dZEY',
      },
    ],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:title', content: `${SITE_NAME} (${SITE_SHORT_NAME})` }],
    ['meta', { property: 'og:description', content: SITE_OG_DESCRIPTION }],
    ['meta', { property: 'og:image', content: SITE_OG_IMAGE }],
    ['meta', { property: 'og:image:alt', content: `${SITE_NAME} logo` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: `${SITE_NAME} (${SITE_SHORT_NAME})` }],
    ['meta', { name: 'twitter:description', content: SITE_OG_DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: SITE_OG_IMAGE }],
    [
      'script',
      { type: 'application/ld+json' },
      jsonLd,
    ],
  ],

  themeConfig: {
    logo: { src: '/logo.png', alt: `${SITE_NAME} (${SITE_SHORT_NAME})` },
    siteTitle: SITE_NAME,

    nav: vitePressNav(demoUrl, demoBase),

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is WCI?', link: '/' },
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Specification', link: '/specification' },
          { text: 'Distillation', link: '/distillation' },
          { text: 'Action protocol', link: '/action-protocol' },
          { text: 'Site policy', link: '/site-policy' },
          { text: 'LLM integration', link: '/llm-integration' },
          { text: 'Benchmark overview', link: '/benchmark' },
        ],
      },
      {
        text: 'Tooling',
        items: [
          { text: 'MCP server', link: '/mcp-server' },
          { text: 'CLI', link: '/cli' },
          { text: 'Validation', link: '/validation' },
          { text: 'React bindings', link: '/react' },
          { text: 'Annotating existing sites', link: '/api/annotator' },
        ],
      },
      {
        text: 'API Reference',
        collapsed: false,
        items: [
          { text: '@webcontextinterface/core', link: '/api/core' },
          { text: '@webcontextinterface/spec', link: '/api/spec' },
          { text: '@webcontextinterface/distiller', link: '/api/distiller' },
          { text: '@webcontextinterface/bridge', link: '/api/bridge' },
          { text: '@webcontextinterface/context', link: '/api/context' },
          { text: '@webcontextinterface/validator', link: '/api/validator' },
          { text: '@webcontextinterface/annotator', link: '/api/annotator' },
          { text: '@webcontextinterface/react', link: '/api/react' },
          { text: '@webcontextinterface/cli', link: '/api/cli' },
          { text: '@webcontextinterface/mcp', link: '/api/mcp' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: `https://github.com/${repo}` }],

    editLink: {
      pattern: `https://github.com/${repo}/edit/main/docs/:path`,
    },

    footer: {
      message:
        'MIT Licensed · Web Context Interface (WCI) · <a href="https://doi.org/10.5281/zenodo.20434088" target="_blank" rel="noreferrer">Dataset (Zenodo)</a> · <a href="https://notebooklm.google.com/notebook/aa9fa965-4a1b-400d-a605-37f0632c2738" target="_blank" rel="noreferrer">NotebookLM</a>',
      copyright: 'Copyright © 2026 WCI Contributors',
    },

    search: {
      provider: 'local',
    },
  },

  vite: {
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/demo': {
          target: 'http://localhost:5173',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/demo\/?/, '/'),
        },
      },
    },
    preview: {
      port: 4173,
      strictPort: false,
    },
  },
});
