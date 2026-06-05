# Benchmark result artifacts

Published **multi-step** evaluation outputs from `npm run eval:multistep`. The demo leaderboard reads `eval-results-all.json` (derived from archived multistep reports via `npm run eval:merge-leaderboard`).

## Source of truth

**Use `eval-results-*.json` and `eval-results-all.json` for published pass rates and leaderboard numbers.**

Those files are built by `npm run eval:merge-leaderboard`, which recomputes `flowCoverage` and `passed` from each archive’s `models[].results[].rawResponse` using the current scorer in `evals/lib/flow-coverage.ts` and `minCoverage` **0.8**.

Do **not** read per-row `passed`, `flowCoverage`, or `models[].summary` directly from `eval-multistep-report-*.json` after a scorer change — those fields are often stale until you re-run merge. The audit trail in reports is still authoritative for `rawResponse`, `parsedFinalAction`, and `validationError`.

**Methodology:** All approaches use the **unified pass rule** — correct `final_action`, no decoy (WCI), flow coverage ≥ **0.8**. See the [Benchmark overview](../../docs/benchmark.md) for a public summary; [evals/README.md](../../evals/README.md) has full commands, limitations, and analysis.

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
  "minCoverage": 0.8,
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

- `methodology`, `minCoverage` — run configuration (header should be **0.8**; older archives may list 0.6 or 0.667 from earlier defaults)
- `models[].summary` — per approach: `passRate`, `finalActionAccuracy`, `avgCoverage`, `avgTokens` (**stale** until `eval:merge-leaderboard`; use `eval-results-*.json` instead)
- `models[].results` — per scenario: `correctFinalAction`, `flowCoverage`, `passed`, `parsedFinalAction`, `rawResponse`, `validationError`, … (`passed` / `flowCoverage` here may be stale; merge recomputes from `rawResponse`)

Use reports to inspect **which scenario failed** and the model’s plan / final action. **Leaderboard pass rates** live only in `eval-results-*.json`, recomputed from `results[].rawResponse` + current `evals/lib/flow-coverage.ts` when you run `eval:merge-leaderboard`.

See [docs/benchmark.md](../../docs/benchmark.md) for methodology and [evals/README.md](../../evals/README.md) for comparison tables, limitations, and analysis.
