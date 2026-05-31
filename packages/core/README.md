# @webcontextinterface/core

Complete **Web Context Interface (WCI)** SDK — spec types, distiller, bridge, and site context in one package.

[Documentation](https://webcontextinterface.vercel.app/) · [Getting started](https://webcontextinterface.vercel.app/getting-started)

## Install

```bash
npm install @webcontextinterface/core
```

Re-exports:

- `@webcontextinterface/spec`
- `@webcontextinterface/distiller`
- `@webcontextinterface/bridge`
- `@webcontextinterface/context`

Use individual packages when bundle size matters (~8 KB gzipped per layer).

## Quick start — agent loop

```typescript
import {
  WciContextLoader,
  WciDistiller,
  WciBridge,
} from '@webcontextinterface/core';

// 1. Site context + policy
const ctx = await WciContextLoader.load(window.location.origin);

// 2. Distil current scope for the LLM
const distiller = new WciDistiller({
  scope: 'registration-form',
  format: 'json',
  siteContext: ctx.manifest?.site
    ? { name: ctx.manifest.site.name, purpose: ctx.manifest.site.purpose, auth_required_for: [], denied_scopes: [] }
    : undefined,
});
const view = distiller.distilJSON(document);

// 3. Bridge with policy enforcement
const bridge = new WciBridge(document.getElementById('form-scope')!);
bridge.setPolicy(ctx.policy);

// 4. Dispatch agent-chosen action
const result = await bridge.fill('email-input', 'user@example.com');
```

## Exports

### From `@webcontextinterface/spec`

All types (`WciNodeSpec`, `WciView`, `WciPolicy`, `SiteManifest`, …) and `readWciNodeSpec`.

### From `@webcontextinterface/distiller`

`WciDistiller`, `pruneDOM`, `serializeJSON`, `serializeMarkdown`, `DistillerOptions`.

### From `@webcontextinterface/bridge`

`WciBridge`, `dispatchAction`, policy helpers (`resolveScopeId`, `enforcePolicyForDispatch`, `checkPolicyBeforeDispatch`), and action types (`ActionRequest`, `ActionResult`, `WciBridgeOptions`, …).

### From `@webcontextinterface/context`

`WciContextLoader`, `PolicyEngine`, `ScopeDeniedError`, `SiteContext`.

## Package map

| Need | Install |
|------|---------|
| Types + DOM reader only | `@webcontextinterface/spec` |
| LLM context serialization | `@webcontextinterface/distiller` |
| Action dispatch + results | `@webcontextinterface/bridge` |
| Site policy files | `@webcontextinterface/context` |
| Full agent runtime | `@webcontextinterface/core` |

## Documentation

- [Getting started](https://webcontextinterface.vercel.app/getting-started)
- [API reference](https://webcontextinterface.vercel.app/api/core)
- [Architecture](https://webcontextinterface.vercel.app/architecture)
- [LLM integration](https://webcontextinterface.vercel.app/llm-integration)

## License

MIT
