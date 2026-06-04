# WCI — Master Reference: Ideas, Concepts & Implementation

> **Web Context Interface (WCI)** — an open standard and TypeScript SDK that makes web pages natively readable and actionable for LLM-based agents.
>
> This document is the **single consolidated reference** for vision, terminology, specification, runtime behavior, and repository layout. For site-specific agent instructions served to LLMs at runtime, publishers use `/wci.md` (see [Site narrative](#site-narrative-wcimd)). For interactive docs, see [`docs/`](./docs/).

**Author:** Amirreza Alasti — [amirreza.alasti@stud.uni-hannover.de](mailto:amirreza.alasti@stud.uni-hannover.de)  
**License:** MIT  
**Spec version:** 1.0

---

## Table of contents

1. [Why WCI exists](#1-why-wci-exists)
2. [Core concepts](#2-core-concepts)
3. [Architecture overview](#3-architecture-overview)
4. [Layer 1 — Agentic interface (HTML)](#4-layer-1--agentic-interface-html)
5. [Layer 2 — Distillation](#5-layer-2--distillation)
6. [Layer 3 — Action protocol (Bridge)](#6-layer-3--action-protocol-bridge)
7. [Layer 4 — Agentic experience (site context)](#7-layer-4--agentic-experience-site-context)
8. [End-to-end agent loop](#8-end-to-end-agent-loop)
9. [LLM integration patterns](#9-llm-integration-patterns)
10. [Packages & codebase map](#10-packages--codebase-map)
11. [Repository layout](#11-repository-layout)
12. [Demo & examples](#12-demo--examples)
13. [Ethics, policy & misuse](#13-ethics-policy--misuse)
14. [Limitations & roadmap](#14-limitations--roadmap)
15. [Research & evaluation context](#15-research--evaluation-context)
16. [Appendix A — Type reference](#appendix-a--type-reference)
17. [Appendix B — Error codes](#appendix-b--error-codes)
18. [Appendix C — Discovery protocol](#appendix-c--discovery-protocol)
19. [Appendix D — Annotation cookbook](#appendix-d--annotation-cookbook)

---

## 1. Why WCI exists

### The problem

The modern web is built for **humans**: visual hierarchy, marketing copy, implicit affordances, and UI frameworks that optimize UX—not machine reasoning. Meanwhile, **LLM web agents** must:

- Parse noisy HTML or expensive screenshots
- Guess which elements are actionable
- Re-infer state after every interaction
- Operate without publisher consent or scope boundaries

Common agent stacks today fall into three families:

| Approach | How it works | Typical cost |
|----------|----------------|--------------|
| **Vision–language (VLM)** | Screenshots + coordinate clicking | High tokens, fragile layout |
| **DOM heuristics** | Accessibility tree, selectors, scraping | Large DOM, unstable IDs |
| **Script synthesis** | Generate automation per site | Brittle, hard to maintain |

Benchmarks such as **WebArena**, **Mind2Web**, **Online-Mind2Web**, and **Odysseys** show that even “simple” human tasks often require frontier-scale models, **thousands of tokens per step**, and **longer runtimes than humans**—because agents are reverse-engineering a human-oriented interface.

### The reframing

WCI does not ask “how do we make a better scraper?” It asks:

> **What if publishers exposed a machine-oriented contract alongside human UI/UX?**

That contract has two parts:

1. **Agentic interface** — in-page semantics (`data-wci-*`), distilled views, typed actions.
2. **Agentic experience (AX)** — site-wide policy and narrative (`wci.txt`, `wci.json`, `wci.md`) before any page is touched.

Together, these enable **opt-in cooperation**: sites keep human design; agents get stable IDs, bounded context, and structured feedback.

### Design principles

| Principle | Meaning |
|-----------|---------|
| **Browser-native** | Valid HTML5 attributes; no mandatory build step |
| **Publisher-controlled** | Allow/deny scopes, auth, human confirmation |
| **Token-bounded** | Distillation caps nodes and scope; typical views &lt; 8 KB |
| **Typed feedback** | Every action returns `ActionResult`, not raw DOM dumps |
| **Incremental adoption** | Annotate high-value flows first; legacy pages unchanged |
| **Complementary** | Works with VLMs/DOM agents by narrowing search space |

---

## 2. Core concepts

### Web Context Interface (WCI)

The **open standard** (spec 1.0) plus reference TypeScript implementation in this monorepo. WCI spans markup, distillation, actions, and site policy—not a single npm class.

### Agentic interface

The **in-document** surface agents use on a page:

- Semantic roles and descriptions on DOM nodes
- Observable `data-wci-state` JSON snapshots
- `WciDistiller` → compact **WciView** (JSON or Markdown)
- `WciBridge` → **ActionResult** after each interaction

Think of it as the API the page exposes to agents, analogous to how forms expose fields to humans.

### Agentic experience (AX)

The **site-level** experience before and across pages:

- **Policy** — what scopes exist, what is forbidden, rate limits, auth (`wci.txt` + `PolicyEngine`)
- **Structure** — task flows, scope catalog, capabilities (`wci.json`)
- **Narrative** — tone, domain rules, recovery tables (`wci.md` → system prompt)

AX is “how the site wants agents to behave,” like robots.txt + product docs for machines.

### Landmark & scope

A **landmark** (`data-wci-role="landmark"`) wraps a bounded task zone (registration form, checkout, modal). Its `data-wci-id` is the **scope ID**. Child nodes set `data-wci-scope` to that ID so the distiller can emit **scope-local** views and agents can focus one task at a time.

### Distilled view (`WciView`)

A flat, priority-sorted list of `WciNodeSpec` objects plus metadata (`page_title`, `scope`, `site_context`, `wci_version`). This is what you put in the LLM context window—not the full DOM.

### ActionResult

The **only** feedback channel agents should trust after an action: success/failure, `stateChange` (before/after), optional **sideEffects** on sibling nodes, and structured `error` with `hint`.

### Site root triad

| File | Role in AX |
|------|------------|
| `/wci.txt` | Directives (allow/deny, rates, auth) — robots.txt for agents |
| `/wci.json` | Machine manifest (flows, scopes, capabilities) |
| `/wci.md` | Human-readable narrative for system prompt injection |

---

## 3. Architecture overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         SITE (publisher)                                 │
│  wci.txt / wci.json / wci.md  ──►  WciContextLoader  ──►  PolicyEngine │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAGE (browser DOM)                               │
│  data-wci-* HTML  ──►  WciDistiller  ──►  WciView (JSON / Markdown)     │
│                              │                    │                      │
│                              │                    ▼                      │
│                              │              LLM / Agent planner           │
│                              │                    │                      │
│                              ▼                    ▼                      │
│                         WciBridge ◄──── ActionRequest                    │
│                              │                                           │
│                              ▼                                           │
│                         ActionResult (+ sideEffects)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data flow (one turn):**

1. Load site context → build system prompt from `wci.md` + policy.
2. Distil current scope → user/tool message with `WciView`.
3. LLM chooses `{ nodeId, action, value }`.
4. `WciBridge.dispatch()` → `ActionResult` (when a `PolicyEngine` is attached via `setPolicy` or constructor options, scope/auth/human-confirmation rules from `wci.txt` are enforced before DOM mutation).
5. On policy failure, handle `ActionResult.error` (`SCOPE_DENIED`, `AUTH_REQUIRED`, `HUMAN_CONFIRMATION_REQUIRED`).
6. Append result to history; re-distil or read `sideEffects` → next turn.

**Size target:** each npm layer is designed to stay under **~8 KB minified** when used alone; use only the packages you need.

---

## 4. Layer 1 — Agentic interface (HTML)

### `data-wci-*` attribute reference

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `data-wci-id` | recommended | string | Stable unique ID for dispatch and distillation |
| `data-wci-role` | recommended | enum | Semantic role (see below) |
| `data-wci-desc` | recommended | string | LLM-oriented description of purpose and constraints |
| `data-wci-action` | for interactive nodes | enum | Verb the bridge may dispatch |
| `data-wci-state` | recommended | JSON object | Observable state snapshot (updated by Bridge) |
| `data-wci-precondition` | optional | string | Natural-language guard; bridge checks `disabled` |
| `data-wci-required` | optional | `"true"` | Must be satisfied before form submit |
| `data-wci-options` | optional | JSON array | Choices for select/radio groups |
| `data-wci-emit` | optional | string | Custom DOM event after successful action |
| `data-wci-scope` | optional | string | Parent landmark `data-wci-id` |
| `data-wci-hidden` | optional | `"true"` | Exclude from distilled output |
| `data-wci-priority` | optional | 1–5 | Sort key (1 = highest, e.g. primary CTA) |

### Roles (`WciRole`)

| Role | Use for |
|------|---------|
| `landmark` | Bounded task zone (form, checkout, modal) |
| `action` | Buttons, CTAs with side effects |
| `form` | Inputs, textarea, select |
| `display` | Read-only values (price, status text) |
| `nav` | Links that change route/page |
| `status` | Loading, error, success indicators |

### Actions (`WciAction`)

`click` · `fill` · `select` · `check` · `upload` · `submit` · `navigate` · `focus` · `clear`

The bridge implements all except `upload` in the reference runtime (throws `UNKNOWN_ERROR` if unsupported).

### State JSON conventions

Keep state **small and serializable**. The bridge **merges patches** into `data-wci-state` after each action.

**Email field example:**

```json
{ "value": "", "valid": null, "touched": false }
```

**Button example:**

```json
{ "enabled": false, "clicked": false }
```

**Rules for agents:**

- Prefer `data-wci-state` on nodes over re-parsing the full DOM.
- On `ActionResult.sideEffects`, update mental model without full re-distil when possible.
- Read `precondition` before dispatching guarded actions.

### DOM reader (`readWciNodeSpec`)

```typescript
import { readWciNodeSpec } from '@webcontextinterface/spec';

const spec = readWciNodeSpec(element);
// null if element has neither data-wci-id nor data-wci-role
```

Implementation: `packages/spec/src/index.ts` — maps attributes 1:1 to `WciNodeSpec`; auto-generates `id` via `crypto.randomUUID()` if only role is set; falls back `desc` from trimmed text content (max 120 chars).

### Example: registration landmark

```html
<section
  data-wci-role="landmark"
  data-wci-id="registration-form"
  data-wci-desc="New user registration — email, password, terms">

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

  <button
    data-wci-id="submit-btn"
    data-wci-role="action"
    data-wci-desc="Submit registration — creates account"
    data-wci-action="click"
    data-wci-precondition="All required fields valid and terms accepted"
    data-wci-scope="registration-form"
    data-wci-priority="1"
  >Create Account</button>
</section>
```

### Events

| Event | Target | Detail |
|-------|--------|--------|
| `wci:state-change` | `document` | `{ nodeId, action, stateAfter }` |
| Custom (`data-wci-emit`) | target element | `{ nodeId, action, value, stateAfter }` |

`WciBridge.onStateChange()` subscribes to `wci:state-change`.

---

## 5. Layer 2 — Distillation

### Purpose

Transform annotated DOM into a **token-efficient** representation for LLM context—dropping chrome, hidden subtrees, and out-of-scope nodes.

### `WciDistiller`

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({
  format: 'json',           // 'json' | 'markdown'
  scope: 'registration-form',
  maxNodes: 128,
  includeState: true,
  siteContext: {
    name: 'ExampleShop',
    purpose: 'E-commerce demo',
    auth_required_for: ['checkout'],
    denied_scopes: ['admin-panel'],
  },
});

const view = distiller.distil(document);       // WciView | string
const json = distiller.distilJSON(document);   // pretty JSON string
const md   = distiller.distilMarkdown(document);
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `'json'` | `'json'` or `'markdown'` |
| `scope` | undefined | Only nodes in this landmark scope |
| `maxNodes` | `128` | Hard cap after priority sort |
| `siteContext` | undefined | `SiteContextSummary` embedded in view |
| `includeState` | `true` | If false, strips `state` to save tokens |

### Pruning rules (`pruneDOM`)

1. Walk DOM from root (or scoped element).
2. Skip subtrees where node is marked hidden for distillation.
3. Include elements with `data-wci-id` or `data-wci-role` (via `readWciNodeSpec`).
4. If `scope` set: keep nodes where `spec.scope === scope` or `spec.id === scope`.
5. Exclude nodes with `data-wci-hidden="true"`.
6. Sort by `priority` ascending (1 = most important).
7. Truncate to `maxNodes`.

**Implementation:** `packages/distiller/src/pruner.ts`, `serializer-json.ts`, `serializer-md.ts`.

### `WciView` JSON shape

```json
{
  "wci_version": "1.0",
  "page_title": "Register",
  "scope": "registration-form",
  "scope_desc": "New user registration",
  "distilled_at": "2026-05-22T12:00:00.000Z",
  "node_count": 5,
  "site_context": {
    "name": "ExampleShop Demo",
    "purpose": "Demo e-commerce",
    "auth_required_for": ["checkout"],
    "denied_scopes": ["admin-panel"]
  },
  "nodes": [
    {
      "id": "email-input",
      "role": "form",
      "desc": "User email — must be unique",
      "action": "fill",
      "required": true,
      "state": { "value": "", "valid": null },
      "scope": "registration-form",
      "priority": 1
    }
  ]
}
```

### JSON vs Markdown

| Format | Best for |
|--------|----------|
| **JSON** | Tool-calling models, structured parsing, RAG chunking |
| **Markdown** | Chat models, human-readable logs, tables of actionable nodes |

Markdown output splits **Actionable Nodes** vs **Status & Display Nodes** tables.

### Token budgeting checklist

1. Set `scope` to one landmark per turn.
2. Lower `maxNodes` (e.g. 32–64).
3. Set `includeState: false` when state is redundant.
4. Embed only needed `siteContext` fields.
5. Rough estimate: `tokens ≈ character_count / 4` (demo heuristic).

### Server-side distillation

Reference implementation is **browser-first**. For SSR/crawlers:

- Run `pruneDOM` + `serializeJSON` in **jsdom** (or similar), or
- Pre-render `WciView` at the edge and serve as JSON API (`capabilities.distiller_endpoint` in manifest).

---

## 6. Layer 3 — Action protocol (Bridge)

### `WciBridge`

```typescript
import { WciBridge } from '@webcontextinterface/bridge';

const bridge = new WciBridge(document.getElementById('registration-form')!);

await bridge.dispatch({ nodeId: 'email-input', action: 'fill', value: 'a@b.com' });
await bridge.fill('email-input', 'a@b.com');
await bridge.click('submit-btn');
await bridge.check('terms-checkbox', true);
await bridge.select('country-select', 'US');

bridge.onStateChange(({ nodeId, action, stateAfter }) => { /* ... */ });
const history = bridge.getHistory();
bridge.clearHistory();
```

Root element limits `querySelector('[data-wci-id="..."]')` search space—use scoped roots for large pages.

### Low-level dispatcher

```typescript
import { dispatchAction } from '@webcontextinterface/bridge';

const result = await dispatchAction(
  { nodeId: 'submit-btn', action: 'click' },
  document.body
);
```

No history or `onStateChange` wrapper—use for one-off calls.

### DOM effects per action

| Action | DOM behavior |
|--------|----------------|
| `click` | `.click()`; checkbox updates `checked` in state |
| `fill` | Native value setter + bubbling `input`/`change` (React/Vue safe) |
| `select` | `<select>.value` + `change` |
| `check` | `checked` + `change` |
| `focus` | `.focus()` |
| `clear` | Clears input + events |
| `submit` | `form.requestSubmit()` |
| `navigate` | `window.location.href` from `href` or `value` |

After action: optional **custom emit** + `wci:state-change` on `document`; **microtask yield** then **side-effect scan** across all `[data-wci-id]` nodes.

### `ActionRequest`

```typescript
interface ActionRequest {
  nodeId: string;
  action: 'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear';
  value?: string | boolean | number;
}
```

### `ActionResult` (success)

```typescript
{
  success: true,
  nodeId: 'email-input',
  action: 'fill',
  value: 'user@example.com',
  timestamp: '2026-05-22T12:00:00.000Z',
  stateChange: {
    before: { value: '' },
    after: { value: 'user@example.com' }
  },
  sideEffects: [
    { nodeId: 'submit-btn', change: { enabled: true } }
  ]
}
```

**Side effects** — other annotated nodes whose `data-wci-state` changed (e.g. reactive UI enabling submit).

### Precondition checks

If `data-wci-precondition` is set **and** the element has the `disabled` attribute → `PRECONDITION_UNMET` without mutating DOM.

**Implementation:** `packages/bridge/src/dispatcher.ts`, `bridge.ts`, `result.ts`.

---

## 7. Layer 4 — Agentic experience (site context)

### Site narrative (`wci.md`)

Runtime file served at `/wci.md` (or discovered URL). Contains:

- What the site does (for agents)
- Allowed / forbidden behaviors
- Auth flows and task recipes
- Error recovery tables
- Rate limits and contact

**Example:** [`demo/public/wci.md`](./demo/public/wci.md).

This root **`agent.md`** is the **framework encyclopedia**; **`wci.md`** is the **per-site** narrative copied into LLM system prompts.

### Directives (`wci.txt`)

Robots.txt-style key-value lines:

| Key | Meaning |
|-----|---------|
| `WCI-Version` | Spec version |
| `Site-Name` / `Site-Purpose` | Identity |
| `Contact` | Publisher contact |
| `Manifest` / `Context` | URLs to `wci.json` and `wci.md` |
| `Allow-Scope` / `Deny-Scope` | Comma-separated scope IDs |
| `Rate-Limit-Actions` / `Rate-Limit-Distil` | Per-minute limits |
| `Auth-Required` | Scopes needing session |
| `Auth-Method` / `Auth-Flow-Scope` | How to authenticate |
| `Require-Human-Confirmation` | Scopes agents must not auto-run |
| `Last-Updated` | Policy freshness |

**Example:** [`demo/public/wci.txt`](./demo/public/wci.txt).

### Manifest (`wci.json`)

Structured site contract:

- `site` — name, base_url, purpose, language, contact
- `capabilities` — `wci_supported`, `action_protocol_version`, optional `distiller_endpoint`
- `authentication` — `required_for`, `method`, `auth_flow_scope`, `auth_flow_url`
- `task_flows[]` — multi-step journeys with `scope`, `url_pattern`, auth/confirmation flags
- `scopes[]` — `ScopeDescriptor` with sensitivity (`low` | `medium` | `high` | `critical`)
- `denied_scopes`, `rate_limits`

**Example:** [`demo/public/wci.json`](./demo/public/wci.json).

### `WciContextLoader`

```typescript
import { WciContextLoader, ScopeDeniedError } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load('https://your-site.com', responseHeaders);

ctx.policy.assertScopeAllowed('registration-form');
if (ctx.policy.requiresAuth('checkout')) { /* login */ }
if (ctx.policy.requiresHumanConfirmation('checkout')) { /* ask user */ }

const systemNarrative = ctx.narrative;  // raw wci.md
const flows = ctx.manifest?.task_flows;
```

Loads three files in parallel with fallbacks (see [Appendix C](#appendix-c--discovery-protocol)).

### `PolicyEngine`

| Method | Behavior |
|--------|----------|
| `isScopeDenied(scopeId)` | Deny list, or not on allow list when allow list non-empty |
| `assertScopeAllowed(scopeId)` | Throws `ScopeDeniedError` |
| `requiresAuth(scopeId)` | Listed in `Auth-Required` |
| `requiresHumanConfirmation(scopeId)` | Listed in `Require-Human-Confirmation` |

**Implementation:** `packages/context/src/index.ts`.

---

## 8. End-to-end agent loop

```text
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Load wci.*   │────►│ Build system    │────►│ Distil scope     │
│ (context)    │     │ prompt (wci.md) │     │ (WciDistiller)   │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Re-distil or │◄────│ ActionResult    │◄────│ LLM → dispatch   │
│ sideEffects  │     │ (WciBridge)     │     │ (LLM → dispatch) │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

**Pseudocode:**

```typescript
const ctx = await WciContextLoader.load(origin);
const bridge = new WciBridge(scopeRoot);
bridge.setPolicy(ctx.policy);
const distiller = new WciDistiller({ scope: 'registration-form', siteContext: summaryFrom(ctx) });

let lastResult: ActionResult | null = null;

while (!taskDone) {
  const view = distiller.distilJSON(document);
  const plan = await llm.plan({ system: ctx.narrative, view, lastResult });
  lastResult = await bridge.dispatch(plan.action);
  if (!lastResult.success) handleError(lastResult.error);
}
```

---

## 9. LLM integration patterns

### System prompt template

```markdown
You are an agent for {{site.name}}.

{{contents of wci.md}}

Rules:
- Only use node IDs from the distilled view.
- Denied scopes: {{denied}} — never attempt them.
- Human confirmation required: {{confirm}} — ask the user first.
- On ActionResult.error, read `hint`; do not retry denied scopes.
- Trust data-wci-state over cached snapshots; refresh after navigation.
```

### Tool / function schema

```json
{
  "name": "wci_dispatch",
  "description": "Interact with a WCI-annotated page",
  "parameters": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "action": {
        "enum": ["click", "fill", "select", "check", "submit", "navigate", "focus", "clear"]
      },
      "value": {}
    },
    "required": ["nodeId", "action"]
  }
}
```

### Context window layering

| Layer | Content | Update frequency |
|-------|---------|------------------|
| Static | `wci.md` + manifest task flows | Per session / site |
| Per turn | `distilJSON(scope)` | After navigation or major UI change |
| Feedback | Last `ActionResult` JSON | Every action |

### Agent behavior on errors

| Code | Behavior |
|------|----------|
| `NODE_NOT_FOUND` | Re-distil; page may have navigated |
| `PRECONDITION_UNMET` | Complete prerequisite fields first |
| `SCOPE_DENIED` | Stop; inform user (policy) |
| `VALIDATION_FAILED` | Read `hint`, fix value, retry |
| `AUTH_REQUIRED` | Run auth flow scope |
| `RATE_LIMITED` | Back off per `Retry-After` |
| `UNKNOWN_ERROR` | Alternate action or ask user |

### Rate limiting

Parse `Rate-Limit-Actions` and `Rate-Limit-Distil` from `wci.txt`; throttle client-side before Bridge/Distiller calls.

---

## 10. Packages & codebase map

| Package | npm name | Responsibility | Key exports |
|---------|----------|----------------|-------------|
| Spec | `@webcontextinterface/spec` | Types, `readWciNodeSpec` | `WciNodeSpec`, `WciView`, `SiteManifest`, `WciPolicy` |
| Distiller | `@webcontextinterface/distiller` | Prune + serialize | `WciDistiller`, `pruneDOM` |
| Bridge | `@webcontextinterface/bridge` | Actions + results | `WciBridge`, `dispatchAction`, `ActionResult` |
| Context | `@webcontextinterface/context` | Site files + policy | `WciContextLoader`, `PolicyEngine` |
| Core | `@webcontextinterface/core` | Umbrella re-export | All of the above |

**Build:** `tsup` → ESM + CJS + `.d.ts` in each `packages/*/dist/`.

**Install:**

```bash
npm install @webcontextinterface/core
# or: @webcontextinterface/spec @webcontextinterface/distiller @webcontextinterface/bridge @webcontextinterface/context
```

**Development:**

```bash
npm install
npm run build      # build all packages
npm run demo       # interactive demo :5173
npm run docs:dev   # VitePress :5174
```

### When to use which package

| Use case | Packages |
|----------|----------|
| Read-only crawler / RAG | `@webcontextinterface/spec` + `@webcontextinterface/distiller` |
| In-browser agent | + `@webcontextinterface/bridge` |
| Multi-page flows with policy | + `@webcontextinterface/context` |
| Application quick start | `@webcontextinterface/core` |

---

## 11. Repository layout

```text
WIA_framework/
├── agent.md              ← this document (master reference)
├── CITATION.cff          ← machine-readable citation
├── README.md             ← project overview
├── docs/                 ← VitePress documentation site
│   ├── architecture.md
│   ├── specification.md
│   ├── distillation.md
│   ├── action-protocol.md
│   ├── site-policy.md
│   ├── llm-integration.md
│   └── api/
├── packages/
│   ├── spec/src/index.ts
│   ├── distiller/src/{index,pruner,serializer-json,serializer-md}.ts
│   ├── bridge/src/{bridge,dispatcher,result}.ts
│   ├── context/src/index.ts
│   └── core/src/index.ts
├── demo/                 ← Vite interactive showcase
│   ├── main.ts
│   └── public/{wci.txt,wci.json,wci.md}
├── examples/             ← larger annotated HTML samples
├── paper/                ← CIKM resource track LaTeX
└── scripts/build-website.mjs
```

---

## 12. Demo & examples

### Interactive demo (`npm run demo`)

- **URL (production):** [https://webcontextinterface.vercel.app/demo/](https://webcontextinterface.vercel.app/demo/) · **local:** `http://localhost:5173`
- Registration form with live **human vs agent** views
- JSON/Markdown distillation panes
- Action log with `ActionResult` traces
- Site context viewer (`wci.txt`, `wci.json`, `wci.md`)

### Site context files in demo

Served from `demo/public/`:

- `wci.txt` — ExampleShop allow/deny, auth, rates
- `wci.json` — task flows (`create-account`, `purchase-item`), scope descriptors
- `wci.md` — agent-facing narrative and error recovery

### Examples directory

`examples/` — larger pages (e.g. e-commerce HTML) for benchmarking annotation density and token reduction.

---

## 13. Ethics, policy & misuse

### Design stance

- **Opt-in** publisher annotation only
- Explicit **deny scopes** and **human confirmation** for sensitive flows
- Does **not** bypass CAPTCHA, MFA, or authentication
- Does **not** encourage non-consensual automation on third-party sites

### Publisher responsibilities

- IRB/GDPR if logging agent interactions
- Keep `wci.txt` / manifest aligned with real auth boundaries
- Rotate `Last-Updated` when policy changes

### Agent responsibilities

- Honor `Deny-Scope` and `Require-Human-Confirmation`
- Respect rate limits
- Never store payment card data unless site explicitly allows in `wci.md`

---

## 14. Limitations & roadmap

| Limitation | Notes |
|------------|-------|
| No open-web magic | Unannotated pages need legacy VLM/DOM pipelines |
| Multimodal | Pixels/PDFs not first-class in spec 1.0 |
| Security | Sandboxing, secrets → integrator responsibility |
| `upload` action | Declared in spec; not fully implemented in reference bridge |
| Standardisation | W3C/community process — future work |
| Formal verification | Preconditions are NL + `disabled` only |

**Roadmap ideas:**

- Zenodo DOI + pinned release for citations
- Server-side distiller endpoint in manifest
- W3C Community Group / CG report
- Datasheet for datasets ([Gebru et al.](https://doi.org/10.1145/3458723)) style agent resource doc

---

## 15. Research & evaluation context

WCI is described as a **CIKM 2026 Resource Track** software artifact: open npm packages, demo, docs, and site-root policy files.

**Motivation (empirical):** Web agents on benchmarks (WebArena, Mind2Web, Online-Mind2Web, Odysseys) remain token- and latency-heavy relative to humans when operating on human-oriented pages.

**Hypothesis:** Publisher-authored **agentic interface + AX** reduces tokens per step, improves reliability, and enables reproducible evaluation on cooperating sites.

**Citation:**

```bibtex
@software{wci2026,
  author       = {Amirreza Alasti},
  title        = {WCI: Web Context Interface},
  year         = {2026},
  note         = {Contact: amirreza.alasti@stud.uni-hannover.de}
}
```

See also [`CITATION.cff`](./CITATION.cff) and [`paper/template.tex`](./paper/template.tex).

---

## Appendix A — Type reference

### `WciNodeSpec`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable dispatch ID |
| `role` | `WciRole` | Semantic category |
| `desc` | string | LLM-facing description |
| `action?` | `WciAction` | Dispatch verb |
| `state` | object | JSON snapshot |
| `precondition?` | string | NL guard |
| `required?` | boolean | Form completeness |
| `options?` | string[] | Select/radio choices |
| `emits?` | string | Custom event name |
| `scope?` | string | Landmark ID |
| `hidden?` | boolean | Prune from view |
| `priority?` | number | 1–5 |

### `SiteContextSummary`

Embedded in distilled views: `name`, `purpose`, `auth_required_for[]`, `denied_scopes[]`, optional `active_task_flow`, `current_step`.

### `TaskFlow` / `ScopeDescriptor`

Defined in `@webcontextinterface/spec` — see `packages/spec/src/index.ts` for full `SiteManifest` schema.

---

## Appendix B — Error codes

| Code | When | Agent hint |
|------|------|------------|
| `NODE_NOT_FOUND` | No `[data-wci-id]` in root | Re-distil; check navigation |
| `PRECONDITION_UNMET` | Precondition + `disabled` | Satisfy guards first |
| `SCOPE_DENIED` | Policy engine | Stop; inform user |
| `ACTION_NOT_SUPPORTED` | Reserved / future | — |
| `VALIDATION_FAILED` | Publisher validation | Read `hint`, fix value |
| `AUTH_REQUIRED` | Auth-gated scope | Run login flow |
| `RATE_LIMITED` | Too many calls | Back off |
| `UNKNOWN_ERROR` | DOM/type mismatch | Check action vs element type |

---

## Appendix C — Discovery protocol

`WciContextLoader.load(baseUrl, headers?)` resolves file URLs in priority order:

1. **HTML meta tags** (highest)  
   `meta[name="wci:directives"]`, `wci:manifest`, `wci:context`
2. **HTTP headers** on initial navigation  
   `X-WCI-Directives`, `X-WCI-Manifest`, `X-WCI-Context`
3. **Root defaults**  
   `/wci.txt`, `/wci.json`, `/wci.md`
4. **Well-known (RFC 8615)** — fetched only when no explicit URL was set via meta/headers; used if the primary fetch returns no body  
   `/.well-known/wci/directives.txt`, `manifest.json`, `context.md`

Fetches configured URLs in parallel; root or explicit URL content wins over well-known when both return a body.

---

## Appendix D — Annotation cookbook

### Checkout (high sensitivity)

```html
<section
  data-wci-role="landmark"
  data-wci-id="checkout"
  data-wci-desc="Payment and shipping — irreversible; requires human confirmation">
  <!-- data-wci-scope="checkout" on children -->
</section>
```

Manifest: `"sensitivity": "high"`, `"requires_human_confirmation": true`.

### Status / loading

```html
<div
  data-wci-id="form-status"
  data-wci-role="status"
  data-wci-desc="Validation summary"
  data-wci-state='{"message":"","level":"idle"}'>
</div>
```

### Hide decorative chrome

```html
<div data-wci-hidden="true" aria-hidden="true">...</div>
```

### Primary vs secondary CTA

- Primary: `data-wci-priority="1"`
- Secondary: `data-wci-priority="3"` or higher

### Incremental adoption plan

1. Add `wci.txt` with deny list + contact.
2. Annotate one landmark (e.g. signup).
3. Ship `wci.md` task recipe for that flow.
4. Add `wci.json` task flows as you add scopes.
5. Wire `WciDistiller` + `WciBridge` in your agent runtime.

---

## Quick links

| Resource | Path |
|----------|------|
| Getting started | [docs/getting-started.md](./docs/getting-started.md) |
| Specification | [docs/specification.md](./docs/specification.md) |
| Architecture | [docs/architecture.md](./docs/architecture.md) |
| LLM integration | [docs/llm-integration.md](./docs/llm-integration.md) |
| API: Bridge | [docs/api/bridge.md](./docs/api/bridge.md) |
| Demo `wci.md` | [demo/public/wci.md](./demo/public/wci.md) |

---

*Last updated: 2026-05-22 — aligns with WCI spec 1.0 and repository implementation.*
