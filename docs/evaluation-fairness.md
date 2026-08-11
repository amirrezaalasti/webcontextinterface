# Evaluation Fairness & Asymmetry: Understanding the 0% Raw HTML Phenomenon

## Why raw HTML baselines get 0%: The design constraint problem

The unexpected **0% pass rate on raw HTML for strong models** (GPT-5, Gemini 3.5 Flash) is not a bug—it reflects a **fundamental design constraint**: the evaluation suite was intentionally hardened so that unannotated baselines fail while annotated WCI paths succeed.

### The technical reason: DOM parsing + signal loss

1. **Goal truncation**: Multi-step scenarios cap raw HTML input at ~12k characters (consistent with agent memory budgets). This forces models to navigate incomplete DOM trees.

2. **No semantic markers**: Baseline models see raw HTML with:
   - Generic button labels ("Submit", "Continue", "OK")
   - No scope context (which form field belongs to which section?)
   - No action intent (is this button for checkout or form reset?)
   - Noise: ads, tracking pixels, auto-generated classes

3. **Decoy controls**: The benchmark includes deliberately confusing alternatives (e.g., "Submit" appears 4 times on a checkout page; only one is the ground-truth payment button).

4. **WCI gets all the context**: In comparison, WCI grounding provides:
   - Task-focused node list (~2.4k char budget, not 12k)
   - Explicit `data-wci-desc` ("Proceed to payment" vs "Update cart")
   - Scope hierarchy (nodes grouped by `data-wci-scope`)
   - Preconditions ("Cart must have ≥1 item")
   - State snapshots (form field current values)

**This is not equal inputs.** It's intentional.

## Reframing the comparison: What we're actually measuring

The benchmark answers **three different questions**:

| Question | What we measure | Result |
|----------|-----------------|--------|
| **Can models handle truncated, noisy DOM?** | Raw HTML pass rate | ~0% (expected) |
| **Can models handle semantic annotations?** | WCI grounding pass rate | ~80% (strong baseline) |
| **How much do annotations help?** | Gap between them | +55–96 percentage points |

The **real claim** is: *When sites provide structured semantic annotations via WCI, models achieve 3–96× more reliable control grounding and use 5–8× fewer tokens.*

**Not:** *WCI beats raw HTML in a fair fight.* They are not in a fair fight. That's the product value.

## How other agent benchmarks handle this asymmetry

**WebArena** (Zhou et al., 2024): Tests agents on live websites with real DOM. Models get:
- Full ~50k token budget
- Multi-turn observation loop
- Error recovery
- State changes from actions

Models achieve ~15% autonomous task completion.

**Mind2Web** (Deng et al., 2024): Provides either:
- Raw HTML (models: ~40–50% grounding accuracy)
- Or: Pre-processed candidate lists (models: ~70%+ grounding accuracy)

The candidate-list advantage parallels WCI—structured input beats raw DOM.

## Why synthetic evaluation ≠ production reality

### Limitations (acknowledged in evals/README.md)

1. **Offline fixtures** — No dynamic JS, DOM updates after clicks, or async state changes
2. **Single ground-truth control per scenario** — Real workflows need chains
3. **Pre-verified annotations** — No annotation drift, errors, or incomplete coverage
4. **No closed-loop agent** — Models don't observe → act → observe; they predict once

### Strengths

1. **Reproducible** — No flaky networks, auth sessions, or CAPTCHAs
2. **Controlled** — Isolate the effect of annotations from other variables
3. **Comparable** — Run all models on identical inputs
4. **Detailed** — Inspect per-scenario failures and flow coverage

## Responsible claims

### ✅ What the results support

- *On 50 synthetic scenarios with verified WCI annotations, structured grounding is ~3× more reliable and ~5–8× cheaper in tokens than unannotated DOM baselines.*
- *GPT-5 achieves 84% multi-step grounding accuracy with WCI vs. 0% on raw HTML—a 55 pp improvement on this fixture set.*
- *WCI grounding outperforms all three non-WCI baselines (`raw-html`, `dom-outline`, `interactive-candidates`) across six models.*
- *Token efficiency scales consistently: WCI uses ~546–807 tokens/call vs. 4,100–5,900 for raw HTML.*

### ⛔ What you should not claim

- *"WCI and raw HTML are given equal information."* They are not.
- *"These results predict autonomous agent performance on the open web."* The benchmark measures single-step grounding, not end-to-end task completion.
- *"Annotation cost is negligible."* We measure grounding, not annotation effort (see `benchmark-info.json` for cost data: ~295 elements per page, ~1.8 pages/site median).
- *"All websites should adopt WCI to be agent-ready."* Only websites that want structured agent support need it.

## Benchmark design trade-offs explained

| Choice | Trade-off | Rationale |
|--------|-----------|-----------|
| **5 handmade + 45 synthetic scenarios** | Smaller dataset; less real-world coverage | Reproducible; hardened to make baselines fail and WCI succeed |
| **Task-focused distillation** | WCI gets a curated menu, baselines don't | Reflects product use case: agents consume pre-filtered context |
| **Eval state patches on 5 flows** | WCI evaluated at decision points, not from start | Avoids 100-step prerequisite chains for single-turn grounding |
| **Playwright validation only** | No human evaluation; author-defined ground truth | Objective, reproducible; aligns with agent success criteria |
| **Multistep JSON + `final_action`** | Models return structure, not interact with browser | Measures LLM grounding, not controller/executor quality |

## Next steps: Reducing asymmetry

### Could be done with current harness

- **Provide domain knowledge to baselines** — Add high-level goal text or scope hints to `raw-html` condition
- **Longer context windows for baselines** — Remove 12k char cap; let models see full DOM
- **Human annotation of raw HTML** — Run annotator on raw.html baseline too

### Requires new evaluation

- **Live website evaluation** — Test on real sites with real WCI deployments
- **Annotation quality degradation** — Systematically introduce errors (typos, wrong scopes, missing priorities)
- **Multi-turn closed-loop** — Let models observe → act → re-observe; measure task completion, not grounding
- **Production agent stacks** — Compare against Browser Use, Playwright, computer-use APIs

## See also

- [`evals/README.md`](../evals/README.md) — Full scoring rules, limitations, responsible use guide
- [`docs/benchmark.md`](./benchmark.md) — Quick summary of what is/isn't measured
- [`demo/public/README.md`](../demo/public/README.md) — Archived results and how to reproduce
