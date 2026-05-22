#!/usr/bin/env node
/**
 * Build the full WCI documentation website:
 *   1. VitePress docs → docs/.vitepress/dist
 *   2. Interactive demo → dist/demo, copied to docs/.vitepress/dist/demo
 *
 * Environment:
 *   DOCS_BASE     — VitePress base path (default "/" or "/<repo-name>/" on GitHub Pages)
 *   GITHUB_REPOSITORY — "owner/repo" (optional, sets DOCS_BASE to /repo/)
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function normalizeBase(raw) {
  let base = raw.endsWith('/') ? raw : `${raw}/`;
  if (!base.startsWith('/')) base = `/${base}`;
  return base;
}

const repo = process.env.GITHUB_REPOSITORY;
const docsBase = normalizeBase(
  process.env.DOCS_BASE ?? (repo ? `/${repo.split('/')[1]}` : '/')
);
const demoBase = normalizeBase(`${docsBase}demo`);

const env = {
  ...process.env,
  VITEPRESS_BASE: docsBase,
  VITEPRESS_DEMO_URL: demoBase,
  DEMO_BASE: demoBase,
};

console.log(`Building WCI website (docs base: ${docsBase}, demo: ${demoBase})`);

const assetsDir = join(root, 'assets');
for (const dest of [join(root, 'demo/public'), join(root, 'docs/public')]) {
  for (const file of ['logo.png', 'logo-with-title.png', 'logo-web-theme.png']) {
    cpSync(join(assetsDir, file), join(dest, file));
  }
}

try {
  execSync('npm run eval:merge-leaderboard', { cwd: root, stdio: 'inherit' });
} catch {
  console.warn('eval:merge-leaderboard skipped (no snapshots in demo/public?)');
}

execSync('npm run docs:build', { cwd: root, stdio: 'inherit', env });
execSync('npm run demo:build', { cwd: root, stdio: 'inherit', env });

const docsOut = join(root, 'docs/.vitepress/dist');
const demoOut = join(root, 'dist/demo');
const demoDest = join(docsOut, 'demo');

if (!existsSync(demoOut)) {
  console.error('Demo build output missing at dist/demo');
  process.exit(1);
}

rmSync(demoDest, { recursive: true, force: true });
mkdirSync(demoDest, { recursive: true });
cpSync(demoOut, demoDest, { recursive: true });

console.log(`\n✓ Website ready: ${docsOut}`);
console.log(`  Preview: npm run website:preview`);
