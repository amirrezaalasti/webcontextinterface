#!/usr/bin/env node
/**
 * Set one coordinated version across every @webcontextinterface/* package.
 *
 * The packages ship as a set: each declares `^<version>` on its siblings, and
 * `publish-packages.mjs` refuses to publish if the versions drift apart. Doing
 * that by hand across ten manifests is where the drift comes from, so this is
 * the only supported way to move the version.
 *
 * It rewrites, in one pass:
 *   - `version` in every packages/<name>/package.json
 *   - internal `@webcontextinterface/*` ranges in dependencies, devDependencies
 *     and peerDependencies (including the root manifest's dependency on core)
 *   - the version column and install snippets in README.md
 *
 * Usage:
 *   node scripts/bump-version.mjs 1.4.0
 *   node scripts/bump-version.mjs minor          # major | minor | patch
 *   node scripts/bump-version.mjs 1.4.0 --dry-run
 *
 * Then: update packages/CHANGELOG.md, commit, and tag `v<version>` — pushing
 * that tag is what triggers .github/workflows/release.yml.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find((a) => !a.startsWith('--'));

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SCOPE = '@webcontextinterface/';

if (!target) {
  console.error('Usage: node scripts/bump-version.mjs <version|major|minor|patch> [--dry-run]');
  process.exit(2);
}

const packageDirs = readdirSync(join(root, 'packages'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const manifestPath = (dir) => join(root, 'packages', dir, 'package.json');

// The current version is only well defined if the set is already coherent;
// bumping from a drifted state would bake the drift into the next release.
const current = new Map(packageDirs.map((d) => [d, readJson(manifestPath(d)).version]));
const distinct = [...new Set(current.values())];
if (distinct.length > 1) {
  console.error('Packages are not on a single version — fix this before bumping:');
  for (const [dir, v] of current) console.error(`  ${dir}: ${v}`);
  process.exit(1);
}
const from = distinct[0];

function nextVersion(spec) {
  if (SEMVER.test(spec)) return spec;
  const [major, minor, patch] = from.split('-')[0].split('.').map(Number);
  if (spec === 'major') return `${major + 1}.0.0`;
  if (spec === 'minor') return `${major}.${minor + 1}.0`;
  if (spec === 'patch') return `${major}.${minor}.${patch + 1}`;
  console.error(`Not a version or a bump keyword: ${spec}`);
  process.exit(2);
}

const to = nextVersion(target);
if (to === from) {
  console.error(`Already at ${from} — nothing to do.`);
  process.exit(1);
}

const changed = [];

/** Rewrite internal ranges in one dependency block. Returns edits made. */
function retargetDeps(block, label, edits) {
  if (!block) return;
  for (const name of Object.keys(block)) {
    if (!name.startsWith(SCOPE)) continue;
    const next = `^${to}`;
    if (block[name] !== next) {
      edits.push(`${label}.${name}: ${block[name]} → ${next}`);
      block[name] = next;
    }
  }
}

function updateManifest(path, { setVersion }) {
  const raw = readFileSync(path, 'utf8');
  const pkg = JSON.parse(raw);
  const edits = [];

  if (setVersion && pkg.version !== to) {
    edits.push(`version: ${pkg.version} → ${to}`);
    pkg.version = to;
  }
  retargetDeps(pkg.dependencies, 'dependencies', edits);
  retargetDeps(pkg.devDependencies, 'devDependencies', edits);
  retargetDeps(pkg.peerDependencies, 'peerDependencies', edits);

  if (!edits.length) return;
  changed.push([path.replace(`${root}/`, ''), edits]);

  // Preserve the file's original indentation and trailing newline so the diff
  // stays limited to the versions themselves.
  const indent = /\n(\s+)"/.exec(raw)?.[1].length ?? 2;
  const out = JSON.stringify(pkg, null, indent) + (raw.endsWith('\n') ? '\n' : '');
  if (!dryRun) writeFileSync(path, out);
}

for (const dir of packageDirs) updateManifest(manifestPath(dir), { setVersion: true });
// The root manifest is private and keeps its own version; only its dependency
// on the published set moves.
updateManifest(join(root, 'package.json'), { setVersion: false });

// README carries the version in three places that go stale silently: the
// heading above the install snippet, the snippet itself, and the table column.
const readmePath = join(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const escapedFrom = from.replace(/\./g, '\\.');
const readmeOut = readme
  .replace(new RegExp(`\\*\\*npm packages\\*\\* \\(v${escapedFrom}\\)`, 'g'), `**npm packages** (v${to})`)
  .replace(new RegExp(`(${SCOPE}[a-z-]+)@\\^${escapedFrom}`, 'g'), `$1@^${to}`)
  .replace(
    new RegExp(`(\\|\\s*\\[\`${SCOPE}[a-z-]+\`\\]\\([^)]+\\)\\s*\\|\\s*)${escapedFrom}(\\s*\\|)`, 'g'),
    `$1${to}$2`,
  );
if (readmeOut !== readme) {
  const n = readme.split('\n').filter((l, i) => l !== readmeOut.split('\n')[i]).length;
  changed.push(['README.md', [`${n} line(s) updated to ${to}`]]);
  if (!dryRun) writeFileSync(readmePath, readmeOut);
}

console.log(`${dryRun ? 'Would bump' : 'Bumped'} ${from} → ${to}\n`);
for (const [file, edits] of changed) {
  console.log(`  ${file}`);
  for (const e of edits) console.log(`    ${e}`);
}

if (dryRun) {
  console.log('\nDry run — nothing was written.');
} else {
  console.log(`
Next:
  1. npm install                       # refresh package-lock.json
  2. edit packages/CHANGELOG.md        # add the ${to} entry
  3. npm run check                     # lint + test + build
  4. git commit -am "release: v${to}"
  5. git tag -a v${to} -m "v${to}" && git push origin main --follow-tags`);
}
