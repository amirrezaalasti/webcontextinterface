# Site policy and context

Site-wide files give agents grounding **before** they interact with a single page—similar to `robots.txt` for crawlers.

## Files

| File | Format | Purpose |
|------|--------|---------|
| `/wci.txt` | Key-value directives | Allow/deny scopes, rate limits, auth |
| `/wci.json` | JSON manifest | Task flows, scope descriptors, capabilities |
| `/wci.md` | Markdown | Narrative for LLM system prompt |

Example `wci.txt` (from the demo):

```
WCI-Version: 1.0
Site-Name: ExampleShop Demo
Allow-Scope: registration-form, checkout
Deny-Scope: admin-panel
Auth-Required: checkout
Require-Human-Confirmation: checkout
Rate-Limit-Actions: 60/minute
```

## WciContextLoader

```typescript
import { WciContextLoader } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load('https://example.com');

// Policy from wci.txt
ctx.policy.assertScopeAllowed('registration-form');
if (ctx.policy.requiresAuth('checkout')) { /* login first */ }
if (ctx.policy.requiresHumanConfirmation('checkout')) { /* ask user */ }

// Structured manifest
const flows = ctx.manifest?.task_flows;

// System prompt material
const narrative = ctx.narrative;
```

Discovery order: `<meta name="wci:*">` (highest), then `X-WCI-Directives` / `X-WCI-Manifest` / `X-WCI-Context` headers, then `/wci.txt`, `/wci.json`, `/wci.md`, with `/.well-known/wci/*` as a fetch fallback. Pass optional `Headers` from the initial navigation response to honour header overrides. See [Specification — discovery order](./specification.md#discovery-order).

## PolicyEngine

| Method | Behavior |
|--------|----------|
| `isScopeDenied(scopeId)` | `true` if on deny list or not on allow list (when allow list non-empty) |
| `assertScopeAllowed(scopeId)` | Throws `ScopeDeniedError` |
| `requiresAuth(scopeId)` | Scope listed in `Auth-Required` |
| `requiresHumanConfirmation(scopeId)` | Scope listed in `Require-Human-Confirmation` |

## Embedding in distilled views

Pass a summary into the distiller so every page view carries site identity:

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({
  siteContext: {
    name: 'ExampleShop',
    purpose: 'E-commerce demo',
    auth_required_for: ['checkout'],
    denied_scopes: ['admin-panel'],
  },
});
```

## See also

- [Specification — site files](./specification.md#site-root-files)
- [API: context](./api/context.md)
