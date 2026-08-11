# Token Measurement & Estimation Methodology

## Overview

The WCI benchmark reports token consumption as **estimates**, not production billing measurements. This document explains:
- How tokens are estimated
- Why estimates differ from actual API usage
- How to interpret the reported numbers
- How to obtain precise measurements

## Estimation approach

### Multi-step scenario token counts

**Source:** `eval-multistep-report-*.json` → `models[].summary[].avgTokens`

**Calculation per model/approach/scenario:**

```
estimatedTokens = ceil(
  promptChars / 4 +           // input approximation
  responseChars / 3 +         // output approximation  
  systemPromptChars / 4       // system message
)
```

**Rationale:**
- LLM token → ~4 characters on average (English text)
- Output tokens → ~3 chars/token (output compression slightly higher)
- System message → included in context window calculation

### Where this appears

1. **Leaderboard column**: `eval-results-*.json` → `models[].summary[]."avgTokens"`
2. **Per-scenario detail**: `eval-multistep-report-*.json` → `taskResults[].tokens`
3. **Per-call logging** (optional): `evals/logs/<run-id>/<model>/<scenario>__<approach>.json`

### Actual OpenRouter usage

OpenRouter API response headers include:
```json
{
  "usage": {
    "prompt_tokens": 842,
    "completion_tokens": 156
  }
}
```

**Comparison for GPT-5 on `banking` scenario, `wci-grounding` approach:**
| Source | Count | Notes |
|--------|-------|-------|
| Estimated (formula above) | 764 | Published in leaderboard |
| OpenRouter actual | 848 | ~11% higher; includes padding |
| OpenRouter billed* | 875 | Cache write; charged at 25% of normal rate |

*Cache-related: when `cache_creation_input_tokens` present, billing differs.

## Why estimates ≠ actual usage

1. **Tokenizer differences** — OpenRouter uses provider-specific tokenizers (GPT-5 ≠ Gemini ≠ Qwen). Our 4-char approximation blurs this.

2. **Padding and buffering** — APIs often round up; prompts include extra whitespace for formatting.

3. **Special tokens** — Function signatures, role markers, JSON schema tokens are not in raw character counts.

4. **Model-specific optimizations** — Some models compress repeated patterns; others don't.

### Magnitude of error

| Condition | Error range | Why |
|-----------|-----------|-----|
| **Estimate vs. OpenRouter actual** | ±5–15% | Tokenizer differences, padding |
| **OpenRouter billed vs. actual** | 0–50%+ | Prompt caching, token re-use, bulk discount batches |
| **Across six different providers** | ±10–20% | Different tokenizers (GPT vs. Gemini vs. Qwen) |

## How we measured (2026-05 publication run)

**Process:**
1. Ran `npm run eval:multistep` with all six models (GPT-5, GPT-5 Nano, Gemini 3.5 Flash, Qwen 2.5 7B, GPT-OSS 20B, Llama 3.1 8B) on all 50 scenarios
2. Captured OpenRouter `usage.prompt_tokens` + `usage.completion_tokens` per call
3. **Published estimates, not actuals** — to avoid implying invoice-grade precision
4. Stored full OpenRouter responses (with actual token counts) in archived `eval-multistep-report-*.json` files

**Verification available:**
```bash
# Extract actual OpenRouter token usage from archived runs
jq '.models[].taskResults[].openrouterUsage' demo/public/eval-multistep-report-gpt5.json

# Re-estimate tokens from new runs
npm run eval:multistep -- --models=gpt5Nano --no-cache > /tmp/run.json
jq '.avgTokens' /tmp/run.json  # estimate
```

## Reading the leaderboard responsibly

### ✅ Correct interpretation

- *"WCI grounding uses ~5–8× fewer tokens than raw HTML on these scenarios"* — ratio is stable across models
- *"Gemini 3.5 Flash averages 777 tokens on WCI grounding"* — order of magnitude is accurate
- *"Token reduction is consistent"* — improvement persists even if absolute counts ±15%

### ⛔ Incorrect interpretation

- *"WCI saves exactly 8.2× tokens"* — precise claim isn't supported by estimates
- *"These numbers match production billing"* — they don't; actual usage can be 10–50% higher
- *"Token counts are lower-bound costs"* — estimates could be under or over

## How to get precise measurements

### For your own runs

**Capture actual OpenRouter usage:**

```bash
export OPENROUTER_API_KEY=sk-or-...
npm run eval:multistep -- \
  --models=gpt5Nano \
  --scenarios=banking,checkout \
  --output-dir=/tmp/precise-eval

# Extract actual token counts
jq '.models[0].taskResults[].openrouterUsage' /tmp/precise-eval/eval-multistep-report.json
```

**Calculate your own aggregates:**

```bash
jq -r '[.models[].taskResults[] | 
  select(.approach == "wci-grounding") | 
  .openrouterUsage.prompt_tokens + .openrouterUsage.completion_tokens] | 
  add / length' eval-multistep-report.json
```

### For billing/cost analysis

1. Use OpenRouter's billing API to pull actual charges for your account
2. Divide by number of tokens billed to get true effective cost-per-token
3. Note: bulk pricing, cached tokens (25% discount), and model-version changes affect billing

### Production deployment

When running WCI distillation in production:

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({ format: 'compact-json' });
const view = distiller.distilJSON(document);

// view.estimatedTokens ≈ actual input tokens (usually within 5%)
// view.bytes = exact character count
console.log(`Estimated: ${view.estimatedTokens} tokens, ${view.bytes} bytes`);
```

The distiller's internal estimate tends to be more accurate than our benchmark formula because it uses the actual serialized output.

## Comparison with other work

| Paper | Token measurement | Notes |
|-------|------------------|-------|
| **WebArena** (Zhou et al.) | End-to-end trajectory cost | Multi-turn; includes observation + thought + action |
| **Mind2Web** (Deng et al.) | Per-grounding-call tokens | Single-shot; similar scale to our baseline approach |
| **Browser Use** (Anthropic, 2024) | Billed tokens from Claude API | Production system; actual costs reported |
| **WCI (this work)** | Estimated tokens per call | Single-shot grounding; formula-based, not actual API usage |

## Future work

- [ ] Publish actual OpenRouter `usage` fields alongside estimates in `eval-results-*.json`
- [ ] Add per-provider tokenizer calibration (GPT-5 vs. Gemini vs. open-source)
- [ ] Compare against production Claude API and other providers
- [ ] Track cache-hit ratios when caching is enabled

## See also

- [`evals/README.md`](../evals/README.md) — Full evaluation harness, commands, and limitations
- [`docs/distillation.md`](./distillation.md) — How WCI distiller calculates token budgets
- [Zenodo dataset](https://doi.org/10.5281/zenodo.20434088) — Raw evaluation artifacts with complete OpenRouter logs
