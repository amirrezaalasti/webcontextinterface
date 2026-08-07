---
title: React bindings
description: Typed WCI annotations with automatic scope inheritance.
---

# React bindings

```bash
npm install @webcontextinterface/react
```

## Components

```tsx
import { Wci, WciLandmark } from '@webcontextinterface/react';

function Signup() {
  const [email, setEmail] = useState('');

  return (
    <WciLandmark id="signup" desc="New user registration — email and password">
      <Wci
        as="input"
        id="signup-email"
        role="form"
        desc="Email address — must be unique across accounts"
        action="fill"
        required
        priority={1}
        state={{ value: email, valid: email.includes('@') }}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Wci
        as="button"
        id="signup-submit"
        role="action"
        desc="Create the account and sign the user in"
        action="click"
        precondition="Email must be valid and terms accepted"
        priority={1}
      >
        Create account
      </Wci>
    </WciLandmark>
  );
}
```

Note what is **absent**: no `data-wci-scope` on either child. `<WciLandmark>` provides its id through context, and descendants inherit it.

That matters because a mismatched scope is the most damaging annotation mistake there is — it produces no error, no warning at runtime, and silently removes the node from every scoped distillation and every `wci.txt` policy decision.

| Component | Purpose |
|-----------|---------|
| `<Wci as="…">` | Any element with typed annotations |
| `<WciLandmark>` | A bounded task zone; provides scope to descendants |
| `<WciScope scope="…">` | Set scope without rendering an element |

## Hooks

### `useWciBridge()`

```tsx
const { bridge, rootRef, history } = useWciBridge();

<div ref={rootRef}>
  {/* annotated tree */}
</div>
```

The bridge is scoped to the ref'd element and **destroyed on unmount**. A bridge subscribes to a document-level event, so creating one without cleanup leaks a listener on every mount.

`history` updates after each dispatch completes, via `onResult` rather than the DOM event — the event fires mid-dispatch, before the result exists.

### `useWciView()`

```tsx
const view = useWciView({ scope: 'signup' });
```

The live distilled view, backed by a `MutationObserver` filtered to `data-wci-*` attributes. Ordinary re-renders that touch classNames or text do not trigger re-distillation.

### `useWciActions()`

```tsx
const latest = useWciActions('signup-email');
```

React to agent-driven interaction the same way you react to user-driven interaction, without threading a bridge reference through props. Pass a node id to filter, or omit it for all nodes.

### `useWciNode()`

```tsx
const props = useWciNode({ id: 'x', role: 'action', desc: '…' });
return <button {...props} />;
```

Build the attributes yourself when you need a custom element. Scope is still inherited, and the result is referentially stable across renders that changed nothing an agent can observe.

## Why not hand-write the attributes

```tsx
// Every one of these is a real failure mode:
<button
  data-wci-id="pay"
  data-wci-rôle="action"                    // typo — silently ignored
  data-wci-state={JSON.stringify(state)}    // fine, until someone forgets
  data-wci-scope="chekout"                  // typo — node vanishes from the view
  data-wci-action={maybeUndefined}          // renders the string "undefined"
/>
```

`wciProps` serialises state, omits absent optionals instead of stringifying `undefined`, inherits scope, and gives you a compile error for a typo'd role.
