# @webcontextinterface/annotator

Derive `data-wci-*` annotations from HTML that nobody annotated.

```bash
npx @webcontextinterface/cli annotate legacy-page.html --out annotated.html
```

```ts
import { inferView, applyInferredAnnotations } from '@webcontextinterface/annotator';

const view = inferView(document);              // agent-facing view, DOM untouched
const result = applyInferredAnnotations(document); // or write attributes in place
```

## Why

WCI is inert on a page nobody annotated, which is currently most of the web — the
adoption problem in one sentence. This closes the gap from the agent's side by
reconstructing the annotation layer from signals the page already carries:
accessible names, ARIA roles, `label[for]` associations, form structure, and native
element semantics.

Adoption becomes an **optimisation rather than a precondition**. An agent works on
an unannotated site immediately; operators annotate to improve results they can
already observe.

## What it derives

| Field | From |
|-------|------|
| `role` | Native tag, ARIA role, landmark elements, `aria-live` |
| `desc` | `aria-label` → `aria-labelledby` → `label[for]` → wrapping label → text → `placeholder` |
| `action` | Element type — `fill`, `select`, `check`, `upload`, `click`, `navigate` |
| `state` | `value`, `checked`, `disabled`, `aria-expanded`, `aria-selected` |
| `options` | `<option>` values, or a radio group's shared `name` |
| `scope` | Nearest enclosing derived landmark |
| `priority` | Submit buttons and required fields rank first; nav and secondary actions last |

Password values are never captured. `aria-hidden`, `[hidden]`, and inline
`display:none` are honoured through the whole subtree, so controls no user can reach
are not offered to an agent.

## Confidence

Every node carries a 0–1 confidence and the evidence behind it:

```ts
const { nodes, meanConfidence } = inferAnnotations(document);
// { id: 'email', desc: 'Billing email', confidence: 1, evidence: ['label[for]'], … }
```

An `aria-label` on a native button scores high; a `<div onclick>` with no accessible
name scores low. Filter with `minConfidence` when precision matters more than
coverage.

## What it cannot do

Inference reaches "Place Order". An operator writes "Submit order — charges the saved
card and cannot be undone". On the 50-scenario WCI benchmark, derived descriptions
average 13.5 characters against 26.9 for curated ones.

It also cannot derive `wci.txt` policy. An operator's stated limits — denied scopes,
auth requirements, actions needing human confirmation — are not inferable from markup
by design, which is exactly why the AX layer must be authored.

Treat output as a **starting point a developer edits**, not a finished annotation.

MIT © WCI
