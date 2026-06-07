# 🏷️ @webcontextinterface/spec

TypeScript types and DOM helpers for the [WCI 1.0 specification](https://webcontextinterface.vercel.app/specification).

Part of the [Web Context Interface (WCI)](https://webcontextinterface.vercel.app/) — LLM-native web pages via `data-wci-*` markup.

## Install

```bash
npm install @webcontextinterface/spec
```

Zero runtime dependencies. Tree-shakeable ESM and CJS builds.

## Quick start

```typescript
import { readWciNodeSpec, type WciNodeSpec, type WciView } from '@webcontextinterface/spec';

const el = document.querySelector('[data-wci-id="email-input"]') as HTMLElement;
const spec = readWciNodeSpec(el);
// { id: 'email-input', role: 'form', desc: '...', action: 'fill', state: { value: '' }, ... }
```

## Exports

### Core types

| Type | Description |
|------|-------------|
| `WciRole` | `'action' \| 'form' \| 'display' \| 'nav' \| 'status' \| 'landmark'` |
| `WciAction` | `'click' \| 'fill' \| 'select' \| 'check' \| 'upload' \| 'submit' \| 'navigate' \| 'focus' \| 'clear'` |
| `WciNodeSpec` | One annotated node — maps 1:1 to `data-wci-*` attributes |
| `WciView` | Distilled page or scope (`nodes[]`, metadata, optional `site_context`) |
| `SiteContextSummary` | Abbreviated site info embedded in distilled views |

### Site policy types

| Type | Source file |
|------|-------------|
| `WciPolicy` | Parsed `wci.txt` rules |
| `SiteManifest` | Parsed `wci.json` manifest |
| `TaskFlow`, `ScopeDescriptor` | Structured task flows and scope metadata |

### Functions

#### `readWciNodeSpec(el: HTMLElement): WciNodeSpec | null`

Reads `data-wci-id`, `data-wci-role`, `data-wci-desc`, `data-wci-action`, `data-wci-state`, and optional attributes from a DOM element. Returns `null` when the element has neither `data-wci-id` nor `data-wci-role`.

## `data-wci-*` attributes

| Attribute | Maps to |
|-----------|---------|
| `data-wci-id` | `id` |
| `data-wci-role` | `role` |
| `data-wci-desc` | `desc` |
| `data-wci-action` | `action` |
| `data-wci-state` | `state` (JSON) |
| `data-wci-precondition` | `precondition` |
| `data-wci-required` | `required` |
| `data-wci-options` | `options` |
| `data-wci-emit` | `emits` |
| `data-wci-scope` | `scope` |
| `data-wci-hidden` | `hidden` |
| `data-wci-priority` | `priority` (1–5) |

## Related packages

| Package | Role |
|---------|------|
| `@webcontextinterface/distiller` | Build `WciView` from annotated DOM |
| `@webcontextinterface/bridge` | Dispatch actions on nodes |
| `@webcontextinterface/context` | Load `wci.txt` / `wci.json` / `wci.md` |
| `@webcontextinterface/core` | All-in-one SDK |

## Documentation

- [API reference](https://webcontextinterface.vercel.app/api/spec)
- [Specification](https://webcontextinterface.vercel.app/specification)
- [Attribute reference](https://webcontextinterface.vercel.app/getting-started)

## License

MIT
