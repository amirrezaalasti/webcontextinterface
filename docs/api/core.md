# `@wci/core` API

All-in-one **Web Context Interface** SDK — re-exports every WCI package.

## Install

```bash
npm install @wci/core
```

## Usage

```typescript
import {
  WciDistiller,
  WciBridge,
  WciContextLoader,
  readWciNodeSpec,
  PolicyEngine,
} from '@wci/core';
```

## Exports

| From | Symbols |
|------|---------|
| `@wci/spec` | All types, `readWciNodeSpec` |
| `@wci/distiller` | `WciDistiller`, `pruneDOM`, serializers |
| `@wci/bridge` | `WciBridge`, `dispatchAction`, action types |
| `@wci/context` | `WciContextLoader`, `PolicyEngine`, `ScopeDeniedError` |

See individual package API pages for details.
