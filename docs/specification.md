# 📋 Specification

WCI version **1.0** extends HTML with `data-wci-*` attributes and three optional site root files.

## `data-wci-*` attributes

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `data-wci-id` | recommended | string | Stable unique ID for dispatch and distillation |
| `data-wci-role` | recommended | enum | `action` · `form` · `display` · `nav` · `status` · `landmark` |
| `data-wci-desc` | recommended | string | LLM-oriented description of purpose and constraints |
| `data-wci-action` | for interactive nodes | enum | `click` · `fill` · `select` · `check` · `upload` · `submit` · `navigate` · `focus` · `clear` |
| `data-wci-state` | recommended | JSON object | Observable state snapshot (updated by Bridge) |
| `data-wci-precondition` | optional | string | Natural-language guard; Bridge checks `disabled` |
| `data-wci-required` | optional | boolean | `"true"` if required before form submit |
| `data-wci-options` | optional | JSON array | Choices for select/radio groups |
| `data-wci-emit` | optional | string | Custom event name fired after successful action |
| `data-wci-scope` | optional | string | Parent landmark `data-wci-id` |
| `data-wci-hidden` | optional | boolean | `"true"` — exclude from distilled output |
| `data-wci-priority` | optional | 1–5 | Sort key (1 = highest, e.g. primary CTA) |

### Roles

| Role | Use for |
|------|---------|
| `landmark` | Bounded task zone (form, checkout, modal) |
| `action` | Buttons, CTAs with side effects |
| `form` | Inputs, textarea, select |
| `display` | Read-only values (price, status text) |
| `nav` | Links that change route/page |
| `status` | Loading, error, success indicators |

### State JSON

Keep state small and serializable. Example for an email field:

```json
{"value": "", "valid": null, "touched": false}
```

The Bridge merges patches into `data-wci-state` after each action.

## Distilled view (`WciView`)

JSON output shape (from `@webcontextinterface/distiller`):

```json
{
  "wci_version": "1.0",
  "page_title": "Register",
  "scope": "registration-form",
  "scope_desc": "New user registration",
  "distilled_at": "2026-05-22T12:00:00.000Z",
  "node_count": 5,
  "site_context": { "name": "...", "purpose": "..." },
  "nodes": [ { "id": "email-input", "role": "form", "desc": "...", "state": {} } ]
}
```

## Site root files

### `wci.txt`

Robots.txt-style directives. Key fields:

| Key | Meaning |
|-----|---------|
| `Site-Name` / `Site-Purpose` | Identity for agents |
| `Allow-Scope` / `Deny-Scope` | Comma-separated scope IDs |
| `Rate-Limit-Actions` / `Rate-Limit-Distil` | Per-minute limits |
| `Auth-Required` | Scopes needing authentication |
| `Require-Human-Confirmation` | Scopes that must not auto-execute |
| `Manifest` / `Context` | URLs to `wci.json` and `wci.md` |

### `wci.json`

Structured manifest: `site`, `capabilities`, `authentication`, `task_flows`, `scopes`, `denied_scopes`, `rate_limits`. Types: `SiteManifest`, `TaskFlow`, `ScopeDescriptor` in `@webcontextinterface/spec`.

### `wci.md`

Free-form Markdown injected into the LLM system prompt (policies, tone, domain glossary).

## Discovery order

`WciContextLoader` resolves which URLs to fetch, then loads content with fallbacks.

**URL resolution (highest → lowest):**

1. `<meta name="wci:directives">`, `wci:manifest`, `wci:context` in the page head
2. HTTP response headers: `X-WCI-Directives`, `X-WCI-Manifest`, `X-WCI-Context`
3. Root defaults: `/wci.txt`, `/wci.json`, `/wci.md`

**Fetch fallbacks:** When meta or headers do not set an explicit URL, well-known paths are also fetched (RFC 8615): `/.well-known/wci/directives.txt`, `manifest.json`, `context.md`. Root or explicit URL content wins over well-known when both return a body.

## Events

| Event | Target | Detail |
|-------|--------|--------|
| `wci:state-change` | `document` | `{ nodeId, action, stateAfter }` |
| Custom (`data-wci-emit`) | target element | `{ nodeId, action, value, stateAfter }` |

## Versioning

- Attribute and JSON view version: **1.0** (`wci_version` field)
- Packages use semver; spec breaking changes bump major
