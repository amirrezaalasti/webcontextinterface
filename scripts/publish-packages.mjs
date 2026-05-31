#!/usr/bin/env node
/**
 * Publish @webcontextinterface/* to npm in dependency order.
 *
 * Prerequisites:
 *   npm run build          — all dist/ folders up to date
 *   npm login              — or NPM_TOKEN with publish access
 *
 * npm requires ONE of:
 *   - 2FA enabled on your account → pass --otp=123456
 *   - Granular access token with "Bypass 2FA" → set NPM_TOKEN or npm login with that token
 *
 * Usage:
 *   npm run publish:packages
 *   npm run publish:packages -- --dry-run
 *   npm run publish:packages -- --otp=123456
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dryRun = process.argv.includes('--dry-run');
const skipBuild = process.argv.includes('--skip-build');
const otpArg = process.argv.find((a) => a.startsWith('--otp='));
const otp = otpArg?.slice('--otp='.length);

const packages = [
  { name: '@webcontextinterface/spec', dir: 'spec' },
  { name: '@webcontextinterface/distiller', dir: 'distiller' },
  { name: '@webcontextinterface/bridge', dir: 'bridge' },
  { name: '@webcontextinterface/context', dir: 'context' },
  { name: '@webcontextinterface/core', dir: 'core' },
];

function readVersion(dir) {
  const pkg = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
  return pkg.version;
}

if (!skipBuild) {
  console.log('Building all packages…');
  const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', cwd: root, shell: false });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

console.log('\nPublish plan:');
for (const p of packages) {
  console.log(`  ${p.name}@${readVersion(p.dir)}${dryRun ? ' (dry-run)' : ''}`);
}

for (const { name } of packages) {
  console.log(`\n${dryRun ? 'Dry-run' : 'Publishing'} ${name}…`);
  const args = ['publish', '-w', name, '--access', 'public'];
  if (dryRun) args.push('--dry-run');
  if (otp) args.push(`--otp=${otp}`);
  const r = spawnSync('npm', args, { stdio: 'inherit', cwd: root, shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(dryRun ? '\nDry-run complete — no packages were published.' : '\nAll packages published.');
