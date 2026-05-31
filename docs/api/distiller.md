# `@webcontextinterface/distiller` API

Prune annotated DOM and serialize **WciView** (JSON) or Markdown for LLM context.

## `WciDistiller`

High-level distiller class.

### `constructor(opts?: DistillerOptions)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'json' \| 'markdown'` | `'json'` | Output format |
| `scope` | `string` | — | Landmark `data-wci-id` to restrict pruning |
| `maxNodes` | `number` | `128` | Max nodes after priority sort |
| `siteContext` | `SiteContextSummary` | — | Embed in every view |
| `includeState` | `boolean` | `true` | Omit `state` when `false` |

### `distil(root?: Document | Element): WciView | string`

Returns `WciView` when `format: 'json'`, else Markdown string.

### `distilJSON(root?: Document | Element): string`

Pretty-printed JSON string of `WciView`.

### `distilMarkdown(root?: Document | Element): string`

Markdown table/list representation.

## `pruneDOM(root?, opts?): WciNodeSpec[]`

Low-level pruning without serialization.

### `PrunerOptions`

| Field | Type | Description |
|-------|------|-------------|
| `scope?` | `string` | Restrict to landmark subtree |
| `maxNodes?` | `number` | Cap after priority sort |

**Algorithm:**

1. Query `[data-wci-id], [data-wci-role]` within scope.
2. Skip `data-wci-hidden="true"`.
3. Sort by `data-wci-priority` ascending (1 = highest).
4. Truncate to `maxNodes`.

## `serializeJSON(nodes, meta): WciView`

Build a `WciView` from pruned nodes.

**Meta fields:** `pageTitle`, `scope?`, `scopeDesc?`, `siteContext?`.

## `serializeMarkdown(nodes, meta): string`

Human-readable Markdown for chat/RAG pipelines.

## `WciView` shape

```typescript
interface WciView {
  wci_version: string;
  page_title: string;
  scope?: string;
  scope_desc?: string;
  distilled_at: string;
  node_count: number;
  site_context?: SiteContextSummary;
  nodes: WciNodeSpec[];
}
```

## Install

```bash
npm install @webcontextinterface/distiller
```

```typescript
import {
  WciDistiller,
  pruneDOM,
  serializeJSON,
  type DistillerOptions,
} from '@webcontextinterface/distiller';
```

**Dependency:** `@webcontextinterface/spec`

## See also

- [Distillation guide](../distillation.md)
- [spec API](./spec.md)
