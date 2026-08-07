// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — process entry point
// ─────────────────────────────────────────────────────────────────────────────

import { createNodeContext } from './node-context';
import { run } from './run';

const ctx = createNodeContext();

run(process.argv.slice(2), ctx)
  .then(code => { process.exitCode = code; })
  .catch((err: unknown) => {
    ctx.error(`wci: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  });
