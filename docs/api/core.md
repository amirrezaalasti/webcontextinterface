# `@webcontextinterface/core` API

All-in-one **Web Context Interface** SDK — re-exports every WCI package.

## Install

```bash
npm install @webcontextinterface/core
```

## Usage

```typescript
import {
  WciDistiller,
  WciBridge,
  WciContextLoader,
  readWciNodeSpec,
  PolicyEngine,
} from '@webcontextinterface/core';
```

## Exports

| From | Symbols |
|------|---------|
| `@webcontextinterface/spec` | All types, `readWciNodeSpec` |
| `@webcontextinterface/distiller` | `WciDistiller`, `pruneDOM`, serializers |
| `@webcontextinterface/bridge` | `WciBridge`, `dispatchAction`, action types |
| `@webcontextinterface/context` | `WciContextLoader`, `PolicyEngine`, `ScopeDeniedError` |

See individual package API pages for details.
