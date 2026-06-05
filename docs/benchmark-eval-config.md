# Benchmark evaluation configuration

Generated from `evals/lib/eval-config.ts` at **2026-06-05T16:44:43.468Z**.
Regenerate: `npm run eval:export-config`.

## Provider

| Field | Value |
|-------|-------|
| API | OpenRouter |
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| HTTP-Referer | `https://github.com/wci-framework` |
| X-Title | `WCI Benchmark Eval` |

## Inference settings

### Published multi-step (`eval:multistep`)

| Parameter | Value |
|-----------|-------|
| temperature | **0** |
| max_tokens | **800** |
| reasoning.effort | **low** |
| minCoverage (default) | **0.8** |
| passRule | **unified** |

### Single-shot (`eval:benchmark`, not on demo leaderboard)

| Parameter | Value |
|-----------|-------|
| temperature | **0** |
| max_tokens | **1000** |
| reasoning.effort | **low** |

## Models (OpenRouter slugs)

| ID | Display name | OpenRouter model | Input $/1M tokens |
|----|--------------|------------------|-------------------|
| `gpt5Nano` | GPT-5 Nano | `openai/gpt-5.4-nano` | 0.05 |
| `gpt5` | GPT-5 | `openai/gpt-5.4` | 1.25 |
| `gemini35Flash` | Gemini 3.5 Flash | `google/gemini-3.5-flash` | 0.2 |
| `qwen25_7b` | Qwen 2.5 7B | `qwen/qwen-2.5-7b-instruct` | 0.04 |
| `llama31_8b` | Llama 3.1 8B | `meta-llama/llama-3.1-8b-instruct` | 0.03 |
| `gptoss20B` | GPT-OSS 20B | `openai/gpt-oss-20b` | 0.04 |

## Context limits

### Multi-step

- raw HTML cap: **12000** chars
- DOM outline: **55** lines
- interactive candidates: **40**
- WCI pipe budget (grounding): **2400** chars
- WCI pipe budget (full): **3200** chars

### Single-shot

- raw HTML cap: **28000** chars
- DOM outline: **100** lines
- interactive candidates: **60**

## Multi-step system prompts (published leaderboard)

### `raw-html`

```
You are a web automation agent. Reply with ONE line only: a valid CSS selector for the element that achieves the goal. No markdown, no quotes, no explanation. Plan briefly. final_action is the single scored control that completes the goal (not a follow-up confirm/checkout step).
```

### `dom-outline`

```
You are a web agent using a DOM outline. Output ONLY one CSS selector for the element that best achieves the goal. No explanation. Plan briefly. final_action is the single scored control that completes the goal (not a follow-up confirm/checkout step).
```

### `interactive-candidates`

```
You are a Mind2Web-style agent. Candidates omit #ids on purpose. Use button text, classes, and data-* context to disambiguate. Output ONLY the candidate index number (e.g. 12) OR a CSS selector for the best match. No explanation. Plan briefly. final_action is the single scored control that completes the goal (not a follow-up confirm/checkout step).
```

### `wci-full`

```
WCI agent. WCI_NODES v2: N[]=pipe rows id|a|d|p|x|s|r (omit empty). a: c=click f=fill s=select S=submit. s: k:v (!=disabled). x=competitor trap — never final_action. p=1 is high salience but may include traps; use desc+goal. final_action=exact row id that completes the goal. Never CSS.
```

### `wci-grounding`

```
WCI agent. WCI_NODES v2: N[]=pipe rows id|a|d|p|x|s|r (omit empty). a: c=click f=fill s=select S=submit. s: k:v (!=disabled). x=competitor trap — never final_action. p=1 is high salience but may include traps; use desc+goal. final_action=exact row id that completes the goal. Never CSS.
```

## Single-shot system prompts (`eval:benchmark`)

### `raw-html`

```
You are a web automation agent. Reply with ONE line only: a valid CSS selector for the element that achieves the goal. No markdown, no quotes, no explanation.
```

### `dom-outline`

```
You are a web agent using a DOM outline. Output ONLY one CSS selector for the element that best achieves the goal. No explanation.
```

### `interactive-candidates`

```
You are a Mind2Web-style agent. Candidates omit #ids on purpose. Use button text, classes, and data-* context to disambiguate. Output ONLY the candidate index number (e.g. 12) OR a CSS selector for the best match. No explanation.
```

### `wci-full`

```
You are a WCI agent on the full distilled graph (landmarks, forms, actions). Apply every constraint in the GOAL. Prefer node ids that have an "action" field (click/select/fill) over landmarks or displays. Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.
```

### `wci-grounding`

```
You are a WCI grounding agent. The JSON lists only actionable nodes (click/select/fill), with state and scope_context (e.g. stops, price). Apply every constraint in the GOAL. Pick the single node id that completes the goal given current state. Do not invent ids. Reply with ONE line: the exact "id" only. No CSS, no markdown, no explanation.
```

## Multi-step user block

Each call sends one user message built from (in order):

- `GOAL:` task goal
- `FLOW:` expected flow-type bucket sequence (sanitized)
- up to **3** `PREREQ:` lines
- `RULE:` completion criteria (filtered) + scored final_action rule
- context block (`WCI_NODES:`, `DOM_OUTLINE:`, `CANDIDATES:`, or `HTML:`)
- reply format line

Scored final_action rule:

```
Scored final_action: the one control that completes this goal .
```

Reply format suffix:

```
Reply JSON only: {"actions":[{"type":"observe|reason|act|verify","step":"brief","target":"..."}],"final_action":"<hint>"}
```

## Related

- Methodology (public summary): [Benchmark overview](./benchmark.md)
- Full developer guide: [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md)
- Machine-readable export: [`demo/public/eval-config.json`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/demo/public/eval-config.json)
