# ⚡ Action protocol

The Bridge executes agent-chosen actions on live DOM and returns a typed **`ActionResult`** every time.

## WciBridge

```typescript
import { WciBridge } from '@webcontextinterface/bridge';
import { WciContextLoader } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load(window.location.origin);
const bridge = new WciBridge(rootElement);
bridge.setPolicy(ctx.policy);

// Low-level
await bridge.dispatch({ nodeId: 'email-input', action: 'fill', value: 'a@b.com' });

// Convenience
await bridge.fill('email-input', 'a@b.com');
await bridge.click('submit-btn');
await bridge.check('terms-checkbox', true);
await bridge.select('country-select', 'US');

// Observe
bridge.onStateChange(({ nodeId, action, stateAfter }) => { /* ... */ });
const history = bridge.getHistory();
bridge.clearHistory();
```

## ActionRequest

```typescript
interface ActionRequest {
  nodeId: string;
  action: 'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear';
  value?: string | boolean | number;
}
```

The `action` should match the target node's `data-wci-action` when possible.

## ActionResult

### Success

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
  sideEffects?: [
    { nodeId: 'submit-btn', change: { enabled: true } }
  ]
}
```

**Side effects** — other annotated nodes whose `data-wci-state` changed after the action (e.g. reactive UI enabling a button).

### Failure

```typescript
{
  success: false,
  nodeId: 'missing',
  action: 'click',
  timestamp: '...',
  error: {
    code: 'NODE_NOT_FOUND',
    message: 'No element with data-wci-id="missing"...',
    hint: 'Verify the node ID from the distilled view.'
  }
}
```

### Error codes

| Code | When |
|------|------|
| `NODE_NOT_FOUND` | No `[data-wci-id]` match in root |
| `SCOPE_DENIED` | Target scope is denied or not on the allow list (`wci.txt`) |
| `AUTH_REQUIRED` | Scope requires authentication before dispatch |
| `HUMAN_CONFIRMATION_REQUIRED` | Scope requires explicit user approval |
| `PRECONDITION_UNMET` | `data-wci-precondition` set and element `disabled` |
| `UNKNOWN_ERROR` | Unsupported action for element type, missing form, etc. |

## Policy enforcement

When a `PolicyEngine` is attached (`bridge.setPolicy(ctx.policy)` or `new WciBridge(root, { policy })`), every `dispatch` / `fill` / `click` / etc. validates the target node's scope (from `data-wci-scope` or enclosing landmark) **before** mutating the DOM. Violations return `success: false` with the codes above.

Use `PolicyEngine.assertScopeAllowed(scopeId)` separately when you need to reject a planned action before building an `ActionRequest` (e.g. from manifest scope metadata).

## Low-level dispatcher

Use when you do not need history or `onStateChange`:

```typescript
import { dispatchAction } from '@webcontextinterface/bridge';

const result = await dispatchAction(
  { nodeId: 'submit-btn', action: 'click' },
  document.body,
  ctx.policy
);
```

## React / Vue compatibility

`fill` uses the native input value setter and dispatches bubbling `input` and `change` events so controlled components update. A microtask yield runs before side-effect collection.

## See also

- [API: bridge](./api/bridge.md)
