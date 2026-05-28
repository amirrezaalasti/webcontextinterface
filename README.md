<p align="center">
  <img src="assets/logo-with-title.png" alt="WCI — Web Context Interface" width="420" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://webcontextinterface.vercel.app/"><img src="https://img.shields.io/badge/docs-webcontextinterface.vercel.app-6366f1" alt="Documentation" /></a>
  <br />
  <a href="https://www.npmjs.com/package/@webcontextinterface/spec"><img src="https://img.shields.io/npm/v/@webcontextinterface/spec?label=spec" alt="npm @webcontextinterface/spec" /></a>
  <a href="https://www.npmjs.com/package/@webcontextinterface/distiller"><img src="https://img.shields.io/npm/v/@webcontextinterface/distiller?label=distiller" alt="npm @webcontextinterface/distiller" /></a>
  <a href="https://www.npmjs.com/package/@webcontextinterface/bridge"><img src="https://img.shields.io/npm/v/@webcontextinterface/bridge?label=bridge" alt="npm @webcontextinterface/bridge" /></a>
  <a href="https://www.npmjs.com/package/@webcontextinterface/context"><img src="https://img.shields.io/npm/v/@webcontextinterface/context?label=context" alt="npm @webcontextinterface/context" /></a>
  <a href="https://www.npmjs.com/package/@webcontextinterface/core"><img src="https://img.shields.io/npm/v/@webcontextinterface/core?label=core" alt="npm @webcontextinterface/core" /></a>
</p>

**WCI (Web Context Interface)** is a three-layer open standard that augments standard HTML with structured semantic metadata, compresses it into agent-optimised context, and provides a typed action protocol — all in **< 8 KB** per layer.

![WCI architecture: data-wci-* markup, distiller, LLM context, WciBridge actions, and site context files](assets/architecture.png)

Additionally, three **site root files** give agents site-wide grounding before they touch a single page — analogous to `robots.txt`:

| File | Purpose |
|------|---------|
| `/wci.txt` | Directive file — allow/deny scopes, rate limits, auth |
| `/wci.json` | Structured manifest — task flows, scope descriptors |
| `/wci.md` | Narrative context — injected into LLM system prompt |

---

## Documentation website

**Live (Vercel):** [webcontextinterface.vercel.app](https://webcontextinterface.vercel.app/) · [Demo](https://webcontextinterface.vercel.app/demo/)

**Live (GitHub Pages):** [amirrezaalasti.github.io/webcontextinterface](https://amirrezaalasti.github.io/webcontextinterface/) · [Demo](https://amirrezaalasti.github.io/webcontextinterface/demo/)

Static site (VitePress) with guides, API reference, and the interactive demo.

```bash
npm run docs:dev          # docs only → http://localhost:5174
npm run website:build     # docs + demo → docs/.vitepress/dist
npm run website:preview   # preview the full site locally
```

**Deploy:** push to `main` — Vercel rebuilds automatically ([`vercel.json`](./vercel.json)). For GitHub Pages, enable **Settings → Pages → Source: GitHub Actions**, then the [deploy workflow](.github/workflows/deploy-website.yml) runs on each push.

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
npm install @webcontextinterface/core
```

Or install layers individually: `@webcontextinterface/spec`, `@webcontextinterface/distiller`, `@webcontextinterface/bridge`, `@webcontextinterface/context`.

---

## Packages

| Package | Description |
|---------|-------------|
| [`@webcontextinterface/spec`](./packages/spec) | TypeScript types, role enum, `readWciNodeSpec()` |
| [`@webcontextinterface/distiller`](./packages/distiller) | Pruner, JSON/Markdown serializers, `WciDistiller` |
| [`@webcontextinterface/bridge`](./packages/bridge) | `WciBridge`, action dispatcher, `ActionResult` |
| [`@webcontextinterface/context`](./packages/context) | `WciContextLoader`, `PolicyEngine`, `wci.txt` parser |
| [`@webcontextinterface/core`](./packages/core) | **All-in-one SDK** — re-exports every package |

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
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({ format: 'json', scope: 'registration-form' });
const view = distiller.distilJSON(document);
```

### 3. Dispatch actions

```typescript
import { WciBridge } from '@webcontextinterface/bridge';

const bridge = new WciBridge();
const result = await bridge.fill('email-input', 'user@example.com');
await bridge.click('submit-btn');
```

### 4. Site context

```typescript
import { WciContextLoader } from '@webcontextinterface/context';

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
npm run eval:merge-leaderboard   # update demo/public/eval-results-all.json
npm run demo                     # live leaderboard on the website
```

---

## Citation

If you use WCI in research or publications, please cite:

**Amirreza Alasti** — [amirrezaalasti@gmail.com](mailto:amirrezaalasti@gmail.com)

```bibtex
@software{wci2026,
  author       = {Amirreza Alasti, Niloufar Ghandeharioun, Oliver Karras},
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
