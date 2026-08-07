---
title: Validation
description: Catch annotation mistakes before an agent does.
---

# Validation

`readWciNodeSpec()` is deliberately forgiving. An unknown role becomes `display`, malformed state JSON becomes `{}`, an out-of-range priority is clamped. That is right at runtime — a page should never break because of an annotation typo — but it means mistakes are invisible until an agent behaves oddly.

The validator reports exactly what the reader would have silently repaired.

```ts
import { validateMarkup, formatReport } from '@webcontextinterface/validator';

const report = validateMarkup(document.body, { strict: true });
console.log(formatReport(report, { color: true }));
```

Or from the terminal:

```bash
npx @webcontextinterface/cli validate dist/**/*.html --strict
```

## What it catches

### Errors — the page will misbehave

| Rule | Problem |
|------|---------|
| `duplicate-id` | Two nodes share an id, so dispatch is non-deterministic |
| `missing-id` | A role with no id can never be targeted |
| `invalid-role` / `invalid-action` | Value outside the spec enum |
| `action-element-mismatch` | `select` on a `<div>`, `upload` on a text input — the bridge will return `ACTION_NOT_SUPPORTED` |
| `landmark-without-id` | A landmark's id *is* the scope identifier |
| `malformed-state` | Not valid JSON, or not an object |
| `invalid-priority` | Not a number |

### Warnings — the agent will be worse off

| Rule | Problem |
|------|---------|
| `unknown-scope` | `data-wci-scope` names no landmark — the node vanishes from scoped distillation |
| `missing-desc` | The distiller falls back to raw text content |
| `weak-desc` | Too short to disambiguate from neighbouring nodes |
| `action-without-role` | The distiller cannot categorise the node |
| `unknown-attribute` | A typo'd `data-wci-*` name, silently ignored |

### Info — probably not what you meant

`required-without-form-role`, `options-without-choice-element`, `precondition-without-action`.

Every issue carries a `rule` id, a `level`, a message, and a `hint` describing the fix.

## Site files

The same package validates the site-root files:

```ts
import { validateWciTxt, validateManifest } from '@webcontextinterface/validator';

validateWciTxt(await readFile('public/wci.txt', 'utf8'));
validateManifest(await readFile('public/wci.json', 'utf8'));
```

`wci.txt` checks catch unknown directives, malformed lines, non-numeric rate limits (which would otherwise parse to `NaN` and disable the limit entirely), and scopes that are both allowed and denied.

`wci.json` checks catch missing required fields, a relative `base_url`, an unknown sensitivity level, and task flows referencing scopes that were never declared.

## Options

```ts
validateMarkup(root, {
  strict: true,                              // warnings become errors
  ignore: ['weak-desc'],                     // skip rules you disagree with
  minDescLength: 20,                         // raise the description bar
  allowAttributes: ['data-wci-competitor'],  // your own extensions
});
```

## Output formats

| Function | Use |
|----------|-----|
| `formatReport(report, { color })` | Console output for humans |
| `formatReportJSON(report)` | CI pipelines and editor integrations |
| `formatReportGitHub(report, file)` | Inline annotations on a pull request diff |

`mergeReports(...)` combines markup, `wci.txt`, and `wci.json` results into one verdict.
