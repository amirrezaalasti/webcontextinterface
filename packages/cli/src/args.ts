// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — argument parsing
//
// Hand-rolled rather than pulled from a package: a CLI people reach for via
// `npx` should not drag a dependency tree behind it, and the surface here is
// small enough that the parser is shorter than the config a library would need.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
        continue;
      }
      const next = argv[i + 1];
      // `--flag value` only consumes the next token when it is not itself a flag.
      if (next !== undefined && !next.startsWith('-')) {
        flags[body] = next;
        i += 1;
      } else {
        flags[body] = true;
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length > 1) {
      for (const ch of arg.slice(1)) flags[ch] = true;
      continue;
    }

    positionals.push(arg);
  }

  return { command: positionals[0], positionals: positionals.slice(1), flags };
}

/** Read a flag as a string, honouring an alias and a default. */
export function stringFlag(
  flags: ParsedArgs['flags'],
  name: string,
  fallback: string,
  alias?: string,
): string {
  const value = flags[name] ?? (alias ? flags[alias] : undefined);
  return typeof value === 'string' ? value : fallback;
}

/** Read a flag as a boolean, honouring an alias. */
export function boolFlag(flags: ParsedArgs['flags'], name: string, alias?: string): boolean {
  const value = flags[name] ?? (alias ? flags[alias] : undefined);
  return value === true || value === 'true';
}

/** Read a flag as a number, honouring an alias and a default. */
export function numberFlag(
  flags: ParsedArgs['flags'],
  name: string,
  fallback: number,
  alias?: string,
): number {
  const raw = flags[name] ?? (alias ? flags[alias] : undefined);
  if (typeof raw !== 'string') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Read a repeatable comma-separated flag into a list. */
export function listFlag(flags: ParsedArgs['flags'], name: string): string[] {
  const raw = flags[name];
  if (typeof raw !== 'string') return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
