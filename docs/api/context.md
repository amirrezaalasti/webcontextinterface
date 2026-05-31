# `@webcontextinterface/context` API

Site-wide context loader and **`PolicyEngine`** for `wci.txt` / `wci.json` / `wci.md`.

## `WciContextLoader`

### `static load(baseUrl?: string, headers?: HeadersInit): Promise<SiteContext>`

Fetches and parses site context files in parallel.

**Discovery order:**

1. Response headers (`X-WCI-Policy`, `X-WCI-Manifest`, `X-WCI-Context`)
2. Well-known URIs (`/.well-known/wci/wci.txt`, etc.)
3. Root fallbacks (`/wci.txt`, `/wci.json`, `/wci.md`)

Defaults `baseUrl` to `window.location.origin` when omitted.

Missing files resolve to `null` / empty policy — no throw.

### Returns `SiteContext`

| Field | Type | Description |
|-------|------|-------------|
| `policy` | `PolicyEngine` | Parsed `wci.txt` rules |
| `manifest` | `SiteManifest \| null` | Parsed `wci.json` |
| `narrative` | `string \| null` | Raw `wci.md` for LLM system prompt |

## `PolicyEngine`

Wraps a parsed `WciPolicy` from `wci.txt`.

### `constructor(policy: WciPolicy)`

### `isScopeDenied(scopeId: string): boolean`

Returns `true` when:

- `scopeId` is in `deniedScopes`, or
- `allowedScopes` is non-empty and `scopeId` is not listed.

### `assertScopeAllowed(scopeId: string): void`

Throws `ScopeDeniedError` when scope is denied. Use for pre-flight validation before building an `ActionRequest`.

When using `@webcontextinterface/bridge`, prefer `bridge.setPolicy(ctx.policy)` — the bridge enforces the same rules automatically on dispatch.

### `requiresAuth(scopeId: string): boolean`

Listed in `Auth-Required` in `wci.txt`.

### `requiresHumanConfirmation(scopeId: string): boolean`

Listed in `Require-Human-Confirmation`.

### `readonly policy: WciPolicy`

Raw parsed policy object.

## `ScopeDeniedError`

```typescript
class ScopeDeniedError extends Error {
  readonly scopeId: string;
}
```

Message instructs the agent not to retry the denied scope.

## `WciPolicy` fields

| `wci.txt` key | Field |
|---------------|-------|
| `Allow-Scope` | `allowedScopes: string[]` |
| `Deny-Scope` | `deniedScopes: string[]` |
| `Auth-Required` | `authRequired: string[]` |
| `Require-Human-Confirmation` | `requireHumanConfirmation: string[]` |
| `Rate-Limit-Actions` | `rateLimitActions: number` |
| `Rate-Limit-Distil` | `rateLimitDistil: number` |
| `Site-Name`, `Site-Purpose`, `Contact`, … | Site metadata |

## Integration with bridge

```typescript
import { WciContextLoader } from '@webcontextinterface/context';
import { WciBridge } from '@webcontextinterface/bridge';

const ctx = await WciContextLoader.load(origin);
const bridge = new WciBridge(scopeRoot);
bridge.setPolicy(ctx.policy);
```

## Re-exported types

`WciPolicy`, `SiteManifest`, `TaskFlow`, `ScopeDescriptor` from `@webcontextinterface/spec`.

## Install

```bash
npm install @webcontextinterface/context
```

```typescript
import {
  WciContextLoader,
  PolicyEngine,
  ScopeDeniedError,
  type SiteContext,
} from '@webcontextinterface/context';
```

**Dependency:** `@webcontextinterface/spec`

## See also

- [Site policy](../site-policy.md)
- [Bridge API](./bridge.md) — automatic policy enforcement on dispatch
