# ⚡ `@webcontextinterface/bridge` API

Typed action dispatch with **`ActionResult`** feedback and optional **`PolicyEngine`** enforcement.

## `WciBridge`

Session-scoped bridge: history, convenience methods, `wci:state-change` subscription.

### `constructor(root?: Element, options?: WciBridgeOptions)`

| Option | Type | Description |
|--------|------|-------------|
| `root` | `Element` | Search root for `[data-wci-id]` targets. Default: `document.body` |
| `options.policy` | `PolicyEngine` | Enforce `wci.txt` rules on every dispatch |

Subscribes to `wci:state-change` on `document`.

### `setPolicy(policy?: PolicyEngine): void`

Attach or replace site policy (typically `ctx.policy` from `WciContextLoader`).

### `getPolicy(): PolicyEngine | undefined`

### `dispatch(req: ActionRequest): Promise<ActionResult>`

Runs policy checks when a `PolicyEngine` is set, then mutates the DOM.

### Convenience methods

| Method | Signature |
|--------|-----------|
| `fill` | `(nodeId, value: string)` |
| `click` | `(nodeId)` |
| `check` | `(nodeId, checked?: boolean)` |
| `select` | `(nodeId, value: string)` |

### History and events

| Method | Description |
|--------|-------------|
| `onStateChange(handler)` | Subscribe; returns unsubscribe function |
| `getHistory()` | Copy of all session `ActionResult`s |
| `clearHistory()` | Reset history |

## `dispatchAction(req, root?, policy?): Promise<ActionResult>`

Stateless dispatcher without history. Optional third argument applies the same policy rules as `WciBridge`.

## Policy helpers

| Function | Description |
|----------|-------------|
| `resolveScopeId(target, fallbackNodeId)` | Scope from `data-wci-scope` or landmark ancestry |
| `enforcePolicyForDispatch(policy, req, target)` | Returns blocking `ActionResult` or `null` |
| `checkPolicyBeforeDispatch(policy, req, root)` | Resolve target in root, then enforce |

## Types

### `ActionRequest`

```typescript
interface ActionRequest {
  nodeId: string;
  action: 'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear';
  value?: string | boolean | number;
}
```

### `ActionResult`

```typescript
interface ActionResult {
  success: boolean;
  nodeId: string;
  action: string;
  value?: unknown;
  stateChange?: { before: Record<string, unknown>; after: Record<string, unknown> };
  sideEffects?: SideEffect[];
  error?: ActionError;
  timestamp: string;
}
```

### `ActionError.code`

| Code | When |
|------|------|
| `NODE_NOT_FOUND` | No `[data-wci-id]` match in root |
| `SCOPE_DENIED` | Scope denied or not on allow list |
| `AUTH_REQUIRED` | Scope requires authentication |
| `HUMAN_CONFIRMATION_REQUIRED` | Scope requires explicit user approval |
| `PRECONDITION_UNMET` | `data-wci-precondition` / disabled element |
| `ACTION_NOT_SUPPORTED` | Verb not supported for element type |
| `VALIDATION_FAILED` | Input validation failed |
| `RATE_LIMITED` | Rate limit exceeded |
| `UNKNOWN_ERROR` | Other failure |

### Other types

- `SideEffect` — `{ nodeId, change }`
- `StateChangeHandler` — callback for `wci:state-change`
- `WciBridgeOptions` — `{ policy?: PolicyEngine }`

## Policy enforcement flow

1. Resolve target element by `data-wci-id`.
2. If `policy` is set, resolve scope and check deny / auth / human-confirmation.
3. Check `data-wci-precondition` and element disabled state.
4. Execute action; update `data-wci-state`; collect side effects.

## Install

```bash
npm install @webcontextinterface/bridge
```

```typescript
import {
  WciBridge,
  dispatchAction,
  resolveScopeId,
  type ActionResult,
  type WciBridgeOptions,
} from '@webcontextinterface/bridge';
```

**Dependencies:** `@webcontextinterface/spec`, `@webcontextinterface/context`

## See also

- [Action protocol](../action-protocol.md)
- [Site policy](../site-policy.md)
