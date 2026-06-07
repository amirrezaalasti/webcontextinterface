# ⚡ @webcontextinterface/bridge

Typed action dispatch from agent decisions to live DOM, with **`ActionResult`** feedback and optional **`PolicyEngine`** enforcement.

Part of the [Web Context Interface (WCI)](https://webcontextinterface.vercel.app/).

## Install

```bash
npm install @webcontextinterface/bridge
```

**Dependencies:** `@webcontextinterface/spec`, `@webcontextinterface/context`

Install `@webcontextinterface/context` only if you use policy enforcement (recommended for production agents).

## Quick start

```typescript
import { WciBridge } from '@webcontextinterface/bridge';
import { WciContextLoader } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load(window.location.origin);
const bridge = new WciBridge(document.getElementById('form-scope')!);
bridge.setPolicy(ctx.policy);

const result = await bridge.fill('email-input', 'user@example.com');
if (!result.success) {
  console.error(result.error?.code, result.error?.message);
}
```

## `WciBridge`

Session-scoped bridge with interaction history and `wci:state-change` subscription.

### Constructor

```typescript
new WciBridge(root?: Element, options?: { policy?: PolicyEngine })
```

Default `root` is `document.body`.

### Methods

| Method | Description |
|--------|-------------|
| `setPolicy(policy?)` | Attach site policy from `WciContextLoader` |
| `getPolicy()` | Current `PolicyEngine`, if any |
| `dispatch(req)` | Low-level dispatch |
| `fill(nodeId, value)` | Fill input |
| `click(nodeId)` | Click button/link |
| `check(nodeId, checked?)` | Toggle checkbox |
| `select(nodeId, value)` | Select dropdown option |
| `onStateChange(handler)` | Subscribe to DOM state events; returns unsubscribe |
| `getHistory()` | All `ActionResult`s this session |
| `clearHistory()` | Reset history |

## Policy enforcement

When a `PolicyEngine` is attached, **every dispatch validates scope rules before DOM mutation**:

1. Resolve scope from `data-wci-scope` or enclosing landmark.
2. Check deny list / allow list (`wci.txt`).
3. Block auth-required and human-confirmation scopes.

Violations return `success: false` with typed error codes — no throw.

| Code | Meaning |
|------|---------|
| `SCOPE_DENIED` | Scope blocked by site policy |
| `AUTH_REQUIRED` | Complete auth flow first |
| `HUMAN_CONFIRMATION_REQUIRED` | Get explicit user approval |
| `NODE_NOT_FOUND` | No matching `data-wci-id` |
| `PRECONDITION_UNMET` | Target disabled or guard failed |

`PolicyEngine.assertScopeAllowed()` remains available for pre-flight checks on planned scopes (e.g. from manifest metadata).

## Stateless dispatcher

```typescript
import { dispatchAction } from '@webcontextinterface/bridge';

const result = await dispatchAction(
  { nodeId: 'submit-btn', action: 'click' },
  document.body,
  ctx.policy
);
```

## Policy helpers

```typescript
import {
  resolveScopeId,
  enforcePolicyForDispatch,
  checkPolicyBeforeDispatch,
} from '@webcontextinterface/bridge';
```

Use when building custom dispatch pipelines outside `WciBridge`.

## `ActionResult`

Every call returns a structured result:

```typescript
interface ActionResult {
  success: boolean;
  nodeId: string;
  action: string;
  value?: unknown;
  stateChange?: { before: Record<string, unknown>; after: Record<string, unknown> };
  sideEffects?: { nodeId: string; change: Record<string, unknown> }[];
  error?: { code: string; message: string; hint?: string };
  timestamp: string;
}
```

**Side effects** — other annotated nodes whose `data-wci-state` changed (e.g. submit button enabled after fill).

## React / Vue

`fill` uses the native value setter and dispatches bubbling `input` and `change` events so controlled components update.

## Related packages

| Package | Role |
|---------|------|
| `@webcontextinterface/distiller` | Provide node ids for dispatch |
| `@webcontextinterface/context` | Load policy and site narrative |
| `@webcontextinterface/core` | All-in-one SDK |

## Documentation

- [API reference](https://webcontextinterface.vercel.app/api/bridge)
- [Action protocol](https://webcontextinterface.vercel.app/action-protocol)

## License

MIT
