---
title: MCP server
description: Use WCI from Claude, Cursor, or any Model Context Protocol client.
---

# MCP server

The fastest way to use WCI is not to write code at all. `@webcontextinterface/mcp` exposes WCI-annotated pages as [Model Context Protocol](https://modelcontextprotocol.io) tools, so any MCP client can read and act on a site.

## Setup

Add the server to your client's config — Claude Desktop, Claude Code, Cursor, and anything else that speaks MCP:

```json
{
  "mcpServers": {
    "wci": {
      "command": "npx",
      "args": ["-y", "@webcontextinterface/mcp"]
    }
  }
}
```

That is the whole installation. There is nothing to build and no key to configure.

## The eight tools

| Tool | Read-only | Purpose |
|------|-----------|---------|
| `wci_open_page` | — | Load a URL and its site policy together |
| `wci_distil` | ✔ | The agent-facing view: nodes, roles, actions, state |
| `wci_distil_changes` | ✔ | Only what moved since the last look |
| `wci_act` | — | Dispatch one typed action |
| `wci_act_sequence` | — | Dispatch several, stopping at the first failure |
| `wci_site_context` | ✔ | Parsed `wci.txt`, `wci.json`, and `wci.md` |
| `wci_validate` | ✔ | Lint the open page's annotations |
| `wci_history` | ✔ | Every action taken this session |

Read-only tools carry MCP's `readOnlyHint` annotation, so clients can auto-approve them without a prompt while still confirming anything that changes state.

## The loop

```
wci_open_page  →  wci_site_context  →  wci_distil  →  wci_act  →  wci_distil_changes
                                            ↑                            │
                                            └────────────────────────────┘
```

The page and its `wci.txt` are fetched **together**, not lazily. Loading policy after the page would leave a window in which an agent could act on a denied scope before the rules arrived.

## Why `wci_distil_changes` matters

An agent loop re-reads the page after every action. Sending the whole view each turn costs tokens proportional to page size even when one field changed:

| | Tokens |
|---|---|
| Full view of a 65-node checkout page | ~2,700 |
| Diff after filling one field | ~90 |

`wci_distil_changes` returns added, removed, and updated nodes only. Where a page re-renders wholesale and the diff would be larger than the view, the session falls back to the full view — measured, not assumed.

## Errors are instructions

Policy violations surface as structured errors with an `ActionErrorCode`, so an agent can branch on them instead of guessing:

| Code | What the agent should do |
|------|--------------------------|
| `SCOPE_DENIED` | Stop. Tell the user; do not retry. |
| `AUTH_REQUIRED` | Complete the sign-in flow first. |
| `HUMAN_CONFIRMATION_REQUIRED` | Get explicit approval, then dispatch. |
| `RATE_LIMITED` | Wait, then retry. |
| `PRECONDITION_UNMET` | Satisfy the stated condition, then retry. |
| `NODE_NOT_FOUND` | Re-distil; the page may have navigated. |
| `ACTION_NOT_SUPPORTED` | Wrong verb for this element — read the hint. |
| `VALIDATION_FAILED` | The value was rejected; valid options are in the message. |

## Safety

Fetched pages are parsed with **scripts disabled**. An agent pointed at an arbitrary URL never executes that page's JavaScript inside the server process.

## Programmatic use

The session is usable without the MCP transport:

```ts
import {
  WciSession,
  createNodeEnvironment,
  loadSiteContext,
} from '@webcontextinterface/mcp';

const env = createNodeEnvironment();
const session = new WciSession({
  ...env,
  loadSiteContext: (url) => loadSiteContext(url, env),
});

await session.open('https://example.com/checkout');

const view = session.distil({ scope: 'checkout' });
const result = await session.act({ nodeId: 'submit-order', action: 'click' });

if (!result.success) {
  console.error(result.error?.code, result.error?.hint);
}

session.close();
```

Tool behaviour lives in plain handlers independent of the SDK, so you can mount them on your own server or call them directly:

```ts
import { ALL_TOOLS } from '@webcontextinterface/mcp';

const distil = ALL_TOOLS.find((t) => t.name === 'wci_distil')!;
const output = await distil.handler({ format: 'markdown' }, session);
```
