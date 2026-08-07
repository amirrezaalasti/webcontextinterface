/**
 * @webcontextinterface/cli — programmatic access to the `wci` commands.
 * @packageDocumentation
 */

export { run, VERSION } from './run';
export { parseArgs, boolFlag, listFlag, numberFlag, stringFlag } from './args';
export type { ParsedArgs } from './args';
export {
  runValidate, runDistil, runStats, runInit, HELP,
} from './commands';
export type { CommandContext, ExitCode } from './commands';
export { createNodeContext } from './node-context';
export {
  wciTxtTemplate, wciJsonTemplate, wciMdTemplate, annotatedHtmlExample,
} from './scaffold';
export type { ScaffoldInput } from './scaffold';
