# 📦 `@webcontextinterface/core` API

All-in-one **Web Context Interface** SDK — re-exports every `@webcontextinterface/*` package.

## Install

```bash
npm install @webcontextinterface/core
```

## Usage

```typescript
import {
  // spec
  readWciNodeSpec,
  type WciNodeSpec,
  type WciView,
  type WciPolicy,
  // distiller
  WciDistiller,
  pruneDOM,
  // bridge
  WciBridge,
  dispatchAction,
  resolveScopeId,
  type ActionResult,
  type WciBridgeOptions,
  // context
  WciContextLoader,
  PolicyEngine,
  ScopeDeniedError,
} from '@webcontextinterface/core';
```

## Exports by package

| From | Symbols |
|------|---------|
| `@webcontextinterface/spec` | All types, `readWciNodeSpec` |
| `@webcontextinterface/distiller` | `WciDistiller`, `pruneDOM`, `serializeJSON`, `serializeMarkdown`, `DistillerOptions` |
| `@webcontextinterface/bridge` | `WciBridge`, `dispatchAction`, `resolveScopeId`, `enforcePolicyForDispatch`, `checkPolicyBeforeDispatch`, action types, `WciBridgeOptions` |
| `@webcontextinterface/context` | `WciContextLoader`, `PolicyEngine`, `ScopeDeniedError`, `SiteContext` |

## Agent loop example

```typescript
const ctx = await WciContextLoader.load(window.location.origin);

const distiller = new WciDistiller({ scope: 'checkout', format: 'json' });
const view = distiller.distilJSON(document);

const bridge = new WciBridge(document.getElementById('checkout')!);
bridge.setPolicy(ctx.policy);

const result = await bridge.click('continue-payment-btn');
```

## When to use `core` vs individual packages

| Scenario | Package |
|----------|---------|
| Full browser agent | `@webcontextinterface/core` |
| Server-side distillation only | `@webcontextinterface/distiller` + `@webcontextinterface/spec` |
| Minimal action runner | `@webcontextinterface/bridge` + `@webcontextinterface/context` |
| Types only (SSR, tests) | `@webcontextinterface/spec` |

Layers range from ~2 KB to ~12 KB minified (largest: `@webcontextinterface/bridge`); install only what you need.

## Package API pages

- [spec](./spec.md)
- [distiller](./distiller.md)
- [bridge](./bridge.md)
- [context](./context.md)

## See also

- [Getting started](../getting-started.md)
- [Architecture](../architecture.md)
