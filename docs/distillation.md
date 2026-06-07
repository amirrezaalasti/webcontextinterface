# ⚗️ Distillation

The distiller compresses annotated DOM into an **WciView** (JSON) or Markdown for LLM context.

## Basic usage

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({
  format: 'json',
  scope: 'registration-form',
  maxNodes: 128,
  includeState: true,
});

const view = distiller.distil(document);
const pretty = distiller.distilJSON(document);
const md = distiller.distilMarkdown(document);
```

## Options (`DistillerOptions`)

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `'json'` | `'json'` or `'markdown'` |
| `scope` | undefined | Only nodes in this landmark scope |
| `maxNodes` | `128` | Hard cap after priority sort |
| `siteContext` | undefined | `SiteContextSummary` embedded in view |
| `includeState` | `true` | If false, strips `state` to save tokens |

## Pruning (`pruneDOM`)

Lower-level API without serialization:

```typescript
import { pruneDOM } from '@webcontextinterface/distiller';

const nodes = pruneDOM(document.getElementById('form-scope')!, {
  scope: 'registration-form',
  maxNodes: 32,
});
```

Rules:

- Skips subtrees where `data-wci-hidden="true"`
- Includes nodes with `data-wci-id` or `data-wci-role`
- When `scope` is set, keeps nodes where `spec.scope === scope` or `spec.id === scope`
- Sorts by `priority` ascending (1 first)

## JSON vs Markdown

| Format | Best for |
|--------|----------|
| JSON | Tool-calling models, structured parsing, RAG chunking |
| Markdown | Chat models, human-readable logs |

## Token budgeting

1. Set `maxNodes` to cap list length
2. Set `includeState: false` if state is large or redundant
3. Use `scope` to distil one landmark at a time
4. Estimate tokens ≈ `characters / 4` (demo uses this heuristic)

## See also

- [API: distiller](./api/distiller.md)
- [Specification](./specification.md)
