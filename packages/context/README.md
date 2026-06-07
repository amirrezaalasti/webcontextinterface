# 🛡️ @webcontextinterface/context

Load site-wide **`wci.txt`**, **`wci.json`**, and **`wci.md`**; enforce scopes with **`PolicyEngine`**.

Part of the [Web Context Interface (WCI)](https://webcontextinterface.vercel.app/).

## Install

```bash
npm install @webcontextinterface/context
```

**Dependency:** `@webcontextinterface/spec`

## Quick start

```typescript
import { WciContextLoader } from '@webcontextinterface/context';

const ctx = await WciContextLoader.load('https://your-site.com');

console.log(ctx.narrative);           // wci.md — inject into LLM system prompt
console.log(ctx.manifest?.task_flows); // wci.json — structured flows
console.log(ctx.policy.policy);        // parsed wci.txt rules
```

## `WciContextLoader.load(baseUrl?, headers?)`

Resolves file URLs (highest → lowest): `<meta name="wci:directives|manifest|context">`, then `X-WCI-Directives` / `X-WCI-Manifest` / `X-WCI-Context` headers, then `/wci.txt`, `/wci.json`, `/wci.md`. Fetches in parallel; uses `/.well-known/wci/directives.txt`, `manifest.json`, `context.md` only when no explicit URL was set and the primary fetch misses.

Defaults `baseUrl` to `window.location.origin` in the browser.

### Returns `SiteContext`

| Field | Type | Description |
|-------|------|-------------|
| `policy` | `PolicyEngine` | Parsed `wci.txt` rules |
| `manifest` | `SiteManifest \| null` | Parsed `wci.json` |
| `narrative` | `string \| null` | Raw `wci.md` text |

## `PolicyEngine`

| Method | Behavior |
|--------|----------|
| `isScopeDenied(scopeId)` | Deny list, or not on allow list when allow list is non-empty |
| `assertScopeAllowed(scopeId)` | Throws `ScopeDeniedError` |
| `requiresAuth(scopeId)` | Listed in `Auth-Required` |
| `requiresHumanConfirmation(scopeId)` | Listed in `Require-Human-Confirmation` |
| `policy` | Raw `WciPolicy` object |

### `wci.txt` keys parsed

| Key | Field |
|-----|-------|
| `Allow-Scope` | `allowedScopes[]` |
| `Deny-Scope` | `deniedScopes[]` |
| `Auth-Required` | `authRequired[]` |
| `Require-Human-Confirmation` | `requireHumanConfirmation[]` |
| `Rate-Limit-Actions` | `rateLimitActions` |
| `Rate-Limit-Distil` | `rateLimitDistil` |
| `Site-Name`, `Site-Purpose`, … | Site metadata |

## Wire policy to the bridge

```typescript
import { WciContextLoader } from '@webcontextinterface/context';
import { WciBridge } from '@webcontextinterface/bridge';

const ctx = await WciContextLoader.load(origin);
const bridge = new WciBridge(scopeRoot);
bridge.setPolicy(ctx.policy);
// Every bridge.dispatch() now enforces wci.txt before DOM mutation
```

Use `assertScopeAllowed()` separately when validating a planned scope before building an `ActionRequest`.

## Errors

```typescript
import { ScopeDeniedError } from '@webcontextinterface/context';

try {
  ctx.policy.assertScopeAllowed('admin-panel');
} catch (e) {
  if (e instanceof ScopeDeniedError) {
    console.log(e.scopeId);
  }
}
```

## Related packages

| Package | Role |
|---------|------|
| `@webcontextinterface/bridge` | Enforce policy on every dispatch |
| `@webcontextinterface/distiller` | Embed `siteContext` in distilled views |
| `@webcontextinterface/core` | All-in-one SDK |

## Documentation

- [API reference](https://webcontextinterface.vercel.app/api/context)
- [Site policy guide](https://webcontextinterface.vercel.app/site-policy)

## License

MIT
