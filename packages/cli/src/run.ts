// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — command dispatch
// ─────────────────────────────────────────────────────────────────────────────

import { parseArgs } from './args';
import {
  HELP,
  runAnnotate,
  runDistil,
  runInit,
  runStats,
  runValidate,
  type CommandContext,
  type ExitCode,
} from './commands';

export const VERSION = '1.3.0';

/** Route argv to a command. Returns the process exit code. */
export async function run(argv: readonly string[], ctx: CommandContext): Promise<ExitCode> {
  const args = parseArgs(argv);

  if (args.flags.version || args.flags.v) {
    ctx.log(VERSION);
    return 0;
  }

  if (!args.command || args.flags.help || args.flags.h) {
    ctx.log(HELP);
    // No command at all is a usage error; `--help` was what the user asked for.
    return args.command ? 0 : 2;
  }

  switch (args.command) {
    case 'validate':
    case 'lint':
      return runValidate(ctx, args);
    case 'annotate':
      return runAnnotate(ctx, args);
    case 'distil':
    case 'distill':
      return runDistil(ctx, args);
    case 'stats':
      return runStats(ctx, args);
    case 'init':
      return runInit(ctx, args);
    case 'help':
      ctx.log(HELP);
      return 0;
    case 'version':
      ctx.log(VERSION);
      return 0;
    default:
      ctx.error(`Unknown command "${args.command}".\n`);
      ctx.error(HELP);
      return 2;
  }
}
