---
title: CLI
description: Validate, distil, and scaffold WCI sites from the terminal.
---

# CLI

```bash
npx @webcontextinterface/cli <command>
```

Four commands cover the authoring loop: scaffold the site files, annotate, check the annotations, and measure what you gained.

## `wci init`

Scaffold the three site-root files that give agents grounding before they touch a page.

```bash
wci init --dir public --name "Acme Shop" --url https://acme.com --contact bots@acme.com
```

| File | Purpose |
|------|---------|
| `wci.txt` | Directives — allow/deny scopes, rate limits, auth |
| `wci.json` | Structured manifest — task flows, scope descriptors |
| `wci.md` | Narrative context injected into the agent's system prompt |

Add `--example` for an annotated HTML sample. Existing files are never clobbered without `--force`.

## `wci validate`

Lint markup, directives, or manifests — the right rules are picked by extension.

```bash
wci validate dist/**/*.html --strict
wci validate public/wci.txt public/wci.json
```

```
✖ error   #address-selector  Action "select" cannot apply to <div>. (action-element-mismatch)
    → "select" expects <select>; the bridge will return ACTION_NOT_SUPPORTED at runtime.
⚠ warning #promo-field  data-wci-scope="promo" does not match any landmark id. (unknown-scope)
    → Scoped distillation and wci.txt policy both key off landmark ids.
```

| Flag | Effect |
|------|--------|
| `--strict` | Warnings become errors — use in CI |
| `--ignore <rules>` | Skip specific rule ids |
| `--allow-attr <attrs>` | Permit project-specific `data-wci-*` attributes |
| `--min-desc <n>` | Minimum useful description length (default 10) |
| `--format text\|json\|github` | `github` writes inline PR annotations |

Exit codes: `0` clean · `1` validation errors · `2` usage error.

## `wci distil`

Produce the agent-facing view of a page, from a file or a URL.

```bash
wci distil page.html --format markdown --scope checkout
wci distil https://example.com --max-tokens 800 --out view.json
```

`--max-tokens` drops the lowest-priority nodes until the serialized view fits — the distiller already sorted by priority, so what goes is what mattered least.

## `wci stats`

Measure what distillation buys you.

```
WCI stats for demo/scenarios/checkout/annotated.html

  Raw HTML          34,129 chars  ~9,225 tokens
  Distilled view    65 nodes      ~2,699 tokens
  Compression       70.7% fewer tokens

  Nodes by role
    form       21
    display    13
    action     11
    nav        10
    landmark   10
```

## In CI

A reusable action ships with the repo:

```yaml
- uses: amirrezaalasti/webcontextinterface/.github/actions/wci-validate@main
  with:
    files: 'dist/**/*.html public/wci.txt public/wci.json'
    strict: 'true'
```

It writes inline annotations on the pull request diff and a summary table on the run, and fails the job on any error.

## Programmatic use

Every command takes its filesystem and network access through a `CommandContext`, so the CLI can run against a virtual filesystem, a build pipeline, or a test harness:

```ts
import { run, createNodeContext } from '@webcontextinterface/cli';

const exitCode = await run(['validate', 'page.html', '--strict'], createNodeContext());
```
