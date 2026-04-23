# AgentDOM — LLM-Native Web Framework

> Making websites natively readable for LLM-based agents.

## What It Is

AgentDOM is a three-layer open standard that augments standard HTML with structured semantic metadata, compresses it into agent-optimised context, and provides a typed action protocol — all in **< 8 KB**.

```
data-agent-* HTML attrs  →  Distiller Engine  →  LLM Context (JSON / Markdown)
                                                         ↓
                                          AgentBridge.dispatch(action)
                                                         ↓
                                          Typed ActionResult payload
```

Additionally, three **site root files** give agents site-wide grounding before they touch a single page — analogous to `robots.txt`:

| File | Purpose |
|---|---|
| `/agents.txt` | Directive file — allow/deny scopes, rate limits, auth |
| `/agents.json` | Structured manifest — task flows, scope descriptors |
| `/agent.md` | Narrative context — injected into LLM system prompt |

---

## Packages

| Package | Description |
|---|---|
| `@agentdom/spec` | TypeScript types, role enum, DOM attribute reader |
| `@agentdom/distiller` | Pruner, JSON/Markdown serializers, `AgentDistiller` |
| `@agentdom/bridge` | `AgentBridge`, action dispatcher, `ActionResult` |
| `@agentdom/context` | `SiteContextLoader`, `PolicyEngine`, `agents.txt` parser |

---

## Quick Start

### 1. Annotate your HTML

```html
<section
  data-agent-role="landmark"
  data-agent-id="registration-form"
  data-agent-desc="New user registration — capture email, password, accept terms">

  <input
    data-agent-id="email-input"
    data-agent-role="form"
    data-agent-desc="User's email address — must be unique"
    data-agent-action="fill"
    data-agent-required="true"
    data-agent-state='{"value":"","valid":null}'
    data-agent-scope="registration-form"
    data-agent-priority="1"
  />

  <button
    data-agent-id="submit-btn"
    data-agent-role="action"
    data-agent-desc="Submit registration — creates the account"
    data-agent-action="click"
    data-agent-precondition="All required fields must be valid"
    data-agent-scope="registration-form"
    data-agent-priority="1"
  >Create Account</button>

</section>
```

### 2. Distil

```js
import { AgentDistiller } from '@agentdom/distiller';

const distiller = new AgentDistiller({ format: 'json', scope: 'registration-form' });
const view = distiller.distilJSON(document);
// → compact JSON ready for LLM context window
```

### 3. Dispatch actions via AgentBridge

```js
import { AgentBridge } from '@agentdom/bridge';

const bridge = new AgentBridge();

const result = await bridge.fill('email-input', 'user@example.com');
// → { success: true, stateChange: { before: {...}, after: {...} }, sideEffects: [...] }

await bridge.click('submit-btn');
```

### 4. Add site context files

```
your-site/
├── agents.txt    ← directives (allow/deny/rate-limit)
├── agents.json   ← structured manifest
└── agent.md      ← narrative for LLM system prompt
```

```js
import { SiteContextLoader } from '@agentdom/context';

const ctx = await SiteContextLoader.load('https://your-site.com');
ctx.policy.assertScopeAllowed('checkout');  // throws ScopeDeniedError if denied
console.log(ctx.narrative);  // agent.md content for system prompt
```

---

## `data-agent-*` Attribute Reference

| Attribute | Type | Description |
|---|---|---|
| `data-agent-id` | string | Stable unique ID |
| `data-agent-role` | enum | `action` · `form` · `display` · `nav` · `status` · `landmark` |
| `data-agent-desc` | string | LLM-optimised description |
| `data-agent-action` | enum | `click` · `fill` · `select` · `check` · `upload` · `submit` · `navigate` |
| `data-agent-state` | JSON | Current observable state snapshot |
| `data-agent-precondition` | string | Natural language guard condition |
| `data-agent-required` | boolean | Must be satisfied before form submission |
| `data-agent-options` | JSON array | Choices for select/radio groups |
| `data-agent-emit` | string | Custom DOM event fired after interaction |
| `data-agent-scope` | string | Parent landmark scope ID |
| `data-agent-hidden` | boolean | Prune this node from distilled output |
| `data-agent-priority` | 1–5 | Importance ranking (1 = primary CTA) |

---

## Running the Demo

```bash
npm install
npm run demo
```

Opens `http://localhost:5173` — a live interactive showcase with:
- Annotated registration form (Human View)
- Live distilled JSON and Markdown output (Agent View)
- Typed action dispatch panel with `ActionResult` log
- Site context file viewer (`agents.txt`, `agents.json`, `agent.md`)

---

## File Structure

```
WIA_framework/
├── packages/
│   ├── spec/         # Type definitions & DOM reader
│   ├── distiller/    # Pruner, serializers, AgentDistiller
│   ├── bridge/       # AgentBridge, dispatcher, ActionResult
│   └── context/      # SiteContextLoader, PolicyEngine
├── demo/
│   ├── index.html    # Annotated demo page
│   ├── main.ts       # Demo application
│   ├── style.css     # Design system
│   └── public/
│       ├── agents.txt
│       ├── agents.json
│       └── agent.md
├── vite.config.ts
└── package.json
```

---

## License

MIT — Open Standard. No attribution required.
