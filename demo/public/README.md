# Benchmark result artifacts

Published **multi-step** evaluation outputs from `npm run eval:multistep`. The demo leaderboard reads `eval-results-all.json` (derived from archived multistep reports via `npm run eval:merge-leaderboard`).

**Methodology:** All approaches use the **unified pass rule** — correct `final_action`, no decoy (WCI), flow coverage ≥ 0.6. See [evals/README.md](../../evals/README.md) for full scope, limitations, and how to interpret WCI vs baseline gaps.

## Files

| File | Contents |
|------|----------|
| `eval-config.json` | **Models, temperature, max_tokens, and exact system prompts** — demo Evaluation Results panel |
| `eval-results-all.json` | **Merged leaderboard** for all archived models — **demo loads this first** |
| `eval-results.json` | Single-model snapshot (fallback; default **GPT-5**) |
| `eval-results-<model>.json` | Leaderboard row for one model (e.g. `eval-results-gpt5nano.json`) |
| `eval-multistep-report-<model>.json` | Full per-scenario audit trail for that run |

## Current snapshots (50 scenarios × 5 approaches, primary multi-step task)

| Results | Report | Model |
|---------|--------|-------|
| [eval-results.json](./eval-results.json) | [eval-multistep-report-gpt5.json](./eval-multistep-report-gpt5.json) | **GPT-5** — *demo default* |
| [eval-results-gpt5nano.json](./eval-results-gpt5nano.json) | [eval-multistep-report-gpt5nano.json](./eval-multistep-report-gpt5nano.json) | GPT-5 Nano |
| [eval-results-gemini3.5flash.json](./eval-results-gemini3.5flash.json) | [eval-multistep-report-gemini35flash.json](./eval-multistep-report-gemini35flash.json) | Gemini 3.5 Flash |
| [eval-results-qwen257B.json](./eval-results-qwen257B.json) | [eval-multistep-report-qwen-gptoss.json](./eval-multistep-report-qwen-gptoss.json) | Qwen 2.5 7B |
| [eval-results-gptoss20B.json](./eval-results-gptoss20B.json) | [eval-multistep-report-qwen-gptoss.json](./eval-multistep-report-qwen-gptoss.json) | GPT-OSS 20B |
| [eval-results-llama318B.json](./eval-results-llama318B.json) | [eval-multistep-report-llama318B.json](./eval-multistep-report-llama318B.json) | Llama 3.1 8B |

After a new multistep run, archive the report:

```bash
cp demo/public/eval-multistep-report.json demo/public/eval-multistep-report-<your-model>.json
npm run eval:merge-leaderboard   # recomputes pass/coverage; writes eval-results-*.json + eval-results-all.json
npm run demo                     # refresh leaderboard in the site
```

## Report JSON shape

**`eval-results-*.json`** (leaderboard; built by `npm run eval:merge-leaderboard`):

```json
{
  "generatedAt": "ISO-8601",
  "methodology": "multistep",
  "passRule": "unified",
  "minCoverage": 0.6,
  "modelOrder": [{ "id", "name", "openRouterModel" }],
  "<modelId>": {
    "standard": { "successRate": 0-100, "avgTokens": number },
    "wci": { "successRate", "avgTokens" },
    "approaches": {
      "rawHtml": { "successRate", "avgTokens" },
      "wciGrounding": { "successRate", "avgTokens" }
    }
  }
}
```

**`eval-multistep-report-*.json`** (audit trail):

- `methodology`, `minCoverage` — run configuration
- `models[].summary` — per approach: `passRate`, `finalActionAccuracy`, `avgCoverage`, `avgTokens` (may be stale until re-merged)
- `models[].results` — per scenario: `correctFinalAction`, `flowCoverage`, `passed`, `parsedFinalAction`, `rawResponse`, `validationError`, …

Use reports to inspect **which scenario failed** and the model’s plan / final action. Leaderboard pass rates are recomputed from `results` + current `evals/lib/flow-coverage.ts` when you run `eval:merge-leaderboard`.

See [evals/README.md](../../evals/README.md) for methodology, comparison tables, limitations, and analysis.
