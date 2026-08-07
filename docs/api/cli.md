---
title: "@webcontextinterface/cli"
---

# @webcontextinterface/cli

Validate, distil, and scaffold Web Context Interface sites from the terminal.

```bash
npx @webcontextinterface/cli init --dir public --name "Acme Shop" --url https://acme.com
npx @webcontextinterface/cli validate dist/**/*.html --strict
npx @webcontextinterface/cli stats page.html
```

## Commands

### `wci init`

Scaffold `wci.txt`, `wci.json`, and `wci.md` — the site-root files that give agents grounding before they touch a page.

```bash
wci init --dir public --name "Acme" --url https://acme.com --contact bots@acme.com --example
```

### `wci validate <file...>`

Lint `data-wci-*` markup, `wci.txt` directives, or `wci.json` manifests. The validator picks the right rules by extension.

```
✖ error   #address-selector  Action "select" cannot apply to <div>. (action-element-mismatch)
    → "select" expects <select>; the bridge will return ACTION_NOT_SUPPORTED at runtime.
```

| Flag | Effect |
|------|--------|
| `--strict` | Warnings become errors (use in CI) |
| `--ignore <rules>` | Skip specific rule ids |
| `--allow-attr <attrs>` | Permit project-specific `data-wci-*` attributes |
| `--min-desc <n>` | Minimum useful description length (default 10) |
| `--format text\|json\|github` | `github` writes inline PR annotations |

Exit codes: `0` clean · `1` validation errors · `2` usage error.

### `wci distil <file|url>`

Produce the agent-facing view of a page.

```bash
wci distil page.html --format markdown --scope checkout
wci distil page.html --max-tokens 800 --out view.json
```

`--max-tokens` drops the lowest-priority nodes until the view fits the budget.

### `wci stats <file|url>`

Measure what distillation buys you.

```
  Raw HTML          34,129 chars  ~9,225 tokens
  Distilled view    65 nodes      ~2,699 tokens
  Compression       70.7% fewer tokens
```

## In CI

```yaml
- uses: amirrezaalasti/webcontextinterface/.github/actions/wci-validate@main
  with:
    files: 'dist/**/*.html public/wci.txt public/wci.json'
    strict: 'true'
```

## Programmatic use

Every command takes its filesystem and network access through a `CommandContext`, so it can run against anything:

```ts
import { run, createNodeContext } from '@webcontextinterface/cli';

const exitCode = await run(['validate', 'page.html', '--strict'], createNodeContext());
```

MIT © WCI
