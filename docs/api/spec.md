# `@webcontextinterface/spec` API

Types and DOM helpers for the WCI 1.0 specification.

## Types

### `WciRole`

`'action' | 'form' | 'display' | 'nav' | 'status' | 'landmark'`

### `WciAction`

`'click' | 'fill' | 'select' | 'check' | 'upload' | 'submit' | 'navigate' | 'focus' | 'clear'`

### `WciNodeSpec`

Maps 1:1 to `data-wci-*` on an element. Fields: `id`, `role`, `desc`, `action?`, `state`, `precondition?`, `required?`, `options?`, `emits?`, `scope?`, `hidden?`, `priority?`.

### `WciView`

Distilled page/scope: `wci_version`, `page_title`, `scope?`, `scope_desc?`, `distilled_at`, `node_count`, `site_context?`, `nodes`.

### `WciPolicy`, `SiteManifest`, `TaskFlow`, `ScopeDescriptor`

Site-level types for `wci.txt` / `wci.json`. See source in `packages/spec/src/index.ts`.

## Functions

### `readWciNodeSpec(el: HTMLElement): WciNodeSpec | null`

Reads all `data-wci-*` attributes from an element. Returns `null` if the element has neither `data-wci-id` nor `data-wci-role`.

**Example:**

```typescript
const spec = readWciNodeSpec(document.querySelector('[data-wci-id="email-input"]')!);
```

## Install

```bash
npm install @webcontextinterface/spec
```

```typescript
import { readWciNodeSpec, type WciNodeSpec, type WciView } from '@webcontextinterface/spec';
```
