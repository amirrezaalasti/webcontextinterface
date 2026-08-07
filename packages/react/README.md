# @webcontextinterface/react

Declarative WCI annotation for React.

```tsx
import { Wci, WciLandmark, useWciBridge, useWciView } from '@webcontextinterface/react';

<WciLandmark id="signup" desc="New user registration">
  <Wci as="input" id="email" role="form" desc="Email address — must be unique"
       action="fill" required priority={1} state={{ value }} />
  <Wci as="button" id="go" role="action" desc="Create the account"
       action="click" priority={1}>Create account</Wci>
</WciLandmark>
```

Descendants inherit the landmark's id as their scope. Hand-written `data-wci-scope` is the most common annotation mistake, and a mismatched scope silently drops the node from every scoped distillation without any runtime error.

## Components

| | |
|---|---|
| `<Wci as="…">` | Any element with typed annotations attached |
| `<WciLandmark>` | A bounded task zone; provides scope to descendants |
| `<WciScope scope="…">` | Set scope without rendering an element |

## Hooks

```tsx
const { bridge, rootRef, history } = useWciBridge();   // destroyed on unmount
const view = useWciView({ scope: 'signup' });          // live, MutationObserver-backed
const latest = useWciActions('email');                 // react to agent interaction
const props = useWciNode({ id, role, desc });          // build attributes yourself
const scope = useWciScope();                           // nearest enclosing landmark
```

`useWciView` observes only `data-wci-*` attribute changes, so ordinary re-renders that touch classNames or text do not trigger re-distillation.

`useWciBridge` tears the bridge down on unmount — a bridge subscribes to a document-level event, so creating one without cleanup leaks a listener per mount.

## Why not hand-write the attributes

`wciProps` serialises state to JSON, omits absent optionals instead of rendering the string `"undefined"`, and gives you a compile error for a typo'd role. Raw attributes give you none of that.

MIT © WCI
