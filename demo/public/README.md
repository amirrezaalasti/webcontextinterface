# Benchmark result artifacts

Published evaluation outputs from `npm run eval:benchmark`. The demo leaderboard reads `eval-results.json` by default; model-specific copies below are kept for comparison and docs.

## Files

| File | Contents |
|------|----------|
| `eval-results-all.json` | **Merged leaderboard** for all archived models — **demo loads this first** |
| `eval-results.json` | Single-model snapshot (fallback if `eval-results-all.json` missing) |
| `eval-report.json` | Full per-scenario, per-approach breakdown (same shape as `eval-report-<model>.json`) |
| `eval-results-<model>.json` | Snapshot for one OpenRouter run (e.g. `eval-results-gpt5nano.json`) |
| `eval-report-<model>.json` | Full report for that run (e.g. `eval-report-gemini3.5flash.json`) |

### Current snapshots (50 scenarios × 5 approaches)

| Results | Report | Model | Run time (UTC) |
|---------|--------|-------|----------------|
| [eval-results.json](./eval-results.json) | [eval-report.json](./eval-report.json) | **GPT-5** (`openai/gpt-5`) — *latest demo default* | 2026-05-22T23:09:02Z |
| [eval-results-qwen257B.json](./eval-results-qwen257B.json) | [eval-report-qwen257B.json](./eval-report-qwen257B.json) | Qwen 2.5 7B (`qwen/qwen-2.5-7b-instruct`) | 2026-05-22T22:38:19Z |
| [eval-results-gpt5nano.json](./eval-results-gpt5nano.json) | [eval-report-gpt5nano.json](./eval-report-gpt5nano.json) | GPT-5 Nano (`openai/gpt-5-nano`) | 2026-05-22T21:51:31Z |
| [eval-results-gemini3.5flash.json](./eval-results-gemini3.5flash.json) | [eval-report-gemini3.5flash.json](./eval-report-gemini3.5flash.json) | Gemini 3.5 Flash | 2026-05-22T22:08:47Z |
| [eval-results-gptoss20B.json](./eval-results-gptoss20B.json) | [eval-report-gptoss20B.json](./eval-report-gptoss20B.json) | GPT-OSS 20B | 2026-05-22T22:27:15Z |
| [eval-results-llama318B.json](./eval-results-llama318B.json) | [eval-report-llama318B.json](./eval-report-llama318B.json) | Llama 3.1 8B | 2026-05-22T22:14:28Z |

After a new run, archive copies with a model suffix (e.g. `eval-results-gpt5.json`) so `eval-results.json` can point at the model you want on the demo leaderboard.

After adding or updating `eval-results-*.json` snapshots:

```bash
npm run eval:merge-leaderboard   # writes eval-results-all.json (6 models)
npm run demo                     # refresh leaderboard in the site
```

Optional single-model fallback:

```bash
cp demo/public/eval-results-<your-model>.json demo/public/eval-results.json
```

## Report JSON shape

**`eval-results-*.json`** (leaderboard; `approaches` block matches the paper table when merged from `eval-report-*.json`):

```json
{
  "generatedAt": "ISO-8601",
  "modelOrder": [{ "id", "name", "openRouterModel" }],
  "<modelId>": {
    "standard": { "successRate": 0-100, "avgTokens": number },
    "wci": { "successRate", "avgTokens" },
    "wciFull": { "successRate", "avgTokens" }
  }
}
```

**`eval-report-*.json`** (audit trail):

- `methodology` — harness description for that run
- `models[].approaches` — keys: `raw-html`, `dom-outline`, `interactive-candidates`, `wci-full`, `wci-grounding`
- Each approach: `runs`, `correct`, `successRate`, `avgTokens`, `byScenario` with `parsed`, `rawResponse`, `validationError`

Use reports to inspect **which scenario failed** and the model’s exact answer.

See [evals/README.md](../../evals/README.md) for methodology, per-approach **success %** and **token** tables, and analysis built from these files.
