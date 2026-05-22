# Benchmark scenarios

Fifty synthetic “fake site” pages for the AgentDOM / WCI benchmark demo and evals.

## Layout

Each scenario is a folder under `demo/scenarios/`:

```
demo/scenarios/
  manifest.json              # ordered list of all scenario ids
  ground-truth.generated.json # Playwright-verified selectors (regenerate via script)
  {scenario-id}/
    raw.html                 # noisy, realistic DOM (no data-agent-*)
    annotated.html           # same DOM tree with data-agent-* overlay injected
    meta.json                # title, icon, difficulty, task steps, challenges
```

## Structural diversity

| Tier | Count | Notes |
|------|-------|--------|
| **Legacy** | 5 | Hand-authored rich DOM (`flight-booking` … `admin-dashboard`) — preserved on disk |
| **Generated** | 45 | **Distinct layout archetypes** per domain (not a shared template) |

Generated pages use embedded `<style>` blocks and BEM-ish class prefixes per site (e.g. `.hf-` HireFlow, `.tx-` TaxEase). Examples:

- **job-board** — filter sidebar + job card list (`ul` / `li`)
- **tax-filing** — multi-step wizard with progress nav
- **email-client** — nested `<table>` inbox + reading pane
- **streaming-service** — hero + horizontal title tiles
- **wiki-edit** — toolbar + split editor / diff columns
- **food-delivery** — restaurant grid + fixed cart drawer
- **bug-report** — modal `<dialog>` over overlay

Each page includes realistic noise: headers, ads, footers, tracking pixels, duplicate CTAs, and domain-specific decoys.

## Annotation overlay model

`annotated.html` is **not** a separate minimal stub document. The setup script:

1. Builds `raw.html` for the scenario.
2. Parses it with JSDOM and injects `data-agent-id`, `data-agent-role`, `data-agent-desc`, `data-agent-action`, `data-agent-state`, `data-agent-scope`, and `data-agent-priority` on the page landmark, primary action, decoys, and optional sub-landmarks.
3. Writes the serialized result as `annotated.html` (same element tree as raw).

Primary `wciNodeId` in `meta.json` / `ground-truth.generated.json` must match the injected id on the primary target. `rawSelectors` must resolve in `raw.html` (verified by `npm run eval:verify`).

Legacy scenarios keep their existing abstract annotated views from the original benchmark (semantic graph only). Generated scenarios use the overlay model above.

## Regenerating files

```bash
node scripts/setup-benchmark-scenarios.mjs
```

This:

- Preserves legacy `raw.html` / `annotated.html` for the five hand-authored scenarios
- Regenerates all 45 generated scenarios from `scripts/lib/scenario-layouts.mjs`
- Refreshes `manifest.json` and `ground-truth.generated.json` from each `meta.json` `groundTruth` field

Implementation modules:

- `scripts/lib/scenario-layouts.mjs` — per-id DOM builders
- `scripts/lib/annotate-html.mjs` — overlay injection

## Loading

- **Node / evals** (`tsx evals/run-benchmark.ts`): `fs.readFileSync` relative to `demo/benchmark.ts`.
- **Vite demo**: `import.meta.glob` with `?raw` for `raw.html`, `annotated.html`, and `meta.json`.

## Eval subset

Full benchmark runs all 50 scenarios. To limit cost or runtime:

```bash
npm run eval:heuristic -- --scenarios=flight-booking,banking,checkout
npm run eval:verify -- --scenarios=job-board,healthcare-portal
```

Default (no flag) still runs every scenario in `manifest.json`.
