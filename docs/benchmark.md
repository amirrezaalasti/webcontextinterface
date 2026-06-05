# Benchmark overview

Public summary of the **50-scenario WCI grounding benchmark** shown on the [demo site](https://webcontextinterface.vercel.app/demo/#eval-results). For full commands, scoring math, and per-model tables, see the developer guide in [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md).

## What we measure

Can an LLM pick the **right control** for a task when given different views of the same page?

Each scenario is a fictional web UI (checkout, banking, job board, etc.) with a verified ground-truth target. Models answer via **OpenRouter** chat completions — not proprietary agent SDKs or live browser loops.

## Five approaches (same task, different context)

| Approach | What the model sees |
|----------|---------------------|
| **Raw HTML** | Full unannotated page (truncated if huge) |
| **DOM outline** | Shallow tag tree with interactive nodes marked |
| **Interactive candidates** | Numbered list of up to 50 scraped controls |
| **WCI full** | All annotated WCI nodes from `annotated.html` |
| **WCI grounding** | Actionable WCI nodes only — the headline WCI score |

**WCI grounding** is what you ship to an agent: a compact menu of controls with descriptions, state, and preconditions. **WCI full** is an ablation on the same annotations (full graph, no actionable filter).

Baseline approaches simulate agents **without** WCI annotations. The gap between baselines and WCI grounding is the benefit of the annotation layer — that asymmetry is intentional.

## Pass rule (all approaches)

A run **passes** when all of the following hold:

1. **Correct `final_action`** — the model's chosen control matches ground truth (WCI node id or CSS selector, depending on approach).
2. **No decoy** — on WCI paths, the model did not pick a competitor trap node (`data-wci-competitor="true"`).
3. **Flow coverage ≥ 0.8** — the model's action plan covers enough of the expected flow types (observe, act, verify).

Published leaderboard numbers use this **unified pass rule** with `minCoverage` **0.8**.

## Dataset

- **50 scenarios** — five handmade (flight booking, banking, checkout, admin dashboard, social feed) and 45 synthetic layouts.
- Each scenario ships **raw HTML**, **annotated HTML**, and five context representations.
- Published on [Zenodo](https://doi.org/10.5281/zenodo.20434088) (CC BY 4.0). Browse live at [`/demo/scenarios.html`](https://webcontextinterface.vercel.app/demo/scenarios.html).

## What the numbers support

| Claim | Supported? |
|-------|------------|
| WCI grounding helps models pick the right control vs raw DOM | **Yes** — primary comparison |
| WCI grounding uses far fewer tokens than raw HTML | **Yes** — typically ~5–8× fewer per call |
| Which OpenRouter models ground best on this fixture set | **Yes** — compare models on the same input |

## What the numbers do **not** prove

- **Not** a full autonomous agent benchmark — each task is one LLM plan + one scored `final_action`, not a multi-turn observe→act loop.
- **Not** live web browsing — static HTML fixtures in headless Chromium, not dynamic SPAs or auth flows.
- **Not** annotation-free — WCI paths assume correct `data-wci-*` annotations already exist.
- **Not** end-user outcomes — success means the chosen element matches ground truth, not "payment cleared" or "form submitted to a backend."

## Where to go next

| Resource | Contents |
|----------|----------|
| [Demo results](https://webcontextinterface.vercel.app/demo/#eval-results) | Live charts, leaderboard, model prompts |
| [Benchmark eval config](./benchmark-eval-config.md) | OpenRouter slugs, temperature, system prompts |
| [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md) | Full methodology, commands, limitations, analysis |
| [Zenodo dataset](https://doi.org/10.5281/zenodo.20434088) | Download `scenarios.zip` to reproduce |

::: tip Reproduce locally
```bash
npm install
npx playwright install chromium
export OPENROUTER_API_KEY=sk-or-...
npm run eval:multistep -- --models=gpt5Nano --scenarios=banking,checkout
npm run eval:merge-leaderboard
```
:::
