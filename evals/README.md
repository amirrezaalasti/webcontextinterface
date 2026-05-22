# WCI benchmark evaluation

Element-grounding benchmark: pick the correct control for a task using **OpenRouter** models (not proprietary agent SDKs).

## Approaches (5 per scenario)

| ID | What it measures |
|----|------------------|
| `raw-html` | Full HTML, CSS selector answer |
| `dom-outline` | Truncated DOM tree |
| `interactive-candidates` | Numbered controls from raw HTML |
| **`wci-full`** | Full WCI graph (all roles), scope merge, **no** eval state patches |
| **`wci-grounding`** | Actionable nodes only, scope merge, **decision-point** state patches (production path) |

**Headline WCI score** = `wci-grounding` vs `standard` (average of the three raw baselines). **`wci-full`** is an ablation: same annotations, no filter/patches — expect lower accuracy on banking/checkout/flight.

Legacy alias: `--approaches=wci-distilled` → `wci-grounding`.

## Models (default roster)

Configured in `evals/lib/llm.ts`:

| ID | OpenRouter slug |
|----|-----------------|
| `gpt5Nano` | `openai/gpt-5-nano` |
| `gpt5Mini` | `openai/gpt-5-mini` |
| `gpt5` | `openai/gpt-5` |
| `gemini3Flash` | `google/gemini-3-flash-preview` |
| `gemini35Flash` | `google/gemini-3.5-flash` |
| `gemini2FlashLite` | `google/gemini-2.0-flash-lite-001` |
| `qwen35Flash` | `qwen/qwen3.5-flash-02-23` |
| `qwen25_7b` | `qwen/qwen-2.5-7b-instruct` |
| `llama31_8b` | `meta-llama/llama-3.1-8b-instruct` |
| `deepseekV3` | `deepseek/deepseek-chat-v3-0324` |

## Commands

```bash
npm install
npx playwright install chromium

npm run eval:verify
npm run eval:heuristic          # no API key

export OPENROUTER_API_KEY=sk-or-...
npm run eval:benchmark

# Subset of models
npm run eval:benchmark -- --models=gpt5Nano,gpt5Mini,gemini3Flash

# WCI ablation only (10 calls per model)
npm run eval:benchmark -- --approaches=wci-full,wci-grounding --models=gpt5Nano

# Subset of scenarios (50 available — see demo/scenarios/README.md)
npm run eval:benchmark -- --scenarios=flight-booking,banking,checkout
npm run eval:heuristic -- --scenarios=job-board,healthcare-portal
```

Full run ≈ **10 models × 50 scenarios × 5 approaches = 2,500** API calls. Use `--models=`, `--approaches=`, and `--scenarios=` to limit spend. The five legacy scenarios (`flight-booking` … `admin-dashboard`) are the richest DOM; the other 45 use a compact template with verified selectors.

**Reasoning:** every request sends `reasoning: { effort: "low" }` with `max_tokens: 1000`.

## Outputs

- `demo/public/eval-results.json` — `standard`, `wci` (grounding), `wciFull` per model
- `demo/public/eval-report.json` — per-approach breakdown
- `evals/logs/<run-id>/` — per-call LLM I/O (JSON + Markdown). Disable with `--no-logs`.

### LLM I/O logs

```
evals/logs/2026-05-22_20-45-12/
  manifest.json
  gpt5Nano/
    flight-booking__wci-full.json
    flight-booking__wci-grounding.json
    ...
```

The demo leaderboard shows **WCI Grounding** in the main column and **WCI Full** in the model subtitle when results are refreshed.
