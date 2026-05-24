# `@webcontextinterface/distiller` API

## `WciDistiller`

### `constructor(opts?: DistillerOptions)`

### `distil(root?: Document | Element): WciView | string`

Returns `WciView` when `format: 'json'`, else Markdown string.

### `distilJSON(root?: Document | Element): string`

Pretty-printed JSON string.

### `distilMarkdown(root?: Document | Element): string`

### `DistillerOptions`

Extends `PrunerOptions` with `format?`, `siteContext?`, `includeState?`.

## `pruneDOM(root?, opts?): WciNodeSpec[]`

### `PrunerOptions`

| Field | Type |
|-------|------|
| `scope?` | `string` |
| `maxNodes?` | `number` |

## `serializeJSON(nodes, meta): WciView`

## `serializeMarkdown(nodes, meta): string`

## Install

```bash
npm install @webcontextinterface/distiller
```

```typescript
import { WciDistiller, pruneDOM } from '@webcontextinterface/distiller';
```

Dependency: `@webcontextinterface/spec`.
