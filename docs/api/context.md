# `@wci/context` API

## `WciContextLoader`

### `static load(baseUrl?, headers?): Promise<SiteContext>`

Fetches and parses site context files. Defaults `baseUrl` to `window.location.origin`.

**Returns `SiteContext`:**

| Field | Type |
|-------|------|
| `policy` | `PolicyEngine` |
| `manifest` | `SiteManifest \| null` |
| `narrative` | `string \| null` |

## `PolicyEngine`

### `constructor(policy: WciPolicy)`

### `isScopeDenied(scopeId: string): boolean`

### `assertScopeAllowed(scopeId: string): void`

Throws `ScopeDeniedError`.

### `requiresAuth(scopeId: string): boolean`

### `requiresHumanConfirmation(scopeId: string): boolean`

### `readonly policy: WciPolicy`

## `ScopeDeniedError`

`scopeId` property; message instructs agent not to retry.

## Re-exported types

`WciPolicy`, `SiteManifest` from `@wci/spec`.

## Install

```bash
npm install @wci/context
```

```typescript
import { WciContextLoader, PolicyEngine, ScopeDeniedError } from '@wci/context';
```
