import { defineConfig } from 'vitepress';

const repo =
  process.env.VITEPRESS_GITHUB_REPO ??
  process.env.GITHUB_REPOSITORY ??
  'amirrezaalasti/webcontextinterface';
const base = process.env.VITEPRESS_BASE ?? '/';
const demoUrl =
  process.env.VITEPRESS_DEMO_URL ??
  (process.env.NODE_ENV === 'production' ? `${base}demo/` : 'http://localhost:5173');

export default defineConfig({
  title: 'WCI',
  titleTemplate: ':title · Web Context Interface',
  description:
    'Web Context Interface (WCI) — an open standard and TypeScript SDK for LLM-native web pages.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [/^http:\/\/localhost/],

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}logo.png` }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', { property: 'og:title', content: 'WCI — Web Context Interface' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Open standard and TypeScript SDK for LLM-readable web pages: data-wci-* markup, distillation, and typed actions.',
      },
    ],
  ],

  themeConfig: {
    logo: { src: '/logo.png', alt: 'WCI — Web Context Interface' },
    siteTitle: 'Web Context Interface',

    nav: [
      { text: 'Guide', link: '/getting-started', activeMatch: '/getting-started' },
      { text: 'Specification', link: '/specification' },
      { text: 'API', link: '/api/spec' },
      { text: 'Demo', link: demoUrl, target: '_blank' },
    ],

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
        ],
      },
      {
        text: 'API Reference',
        collapsed: false,
        items: [
          { text: '@wci/core', link: '/api/core' },
          { text: '@wci/spec', link: '/api/spec' },
          { text: '@wci/distiller', link: '/api/distiller' },
          { text: '@wci/bridge', link: '/api/bridge' },
          { text: '@wci/context', link: '/api/context' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: `https://github.com/${repo}` }],

    editLink: {
      pattern: `https://github.com/${repo}/edit/main/docs/:path`,
    },

    footer: {
      message: 'MIT Licensed · Web Context Interface (WCI)',
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
