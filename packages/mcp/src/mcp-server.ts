// ─────────────────────────────────────────────────────────────────────────────
// WCI MCP — SDK adapter
//
// The only file that knows about the MCP SDK. Tool behaviour lives in tools.ts
// so it can be exercised without a transport.
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ALL_TOOLS, type ToolDefinition } from './tools';
import type { WciSession } from './session';

export const SERVER_NAME = 'wci';
export const SERVER_VERSION = '1.3.0';

export const SERVER_INSTRUCTIONS = `
This server exposes WCI-annotated web pages as structured, low-token context.

Typical loop:
  1. wci_open_page       load a URL (also loads the site's policy)
  2. wci_site_context    check what the site permits before anything consequential
  3. wci_distil          see the actionable nodes and their current state
  4. wci_act             dispatch one typed action against a node id
  5. wci_distil_changes  see only what moved, instead of re-reading the page

Node ids come from a distilled view — never invent one. When an action fails,
the error code tells you whether to retry (PRECONDITION_UNMET, RATE_LIMITED)
or to stop and ask the user (SCOPE_DENIED, AUTH_REQUIRED,
HUMAN_CONFIRMATION_REQUIRED).
`.trim();

/**
 * Register a single tool definition on an MCP server.
 *
 * `registerTool` infers its handler signature from the zod shape, and doing
 * that generically across eight heterogeneous tools exceeds TypeScript's
 * instantiation depth limit. The shape is validated by zod at call time
 * regardless, so the generic is widened here rather than at each tool.
 */
export function registerTool(server: McpServer, tool: ToolDefinition, session: WciSession): void {
  const register = server.registerTool.bind(server) as (
    name: string,
    config: unknown,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) => void;

  register(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: tool.readOnly,
        openWorldHint: true,
      },
    },
    async (args: Record<string, unknown>) => {
      const result = await tool.handler(args ?? {}, session);
      return {
        content: [{ type: 'text' as const, text: result.text }],
        isError: result.isError,
      };
    },
  );
}

/** Build a fully configured MCP server bound to a session. */
export function createWciMcpServer(session: WciSession): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );
  for (const tool of ALL_TOOLS) registerTool(server, tool, session);
  return server;
}
