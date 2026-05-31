# Benchmark scenarios

Fifty synthetic “fake site” pages for the AgentDOM / WCI benchmark demo and evals.

**Web browser:** open [`/demo/scenarios.html`](../scenarios.html) (or run `npm run demo` and click **Scenarios** in the header) to preview raw vs annotated HTML and hover annotated nodes for `data-wci-*` details.

**Official release:** [Zenodo 10.5281/zenodo.20434088](https://doi.org/10.5281/zenodo.20434088) — download [`scenarios.zip`](https://zenodo.org/records/20434088/files/scenarios.zip?download=1) (CC BY 4.0).

## Layout

Each scenario is a folder under `demo/scenarios/`:

```
demo/scenarios/
  manifest.json              # ordered list of all scenario ids
  ground-truth.generated.json # Playwright-verified selectors (regenerate via script)
  multi-step.generated.json  # catalog of richer multi-step tasks per scenario
  {scenario-id}/
    raw.html                 # noisy, realistic DOM (no data-wci-*)
    annotated.html           # same DOM tree with data-wci-* overlay injected
    meta.json                # title, icon, difficulty, single-shot + multi-step tasks
```

## Structural diversity

| Tier | Count | Notes |
|------|-------|--------|
| **Handmade** | 5 | Hand-authored rich DOM — flight booking, banking, checkout, dashboard, social media (`flight-booking`, `banking`, `checkout`, `admin-dashboard`, `social-feed`) — preserved on disk |
| **Synthetic** | 45 | **Distinct layout archetypes** per domain (not a shared template) |

Synthetic pages use embedded `<style>` blocks and BEM-ish class prefixes per site (e.g. `.hf-` HireFlow, `.tx-` TaxEase). Examples:

- **job-board** — filter sidebar + job card list (`ul` / `li`)
- **tax-filing** — multi-step wizard with progress nav
- **email-client** — nested inbox + reading pane
- **streaming-service** — hero + horizontal title tiles
- **wiki-edit** — toolbar + split editor / diff columns
- **food-delivery** — restaurant grid + fixed cart drawer
- **bug-report** — modal `<dialog>` over overlay

## Difficulty design (synthetic scenarios)

Benchmark tasks are meant to stress **reasoning**, not string-matching button labels or `#verb-noun` ids.

**Raw HTML**

- Primary actions use **generic labels** (`Confirm`, `Continue`, `Submit`) — not quotes from the task goal.
- Correct targets are identified by **structure and data attributes** (e.g. `[data-employer-ref="ACM-447"] .hf-btn--primary`, `tr[data-rx="lisinopril-10"] .rx-btn--primary`), not goal-leaking `id`s.
- **Noise shell** on every generated page: cookie banner, secondary nav, duplicate Submit/Continue rows, sponsored aside, hidden A/B variant, ~80+ filler links/buttons (pushes real CTAs later in candidate lists).
- **Keyword trap** buttons: decoy CTAs whose visible text overlaps goal keywords so raw-html heuristics pick the wrong index.
- Domain-specific content stays **distinct** per scenario (no shared single-button template).

**Goals (`scripts/lib/scenario-goals.mjs`)**

- Constraint-based requirements (cheapest nonstop, Tuesday 14:30 video slot, employer ref ACM-447, etc.).
- Avoid naming the exact primary button label.

**Annotated overlay**

- Same DOM as `raw.html`; `data-wci-id` on the true target may stay semantic (`apply-senior-engineer`, `schedule-video-visit`) for WCI evals.
- `data-wci-desc` carries the full constraint goal so WCI grounding remains high when annotations are good.

**Ground truth**

- `rawSelectors` are Playwright-verified structural selectors (see `npm run eval:verify`).
- `decoyNodeIds` include `decoy-promo`, `decoy-nav`, and `decoy-extra` where injected.

**Handmade (5)** — unchanged hand-authored DOM; already hard (flight booking, banking, checkout, dashboard, social media). Do not simplify. Embedded layout CSS is injected via `npm run scenarios:legacy-styles` (also runs when preserving handmade files in `setup-benchmark-scenarios.mjs`).

**Dashboard (`admin-dashboard`)** — after overlay auto-completion, `refineAdminDashboardAnnotations` in `scripts/lib/scenario-enrich-annotate.mjs` encodes the multi-step task: `deals-table` state with open vs closed probability, `top-probability-row` / `deal-foxtrot-closed` row hints, primary `export-btn` (priority 1) vs decoy `export-csv-btn`, and dismissable `shortcuts-overlay`. Handmade annotated pages are maintained on disk; for synthetic scenarios use `npm run scenarios:rebuild-annotations`.

**photo-upload** — `refinePhotoUploadAnnotations` encodes album constraints: `album-selector` state, target `album-iceland-2026` vs misleading `album-iceland-2024-decoy`, primary `upload-iceland-album` (priority 1) inside `[data-album="iceland-2026"]`, keyword-trap duplicate row decoys, and thumb/staging preconditions for validation multi-step tasks.

**calendar-app** — `refineCalendarAppAnnotations` encodes series vs grid constraints: `calendar-week-grid` warns against `+ Add` one-off cells, `recurring-series-panel` scopes primary `create-standup-series` (`data-series="weekday-standup-09"`), and `oneoff-confirm-decoy` / keyword-trap rows are priority 5.

**scholarship-apply** — `refineScholarshipApplyAnnotations` encodes STEM vs waiver constraints: `type-waiver-decoy` and `fee-waiver-decoy` (priority 5), `submit-stem-scholarship` on `button[data-app="stem"]` (priority 1), and `eligibility-confirm` for validation multi-step.

## Annotation overlay model

`annotated.html` is **not** a separate minimal stub document. The setup script:

1. Builds `raw.html` for the scenario.
2. Parses it with JSDOM and injects `data-wci-id`, `data-wci-role`, `data-wci-desc`, `data-wci-action`, `data-wci-state`, `data-wci-scope`, and `data-wci-priority` on the page landmark, primary action, decoys, and optional sub-landmarks.
3. Writes the serialized result as `annotated.html` (same element tree as raw).

Primary `wciNodeId` in `meta.json` / `ground-truth.generated.json` must match the injected id on the primary target. `rawSelectors` must resolve in `raw.html` (verified by `npm run eval:verify`).

Handmade scenarios keep their existing abstract annotated views from the original benchmark (semantic graph only). Synthetic scenarios use the overlay model above.

**Styling:** All 50 scenarios ship embedded CSS for readable demo previews. Generated pages use shared chrome in `scripts/lib/scenario-dom-noise.mjs`; legacy pages use `scripts/lib/legacy-scenario-styles.mjs`. Refresh everything with:

```bash
npm run scenarios:restyle
```

## Regenerating files

```bash
node scripts/setup-benchmark-scenarios.mjs
```

This:

- Preserves handmade `raw.html` / `annotated.html` for the five hand-authored scenarios (flight booking, banking, checkout, dashboard, social media)
- Regenerates all 45 synthetic scenarios from `scripts/lib/scenario-layouts.mjs`
- Refreshes `manifest.json`, `ground-truth.generated.json`, and `multi-step.generated.json`

Multi-step evaluation runner:

```bash
npm run eval:multistep -- --models=gpt5Nano
```

Implementation modules:

- `scripts/lib/scenario-dom-noise.mjs` — shared cookie/filler/decoy shell
- `scripts/lib/scenario-goals.mjs` — constraint-based task goals
- `scripts/lib/scenario-layouts.mjs` — per-id DOM builders
- `scripts/lib/scenario-layouts-registers.mjs` — hardened register batch layouts
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

Expected heuristic ballpark after hardening (deterministic keyword baseline, not LLM):

- **raw-html** on generated set: low single digits–teens % (keyword traps + generic CTAs)
- **wci-grounding**: high 90s–100% when annotations encode constraints
