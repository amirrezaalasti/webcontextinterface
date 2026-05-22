# Getting started

**WCI (Web Context Interface)** is an open standard and TypeScript SDK for annotating web pages, distilling them for LLM context, and dispatching typed browser actions.

## Prerequisites

- Node.js 18+
- A browser environment (Bridge and Distiller run in the DOM; Context uses `fetch`)

## Install

From this repository (development):

```bash
git clone <your-repo-url>
cd WIA_framework
npm install
npm run build
```

When published to npm:

```bash
npm install @wci/core
# or install packages individually:
# npm install @wci/spec @wci/distiller @wci/bridge @wci/context
```

## 1. Annotate your HTML

Add `data-wci-*` attributes to elements agents should see or control:

```html
<input
  data-wci-id="email-input"
  data-wci-role="form"
  data-wci-desc="User email — must be unique"
  data-wci-action="fill"
  data-wci-required="true"
  data-wci-state='{"value":"","valid":null}'
  data-wci-scope="registration-form"
  data-wci-priority="1"
/>
```

See [Specification](./specification.md) for the full attribute list.

## 2. Distil the page for an LLM

```typescript
import { WciDistiller } from '@wci/distiller';

const distiller = new WciDistiller({
  format: 'json',
  scope: 'registration-form',
  maxNodes: 64,
});

const view = distiller.distil(document);
// Pass to your LLM as tool context or system-adjacent user message
const json = distiller.distilJSON(document);
```

## 3. Dispatch actions from agent decisions

```typescript
import { WciBridge } from '@wci/bridge';

const bridge = new WciBridge(document.getElementById('registration-form')!);

const fillResult = await bridge.fill('email-input', 'user@example.com');
if (!fillResult.success) {
  console.error(fillResult.error);
}

await bridge.click('submit-btn');
console.log(bridge.getHistory());
```

## 4. Load site-wide context

Place these at your site root (see [Site policy](./site-policy.md)):

- `/wci.txt` — allow/deny scopes, rate limits, auth
- `/wci.json` — structured manifest and task flows
- `/wci.md` — narrative for the LLM system prompt

```typescript
import { WciContextLoader } from '@wci/context';

const ctx = await WciContextLoader.load('https://your-site.com');
ctx.policy.assertScopeAllowed('checkout');
const systemPrompt = ctx.narrative ?? '';
```

## 5. All-in-one SDK import

```typescript
import {
  WciDistiller,
  WciBridge,
  WciContextLoader,
  readWciNodeSpec,
} from '@wci/core';
```

## Run the demo

```bash
npm run demo
```

Opens the interactive showcase at `http://localhost:5173` with live distillation, action log, and site context viewer.

## Next steps

- [Architecture](./architecture.md) — how the layers connect
- [LLM integration](./llm-integration.md) — closed-loop agent patterns
- [API reference](./api/bridge.md) — per-package APIs
