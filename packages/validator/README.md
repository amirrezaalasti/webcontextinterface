# @webcontextinterface/validator

Lint `data-wci-*` markup, `wci.txt` directives, and `wci.json` manifests.

The reader in `@webcontextinterface/spec` is deliberately forgiving — it coerces bad input so a page never breaks at runtime. That is the wrong behaviour at authoring time. This package reports what the reader would have silently repaired.

```ts
import { validateMarkup, formatReport } from '@webcontextinterface/validator';

const report = validateMarkup(document.body, { strict: true });
console.log(formatReport(report, { color: true }));
```

## Rules

**Markup** — `duplicate-id`, `missing-id`, `invalid-role`, `invalid-action`, `action-element-mismatch`, `unknown-scope`, `landmark-without-id`, `malformed-state`, `malformed-options`, `invalid-priority`, `missing-desc`, `weak-desc`, `unknown-attribute`, and more.

**`wci.txt`** — `txt-unknown-directive`, `txt-malformed-line`, `txt-invalid-number`, `txt-conflicting-scope`, `txt-missing-recommended`.

**`wci.json`** — `json-parse-error`, `json-missing-field`, `json-invalid-type`, `json-invalid-sensitivity`, `json-unknown-scope-reference`.

Each issue carries a `rule` id, a `level`, a message, and a `hint` describing the fix.

## Options

```ts
validateMarkup(root, {
  strict: true,                              // warnings become errors
  ignore: ['weak-desc'],                     // skip rules
  minDescLength: 20,                         // stricter description bar
  allowAttributes: ['data-wci-competitor'],  // your own extensions
});
```

## Output formats

```ts
formatReport(report, { color: true })   // console
formatReportJSON(report)                // CI pipelines, editor integrations
formatReportGitHub(report, 'page.html') // inline PR annotations
```

MIT © WCI
