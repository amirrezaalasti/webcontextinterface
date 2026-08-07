/**
 * @webcontextinterface/mcp — expose WCI-annotated sites over the Model Context Protocol.
 * @packageDocumentation
 */

export { WciSession } from './session';
export type {
  PageHandle,
  SessionEnvironment,
  SiteContextState,
} from './session';

export {
  ALL_TOOLS,
  openPageTool,
  distilTool,
  distilChangesTool,
  actTool,
  actSequenceTool,
  siteContextTool,
  validateTool,
  historyTool,
} from './tools';
export type { ToolDefinition, ToolOutput } from './tools';

export {
  createWciMcpServer,
  registerTool,
  SERVER_NAME,
  SERVER_VERSION,
  SERVER_INSTRUCTIONS,
} from './mcp-server';

export { createNodeEnvironment, loadSiteContext, parseWciTxt } from './node-env';
export type { NodeEnvOptions } from './node-env';
