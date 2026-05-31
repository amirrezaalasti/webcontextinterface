# @webcontextinterface/distiller

Prune annotated DOM and serialize **WciView** (JSON) or Markdown for LLM context windows.

Part of the [Web Context Interface (WCI)](https://webcontextinterface.vercel.app/).

## Install

```bash
npm install @webcontextinterface/distiller
```

**Dependency:** `@webcontextinterface/spec`

## Quick start

```typescript
import { WciDistiller } from '@webcontextinterface/distiller';

const distiller = new WciDistiller({
  format: 'json',
  scope: 'registration-form',
  maxNodes: 64,
});

const json = distiller.distilJSON(document);
// Pass to your LLM as tool context or user message
```

## `WciDistiller`

### Constructor options (`DistillerOptions`)

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `'json'` | `'json'` → `WciView`; `'markdown'` → Markdown string |
| `scope` | — | Landmark `data-wci-id` to restrict pruning |
| `maxNodes` | `128` | Cap nodes after priority sort |
| `siteContext` | — | Embed site summary in every view |
| `includeState` | `true` | Strip `state` when `false` to save tokens |

### Methods

| Method | Returns |
|--------|---------|
| `distil(root?)` | `WciView` or Markdown `string` |
| `distilJSON(root?)` | Pretty-printed JSON string |
| `distilMarkdown(root?)` | Markdown string |

`root` defaults to `document`; pass an `Element` to distil a subtree.

## Low-level API

```typescript
import { pruneDOM, serializeJSON, serializeMarkdown } from '@webcontextinterface/distiller';

const nodes = pruneDOM(document.body, { scope: 'checkout', maxNodes: 32 });
const view = serializeJSON(nodes, { pageTitle: document.title, scope: 'checkout' });
```

### Pruning behavior

1. Collect elements with `data-wci-id` or `data-wci-role` inside the scope (or whole document).
2. Skip nodes with `data-wci-hidden="true"`.
3. Sort by `data-wci-priority` (1 = highest).
4. Truncate to `maxNodes`.

## Example output (`WciView`)

```json
{
  "wci_version": "1.0",
  "page_title": "Register",
  "scope": "registration-form",
  "node_count": 8,
  "nodes": [
    {
      "id": "email-input",
      "role": "form",
      "desc": "Email address for account",
      "action": "fill",
      "state": { "value": "" },
      "required": true
    }
  ]
}
```

## Related packages

| Package | Role |
|---------|------|
| `@webcontextinterface/bridge` | Execute actions chosen from the distilled view |
| `@webcontextinterface/context` | Attach `siteContext` from `wci.txt` / `wci.json` |
| `@webcontextinterface/core` | All-in-one SDK |

## Documentation

- [API reference](https://webcontextinterface.vercel.app/api/distiller)
- [Distillation guide](https://webcontextinterface.vercel.app/distillation)

## License

MIT
