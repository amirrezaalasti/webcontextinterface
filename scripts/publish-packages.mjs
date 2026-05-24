#!/usr/bin/env node
/**
 * Publish @webcontextinterface/* to npm in dependency order.
 *
 * npm requires ONE of:
 *   - 2FA enabled on your account → pass --otp=123456
 *   - Granular access token with "Bypass 2FA" → set NPM_TOKEN or npm login with that token
 *
 * Usage:
 *   npm run build
 *   node scripts/publish-packages.mjs
 *   node scripts/publish-packages.mjs --otp=123456
 */
import { spawnSync } from 'node:child_process';

const otpArg = process.argv.find((a) => a.startsWith('--otp='));
const otp = otpArg?.slice('--otp='.length);

const packages = [
  '@webcontextinterface/spec',
  '@webcontextinterface/distiller',
  '@webcontextinterface/bridge',
  '@webcontextinterface/context',
  '@webcontextinterface/core',
];

for (const name of packages) {
  console.log(`\nPublishing ${name}…`);
  const args = ['publish', '-w', name, '--access', 'public'];
  if (otp) args.push(`--otp=${otp}`);
  const r = spawnSync('npm', args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\nAll packages published.');
