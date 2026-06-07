# 🏷️ `@webcontextinterface/spec` API

Types and DOM helpers for the WCI 1.0 specification.

## Types

### `WciRole`

`'action' | 'form' | 'display' | 'nav' | 'status' | 'landmark'`

| Role | Use |
|------|-----|
| `action` | Clickable CTA (button, link with side-effect) |
| `form` | Input, textarea, select, checkbox, radio |
| `display` | Read-only data (price, status, label) |
| `nav` | Navigation link (route change) |
| `status` | Async indicator (loading, error, success) |
| `landmark` | Scope root — bounded task zone |

### `WciAction`

`'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear'`

### `WciNodeSpec`

Maps 1:1 to `data-wci-*` on an element.

| Field | Type | Attribute |
|-------|------|-----------|
| `id` | `string` | `data-wci-id` |
| `role` | `WciRole` | `data-wci-role` |
| `desc` | `string` | `data-wci-desc` |
| `action?` | `WciAction` | `data-wci-action` |
| `state` | `Record<string, unknown>` | `data-wci-state` (JSON) |
| `precondition?` | `string` | `data-wci-precondition` |
| `required?` | `boolean` | `data-wci-required` |
| `options?` | `string[]` | `data-wci-options` (JSON) |
| `emits?` | `string` | `data-wci-emit` |
| `scope?` | `string` | `data-wci-scope` |
| `hidden?` | `boolean` | `data-wci-hidden` |
| `priority?` | `number` | `data-wci-priority` (1–5) |

### `WciView`

Distilled page or scope:

| Field | Type |
|-------|------|
| `wci_version` | `string` |
| `page_title` | `string` |
| `scope?` | `string` |
| `scope_desc?` | `string` |
| `distilled_at` | ISO timestamp |
| `node_count` | `number` |
| `site_context?` | `SiteContextSummary` |
| `nodes` | `WciNodeSpec[]` |

### Site policy types

| Type | Source |
|------|--------|
| `WciPolicy` | Parsed `wci.txt` |
| `SiteManifest` | Parsed `wci.json` |
| `TaskFlow` | Multi-step journey in manifest |
| `ScopeDescriptor` | Scope metadata with sensitivity |
| `SiteContextSummary` | Abbreviated site info for distilled views |

See `packages/spec/src/index.ts` for full field lists.

## Functions

### `readWciNodeSpec(el: HTMLElement): WciNodeSpec | null`

Reads all `data-wci-*` attributes from an element.

Returns `null` if the element has neither `data-wci-id` nor `data-wci-role`.

**Example:**

```typescript
import { readWciNodeSpec } from '@webcontextinterface/spec';

const spec = readWciNodeSpec(
  document.querySelector('[data-wci-id="email-input"]') as HTMLElement
);
```

## Install

```bash
npm install @webcontextinterface/spec
```

```typescript
import {
  readWciNodeSpec,
  type WciNodeSpec,
  type WciView,
  type WciPolicy,
  type SiteManifest,
} from '@webcontextinterface/spec';
```

No runtime dependencies.

## See also

- [Specification](../specification.md)
- [Getting started](../getting-started.md)
