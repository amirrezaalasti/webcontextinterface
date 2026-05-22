# WCI — Web Context Interface

> Making websites natively readable for LLM-based agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**WCI (Web Context Interface)** is a three-layer open standard that augments standard HTML with structured semantic metadata, compresses it into agent-optimised context, and provides a typed action protocol — all in **< 8 KB** per layer.

```
data-wci-* HTML attrs  →  Distiller Engine  →  LLM Context (JSON / Markdown)
                                                        ↓
                                         WciBridge.dispatch(action)
                                                        ↓
                                         Typed ActionResult payload
```

Additionally, three **site root files** give agents site-wide grounding before they touch a single page — analogous to `robots.txt`:

| File | Purpose |
|------|---------|
| `/wci.txt` | Directive file — allow/deny scopes, rate limits, auth |
| `/wci.json` | Structured manifest — task flows, scope descriptors |
| `/wci.md` | Narrative context — injected into LLM system prompt |

---

## Documentation website

Static site (VitePress) with guides, API reference, and the interactive demo at `/demo/`.

```bash
npm run docs:dev          # docs only → http://localhost:5174
npm run website:build     # docs + demo → docs/.vitepress/dist
npm run website:preview   # preview the full site locally
```

**Publish to GitHub Pages:** enable Pages → *GitHub Actions* in repo settings, then push to `main`. See [docs/deploy.md](./docs/deploy.md).

**Full concept & implementation reference:** [`agent.md`](./agent.md) — vision, agentic interface/AX, spec, APIs, and codebase map.

Markdown sources live in [`docs/`](./docs/). Quick links:

| Guide | Topic |
|-------|--------|
| [Getting started](./docs/getting-started.md) | Install, annotate, distil, dispatch |
| [Architecture](./docs/architecture.md) | Layers and data flow |
| [Specification](./docs/specification.md) | `data-wci-*` and site files |
| [Distillation](./docs/distillation.md) | `WciDistiller` |
| [Action protocol](./docs/action-protocol.md) | `WciBridge` / `ActionResult` |
| [Site policy](./docs/site-policy.md) | `wci.txt` and policy engine |
| [LLM integration](./docs/llm-integration.md) | Closed-loop agent patterns |

---

## Install

**Monorepo (development):**

```bash
npm install
npm run build
```

**npm packages** (after publish):

```bash
npm install @wci/core
```

Or install layers individually: `@wci/spec`, `@wci/distiller`, `@wci/bridge`, `@wci/context`.

---

## Packages

| Package | Description |
|---------|-------------|
| [`@wci/spec`](./packages/spec) | TypeScript types, role enum, `readWciNodeSpec()` |
| [`@wci/distiller`](./packages/distiller) | Pruner, JSON/Markdown serializers, `WciDistiller` |
| [`@wci/bridge`](./packages/bridge) | `WciBridge`, action dispatcher, `ActionResult` |
| [`@wci/context`](./packages/context) | `WciContextLoader`, `PolicyEngine`, `wci.txt` parser |
| [`@wci/core`](./packages/core) | **All-in-one SDK** — re-exports every package |

---

## Quick start

### 1. Annotate your HTML

```html
<section
  data-wci-role="landmark"
  data-wci-id="registration-form"
  data-wci-desc="New user registration — capture email, password, accept terms">

  <input
    data-wci-id="email-input"
    data-wci-role="form"
    data-wci-desc="User's email address — must be unique"
    data-wci-action="fill"
    data-wci-required="true"
    data-wci-state='{"value":"","valid":null}'
    data-wci-scope="registration-form"
    data-wci-priority="1"
  />

  <button
    data-wci-id="submit-btn"
    data-wci-role="action"
    data-wci-desc="Submit registration — creates the account"
    data-wci-action="click"
    data-wci-precondition="All required fields must be valid"
    data-wci-scope="registration-form"
    data-wci-priority="1"
  >Create Account</button>

</section>
```

### 2. Distil

```typescript
import { WciDistiller } from '@wci/distiller';

const distiller = new WciDistiller({ format: 'json', scope: 'registration-form' });
const view = distiller.distilJSON(document);
```

### 3. Dispatch actions

```typescript
import { WciBridge } from '@wci/bridge';

const bridge = new WciBridge();
const result = await bridge.fill('email-input', 'user@example.com');
await bridge.click('submit-btn');
```

### 4. Site context

```typescript
import { WciContextLoader } from '@wci/context';

const ctx = await WciContextLoader.load('https://your-site.com');
ctx.policy.assertScopeAllowed('checkout');
```

---

## `data-wci-*` attribute reference

| Attribute | Type | Description |
|-----------|------|-------------|
| `data-wci-id` | string | Stable unique ID |
| `data-wci-role` | enum | `action` · `form` · `display` · `nav` · `status` · `landmark` |
| `data-wci-desc` | string | LLM-optimised description |
| `data-wci-action` | enum | `click` · `fill` · `select` · `check` · `upload` · `submit` · `navigate` |
| `data-wci-state` | JSON | Current observable state snapshot |
| `data-wci-precondition` | string | Natural language guard condition |
| `data-wci-required` | boolean | Must be satisfied before form submission |
| `data-wci-options` | JSON array | Choices for select/radio groups |
| `data-wci-emit` | string | Custom DOM event fired after interaction |
| `data-wci-scope` | string | Parent landmark scope ID |
| `data-wci-hidden` | boolean | Prune this node from distilled output |
| `data-wci-priority` | 1–5 | Importance ranking (1 = primary CTA) |

See [Specification](./docs/specification.md) for details.

---

## Development

```bash
npm install          # install workspaces
npm run build        # build all packages (tsup → dist/)
npm run lint         # TypeScript check
npm run demo         # interactive demo at http://localhost:5173
npm run docs:dev         # documentation at http://localhost:5174
npm run website:build  # full site (docs + demo) for deployment
```

### Repository layout

```
WIA_framework/
├── docs/                 # Full documentation
├── packages/
│   ├── spec/
│   ├── distiller/
│   ├── bridge/
│   ├── context/
│   └── core/             # Umbrella SDK
├── demo/
├── examples/
└── paper/                # Research paper (LaTeX)
```

---

## Benchmark

**50 scenarios** under [`demo/scenarios/`](./demo/scenarios/) (5 legacy + 45 generated layouts). The harness scores **single-shot element grounding** across five context formats (raw HTML, DOM outline, candidate list, WCI full, WCI grounding) via OpenRouter.

- **Methodology, commands, and comparison tables:** [`evals/README.md`](./evals/README.md)
- **Archived run artifacts:** [`demo/public/README.md`](./demo/public/README.md) (`eval-results-gpt5nano.json`, `eval-report-gemini3.5flash.json`, …)

```bash
npm run eval:verify
npm run eval:benchmark -- --models=gpt5Nano --scenarios=flight-booking,banking
```

---

## Citation

If you use WCI in research or publications, please cite:

**Amirreza Alasti** — [amirrezaalasti@gmail.com](mailto:amirrezaalasti@gmail.com)

```bibtex
@software{wci2026,
  author       = {Amirreza Alasti},
  title        = {WCI: Web Context Interface},
  year         = {2026},
  publisher    = {GitHub},
  note         = {Contact: amirrezaalasti@gmail.com}
}
```

A machine-readable citation file is also provided in [`CITATION.cff`](./CITATION.cff).

---

## License

MIT — Open Standard. See [LICENSE](./LICENSE).
