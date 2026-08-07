// ─────────────────────────────────────────────────────────────────────────────
// WCI MCP — stdio server entry point
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWciMcpServer } from './mcp-server';
import { createNodeEnvironment, loadSiteContext } from './node-env';
import { WciSession } from './session';

const env = createNodeEnvironment();
const session = new WciSession({
  ...env,
  loadSiteContext: (pageUrl) => loadSiteContext(pageUrl, env),
});

const server: McpServer = createWciMcpServer(session);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  // stdout carries the protocol; anything human-facing must go to stderr.
  process.stderr.write('wci-mcp ready — 8 tools registered\n');
}

const shutdown = (): void => {
  session.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err: unknown) => {
  process.stderr.write(`wci-mcp failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
