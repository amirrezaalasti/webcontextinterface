# Action protocol

The Bridge executes agent-chosen actions on live DOM and returns a typed **`ActionResult`** every time.

## WciBridge

```typescript
import { WciBridge } from '@webcontextinterface/bridge';

const bridge = new WciBridge(rootElement);

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
| `PRECONDITION_UNMET` | `data-wci-precondition` set and element `disabled` |
| `UNKNOWN_ERROR` | Unsupported action for element type, missing form, etc. |

## Low-level dispatcher

Use when you do not need history or `onStateChange`:

```typescript
import { dispatchAction } from '@webcontextinterface/bridge';

const result = await dispatchAction(
  { nodeId: 'submit-btn', action: 'click' },
  document.body
);
```

## React / Vue compatibility

`fill` uses the native input value setter and dispatches bubbling `input` and `change` events so controlled components update. A microtask yield runs before side-effect collection.

## See also

- [API: bridge](./api/bridge.md)
