# `@wci/bridge` API

## `WciBridge`

### `constructor(root?: Element)`

Default root: `document.body`. Subscribes to `wci:state-change` on `document`.

### `dispatch(req: ActionRequest): Promise<ActionResult>`

### `fill(nodeId, value: string): Promise<ActionResult>`

### `click(nodeId): Promise<ActionResult>`

### `check(nodeId, checked?: boolean): Promise<ActionResult>`

### `select(nodeId, value: string): Promise<ActionResult>`

### `onStateChange(handler): () => void`

Returns unsubscribe function.

### `getHistory(): ActionResult[]`

### `clearHistory(): void`

## `dispatchAction(req, root?): Promise<ActionResult>`

Stateless dispatcher; no history.

## Types

- `ActionRequest` — `nodeId`, `action`, optional `value`
- `ActionResult` — `success`, `stateChange?`, `sideEffects?`, `error?`, `timestamp`
- `ActionError` — `code`, `message`, `hint?`
- `SideEffect` — `{ nodeId, change }`
- `StateChangeHandler` — callback for `wci:state-change`

## Install

```bash
npm install @wci/bridge
```

```typescript
import { WciBridge, dispatchAction, type ActionResult } from '@wci/bridge';
```

Dependency: `@wci/spec` (types only at runtime for dispatcher).
