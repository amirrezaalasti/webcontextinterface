#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Verify the built dist/ artifacts are consumable.
//
// The test suite runs against src/ so failures point at the line to fix. That
// leaves a gap: a package can pass every test and still ship a broken bundle —
// a missing export, a bad `exports` map, a type that does not resolve. This
// imports the published entry points the way a consumer would.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) return result.then(
      () => console.log(`  ok   ${name}`),
      err => { failures.push(`${name}: ${err.message}`); console.log(`  FAIL ${name}`); },
    );
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL ${name}`);
  }
}

const PAGE = `<!doctype html><html><head><title>Verify</title></head><body>
  <section data-wci-role="landmark" data-wci-id="zone" data-wci-desc="A bounded task zone">
    <input data-wci-id="field" data-wci-role="form" data-wci-desc="A text field here"
           data-wci-action="fill" data-wci-scope="zone" data-wci-state='{"value":""}' />
    <button data-wci-id="go" data-wci-role="action" data-wci-desc="Submit the form now"
            data-wci-action="click" data-wci-scope="zone"></button>
  </section>
</body></html>`;

console.log('\nESM entry points');

const dom = new JSDOM(PAGE);
globalThis.document = dom.window.document;
globalThis.window = dom.window;

const spec = await import('@webcontextinterface/spec');
const distiller = await import('@webcontextinterface/distiller');
const bridge = await import('@webcontextinterface/bridge');
const context = await import('@webcontextinterface/context');
const validator = await import('@webcontextinterface/validator');
const annotator = await import('@webcontextinterface/annotator');
const core = await import('@webcontextinterface/core');

check('spec exports readWciNodeSpec + guards', () => {
  if (typeof spec.readWciNodeSpec !== 'function') throw new Error('readWciNodeSpec missing');
  if (typeof spec.findWciElement !== 'function') throw new Error('findWciElement missing');
  if (!Array.isArray(spec.VALID_WCI_ROLES)) throw new Error('VALID_WCI_ROLES missing');
});

check('distiller produces a view', () => {
  const view = new distiller.WciDistiller().toView(dom.window.document);
  if (view.node_count !== 3) throw new Error(`expected 3 nodes, got ${view.node_count}`);
  if (view.page_title !== 'Verify') throw new Error('page title missing');
});

check('distiller diffs two views', () => {
  const a = new distiller.WciDistiller().toView(dom.window.document);
  const b = JSON.parse(JSON.stringify(a));
  b.nodes[0].state = { value: 'changed' };
  const d = distiller.diffViews(a, b);
  if (d.updated.length !== 1) throw new Error('diff did not detect the change');
});

await check('bridge dispatches an action', async () => {
  const b = new bridge.WciBridge(dom.window.document.body);
  const r = await b.fill('field', 'hello');
  if (!r.success) throw new Error(`dispatch failed: ${r.error?.message}`);
  b.destroy();
});

check('context enforces a policy', () => {
  const engine = new context.PolicyEngine({
    allowedScopes: [], deniedScopes: ['zone'], rateLimitActions: 60,
    rateLimitDistil: 120, authRequired: [], requireHumanConfirmation: [],
  });
  if (!engine.isScopeDenied('zone')) throw new Error('deny rule not applied');
});

check('validator lints markup', () => {
  const report = validator.validateMarkup(dom.window.document.body);
  if (!report.valid) throw new Error(`clean markup reported invalid: ${report.issues[0]?.message}`);
});

check('validator lints site files', () => {
  if (!validator.validateWciTxt('Site-Name: X\nSite-Purpose: Y\nContact: z').valid) {
    throw new Error('valid wci.txt reported invalid');
  }
});

check('annotator derives nodes from unannotated HTML', () => {
  // A page with no data-wci-* at all: everything here has to come from the
  // accessibility semantics, which is the whole point of the package.
  const plain = new JSDOM(
    '<!doctype html><html><body><main>' +
    '<label for="email">Billing email</label><input id="email" type="email">' +
    '<button type="submit">Place order</button>' +
    '</main></body></html>',
  );
  const view = annotator.inferView(plain.window.document);
  if (!view.nodes?.length) throw new Error('inferView derived no nodes');
  if (!view.nodes.some((n) => n.desc === 'Billing email')) {
    throw new Error('label[for] was not used as the description');
  }
  plain.window.close();
});

check('core re-exports every layer', () => {
  for (const name of [
    'WciDistiller', 'WciDistillerSession', 'WciBridge', 'PolicyEngine',
    'WciContextLoader', 'validateMarkup', 'diffViews', 'readWciNodeSpec',
    'inferAnnotations', 'applyInferredAnnotations', 'inferView',
  ]) {
    if (core[name] === undefined) throw new Error(`core is missing ${name}`);
  }
});

console.log('\nCJS entry points');

check('spec loads via require', () => {
  const cjs = require('@webcontextinterface/spec');
  if (typeof cjs.readWciNodeSpec !== 'function') throw new Error('readWciNodeSpec missing');
});

check('core loads via require', () => {
  const cjs = require('@webcontextinterface/core');
  if (typeof cjs.WciDistiller !== 'function') throw new Error('WciDistiller missing');
});

console.log('\nType declarations');

check('every package ships an index.d.ts', () => {
  const missing = [
    'spec', 'distiller', 'bridge', 'context', 'validator', 'annotator',
    'react', 'cli', 'mcp', 'core',
  ].filter(p => !existsSync(resolve(repoRoot, 'packages', p, 'dist/index.d.ts')));
  if (missing.length) throw new Error(`no index.d.ts for: ${missing.join(', ')}`);
});

check('executable packages ship their bin entry', () => {
  const missing = [['cli', 'cli.js'], ['mcp', 'server.js']]
    .filter(([p, f]) => !existsSync(resolve(repoRoot, 'packages', p, 'dist', f)));
  if (missing.length) {
    throw new Error(`missing bin: ${missing.map(([p, f]) => `${p}/${f}`).join(', ')}`);
  }
});

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\nAll dist checks passed.\n');
