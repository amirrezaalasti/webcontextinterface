#!/usr/bin/env node
/**
 * Verify each scenario ground-truth WCI id exists in annotated.html and is grounding-visible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = path.join(__dirname, '../demo/scenarios');
const GT_PATH = path.join(SCENARIOS_DIR, 'ground-truth.generated.json');

function isGroundingEl(el) {
  const role = el.getAttribute('data-wci-role');
  const action = el.getAttribute('data-wci-action');
  if (!action) return false;
  if (role === 'action' || role === 'form') return true;
  return role === 'nav' && action === 'navigate';
}

function main() {
  const gt = JSON.parse(fs.readFileSync(GT_PATH, 'utf8'));
  let ok = 0;
  let fail = 0;

  for (const [scenarioId, entry] of Object.entries(gt)) {
    const annPath = path.join(SCENARIOS_DIR, scenarioId, 'annotated.html');
    if (!fs.existsSync(annPath)) {
      console.log(`❌ ${scenarioId}: missing annotated.html`);
      fail++;
      continue;
    }
    const html = fs.readFileSync(annPath, 'utf8');
    const doc = new JSDOM(html).window.document;
    const id = entry.wciNodeId;
    const el = doc.querySelector(`[data-wci-id="${id}"]`) ?? doc.getElementById(id);

    if (!el) {
      console.log(`❌ ${scenarioId}: ${id} NOT FOUND in annotated HTML`);
      fail++;
      continue;
    }
    if (!isGroundingEl(el)) {
      console.log(`❌ ${scenarioId}: ${id} not a grounding node (role=${el.getAttribute('data-wci-role')})`);
      fail++;
      continue;
    }
    let state = {};
    try {
      state = JSON.parse(el.getAttribute('data-wci-state') ?? '{}');
    } catch {
      /* ignore */
    }
    const primary = el.getAttribute('data-wci-primary') === 'true';
    if (state.disabled === true && !primary) {
      console.log(`⚠️  ${scenarioId}: ${id} disabled in HTML (eval patch may still enable)`);
    }
    const p1 = [...doc.querySelectorAll('[data-wci-priority="1"][data-wci-action]')].map((e) =>
      e.getAttribute('data-wci-id')
    );
    const competitors = [...doc.querySelectorAll('[data-wci-competitor="true"]')].map((e) =>
      e.getAttribute('data-wci-id')
    );
    console.log(
      `✅ ${scenarioId}: ${id} p=${el.getAttribute('data-wci-priority')} primary=${primary} p1_actions=${p1.length} competitors=${competitors.length}`
    );
    ok++;
  }

  console.log(`\n${ok} ok, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
