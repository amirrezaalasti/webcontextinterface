---
title: "@webcontextinterface/mcp"
---

# @webcontextinterface/mcp

Expose any WCI-annotated site to MCP-speaking agents — Claude Desktop, Claude Code, Cursor, or anything else that speaks the [Model Context Protocol](https://modelcontextprotocol.io).

```bash
npx @webcontextinterface/mcp
```

## Configure a client

Claude Desktop / Claude Code (`claude_desktop_config.json` or `.mcp.json`):

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

## Tools

| Tool | Read-only | Purpose |
|------|-----------|---------|
| `wci_open_page` | — | Load a URL and its site policy |
| `wci_distil` | ✔ | The agent-facing view: nodes, roles, actions, state |
| `wci_distil_changes` | ✔ | Only what moved since the last look |
| `wci_act` | — | Dispatch one typed action |
| `wci_act_sequence` | — | Dispatch several, stopping at the first failure |
| `wci_site_context` | ✔ | Parsed `wci.txt`, `wci.json`, `wci.md` |
| `wci_validate` | ✔ | Lint the page's annotations |
| `wci_history` | ✔ | Every action taken this session |

Read-only tools carry `readOnlyHint`, so clients can auto-approve them.

## The loop

1. `wci_open_page` — loads the page **and** `/wci.txt` together, so policy governs the very first action
2. `wci_site_context` — check what the site permits before anything consequential
3. `wci_distil` — see actionable nodes and current state
4. `wci_act` — dispatch against a node id from the view
5. `wci_distil_changes` — a payload sized to the change, not to the page

## Policy enforcement

`wci.txt` rules are enforced inside `wci_act`, surfacing as structured errors rather than silent no-ops:

| Code | Meaning |
|------|---------|
| `SCOPE_DENIED` | Stop; tell the user |
| `AUTH_REQUIRED` | Sign-in needed first |
| `HUMAN_CONFIRMATION_REQUIRED` | Get explicit approval |
| `RATE_LIMITED` | Wait, then retry |
| `PRECONDITION_UNMET` | Satisfy the stated condition, then retry |
| `NODE_NOT_FOUND` | Re-distil; the page may have navigated |

## Programmatic use

```ts
import { WciSession, createNodeEnvironment, loadSiteContext, ALL_TOOLS } from '@webcontextinterface/mcp';

const env = createNodeEnvironment();
const session = new WciSession({ ...env, loadSiteContext: url => loadSiteContext(url, env) });

await session.open('https://example.com/checkout');
const view = session.distil({ scope: 'checkout' });
const result = await session.act({ nodeId: 'submit', action: 'click' });
```

## Safety

Fetched pages are parsed with scripts disabled — an agent loading an arbitrary URL never executes that page's JavaScript inside the server process.

MIT © WCI
