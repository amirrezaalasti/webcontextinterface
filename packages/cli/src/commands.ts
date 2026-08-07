// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — command implementations
//
// Every command takes its filesystem, network, and console access through the
// `CommandContext` below. That keeps the logic testable without touching a
// real disk, and keeps the process-level wiring confined to cli.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { WciDistiller, estimateTokens } from '@webcontextinterface/distiller';
import {
  formatReport,
  formatReportGitHub,
  formatReportJSON,
  mergeReports,
  validateManifest,
  validateMarkup,
  validateWciTxt,
  type RuleId,
  type ValidationReport,
} from '@webcontextinterface/validator';
import { boolFlag, listFlag, numberFlag, stringFlag, type ParsedArgs } from './args';
import {
  annotatedHtmlExample,
  wciJsonTemplate,
  wciMdTemplate,
  wciTxtTemplate,
  type ScaffoldInput,
} from './scaffold';

export interface CommandContext {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  /** Parse an HTML string into a DOM whose `document` the validator can walk. */
  parseHtml: (html: string) => { document: Document; close: () => void };
  fetchText?: (url: string) => Promise<string>;
  log: (line: string) => void;
  error: (line: string) => void;
  cwd: string;
}

/** Exit code: 0 success, 1 validation failure, 2 usage error. */
export type ExitCode = 0 | 1 | 2;

const isUrl = (target: string): boolean => /^https?:\/\//i.test(target);

async function loadSource(ctx: CommandContext, target: string): Promise<string> {
  if (isUrl(target)) {
    if (!ctx.fetchText) throw new Error('Fetching URLs is unavailable in this environment.');
    return ctx.fetchText(target);
  }
  return ctx.readFile(target);
}

// ─────────────────────────────────────────────────────────────────────────────
// validate
// ─────────────────────────────────────────────────────────────────────────────

/** Pick a validator by file extension; HTML is the default. */
function classify(target: string): 'txt' | 'json' | 'html' {
  const lower = target.toLowerCase();
  if (lower.endsWith('.txt')) return 'txt';
  if (lower.endsWith('.json')) return 'json';
  return 'html';
}

export async function runValidate(ctx: CommandContext, args: ParsedArgs): Promise<ExitCode> {
  const targets = args.positionals;
  if (targets.length === 0) {
    ctx.error('wci validate: no files given.\n\nUsage: wci validate <file...> [--strict] [--format text|json|github]');
    return 2;
  }

  const options = {
    strict: boolFlag(args.flags, 'strict'),
    ignore: listFlag(args.flags, 'ignore') as RuleId[],
    minDescLength: numberFlag(args.flags, 'min-desc', 10),
    allowAttributes: listFlag(args.flags, 'allow-attr'),
  };
  const format = stringFlag(args.flags, 'format', 'text', 'f');
  const color = !boolFlag(args.flags, 'no-color');

  const reports: ValidationReport[] = [];

  for (const target of targets) {
    let source: string;
    try {
      source = await loadSource(ctx, target);
    } catch (err) {
      ctx.error(`Cannot read ${target}: ${err instanceof Error ? err.message : String(err)}`);
      return 2;
    }

    let report: ValidationReport;
    const kind = classify(target);

    if (kind === 'txt') {
      report = validateWciTxt(source, options);
    } else if (kind === 'json') {
      report = validateManifest(source, options);
    } else {
      const dom = ctx.parseHtml(source);
      try {
        report = validateMarkup(dom.document.body ?? dom.document, options);
      } finally {
        dom.close();
      }
    }

    reports.push(report);

    if (format === 'text') {
      ctx.log(`\n${target}`);
      ctx.log(formatReport(report, { color }));
    } else if (format === 'github') {
      const out = formatReportGitHub(report, target);
      if (out) ctx.log(out);
    }
  }

  const merged = mergeReports(...reports);
  if (format === 'json') ctx.log(formatReportJSON(merged));

  if (format === 'text' && targets.length > 1) {
    ctx.log(
      `\nTotal: ${merged.counts.error} error(s), ${merged.counts.warning} warning(s) ` +
      `across ${targets.length} file(s).`,
    );
  }

  return merged.valid ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// distil
// ─────────────────────────────────────────────────────────────────────────────

export async function runDistil(ctx: CommandContext, args: ParsedArgs): Promise<ExitCode> {
  const target = args.positionals[0];
  if (!target) {
    ctx.error('wci distil: no file or URL given.\n\nUsage: wci distil <file|url> [--format json|markdown] [--scope <id>] [--max-tokens <n>]');
    return 2;
  }

  let source: string;
  try {
    source = await loadSource(ctx, target);
  } catch (err) {
    ctx.error(`Cannot read ${target}: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  const format = stringFlag(args.flags, 'format', 'json', 'f') === 'markdown' ? 'markdown' : 'json';
  const maxTokensFlag = numberFlag(args.flags, 'max-tokens', 0);

  const dom = ctx.parseHtml(source);
  try {
    const distiller = new WciDistiller({
      format,
      scope: stringFlag(args.flags, 'scope', '') || undefined,
      maxNodes: numberFlag(args.flags, 'max-nodes', 128),
      includeState: !boolFlag(args.flags, 'no-state'),
      includeHidden: boolFlag(args.flags, 'include-hidden'),
      maxTokens: maxTokensFlag > 0 ? maxTokensFlag : undefined,
      onWarn: () => { /* markup warnings belong to `wci validate` */ },
    });

    const output = format === 'markdown'
      ? distiller.distilMarkdown(dom.document)
      : distiller.distilJSON(dom.document);

    const outPath = stringFlag(args.flags, 'out', '', 'o');
    if (outPath) {
      await ctx.writeFile(outPath, output);
      const stats = distiller.getStats();
      ctx.error(`Wrote ${outPath} — ${stats.nodeCount} node(s), ~${stats.estimatedTokens} tokens.`);
    } else {
      ctx.log(output);
    }
    return 0;
  } finally {
    dom.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// stats
// ─────────────────────────────────────────────────────────────────────────────

export async function runStats(ctx: CommandContext, args: ParsedArgs): Promise<ExitCode> {
  const target = args.positionals[0];
  if (!target) {
    ctx.error('wci stats: no file or URL given.\n\nUsage: wci stats <file|url> [--scope <id>]');
    return 2;
  }

  let source: string;
  try {
    source = await loadSource(ctx, target);
  } catch (err) {
    ctx.error(`Cannot read ${target}: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  const dom = ctx.parseHtml(source);
  try {
    const scope = stringFlag(args.flags, 'scope', '') || undefined;
    const distiller = new WciDistiller({ scope, onWarn: () => {} });
    const view = distiller.toView(dom.document);
    const stats = distiller.getStats();

    const rawTokens = estimateTokens(source);
    const ratio = rawTokens > 0 ? stats.estimatedTokens / rawTokens : 0;

    const byRole = new Map<string, number>();
    for (const node of view.nodes) byRole.set(node.role, (byRole.get(node.role) ?? 0) + 1);

    ctx.log(`WCI stats for ${target}`);
    ctx.log('');
    ctx.log(`  Raw HTML          ${source.length.toLocaleString()} chars  ~${rawTokens.toLocaleString()} tokens`);
    ctx.log(`  Distilled view    ${stats.nodeCount} nodes             ~${stats.estimatedTokens.toLocaleString()} tokens`);
    ctx.log(`  Compression       ${(100 - ratio * 100).toFixed(1)}% fewer tokens`);
    ctx.log('');
    ctx.log('  Nodes by role');
    for (const [role, count] of [...byRole].sort((a, b) => b[1] - a[1])) {
      ctx.log(`    ${role.padEnd(10)} ${count}`);
    }

    if (view.nodes.length === 0) {
      ctx.log('');
      ctx.log('  No annotated nodes found — run `wci validate` for guidance.');
    }
    return 0;
  } finally {
    dom.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// init
// ─────────────────────────────────────────────────────────────────────────────

export async function runInit(ctx: CommandContext, args: ParsedArgs): Promise<ExitCode> {
  const input: ScaffoldInput = {
    siteName: stringFlag(args.flags, 'name', 'My Site'),
    baseUrl: stringFlag(args.flags, 'url', 'https://example.com'),
    purpose: stringFlag(args.flags, 'purpose', 'Describe what this site is for, in one sentence.'),
    contact: stringFlag(args.flags, 'contact', 'agents@example.com'),
  };

  const dir = stringFlag(args.flags, 'dir', 'public', 'd');
  const force = boolFlag(args.flags, 'force');

  const files: Array<[string, string]> = [
    [`${dir}/wci.txt`, wciTxtTemplate(input)],
    [`${dir}/wci.json`, wciJsonTemplate(input)],
    [`${dir}/wci.md`, wciMdTemplate(input)],
  ];

  if (boolFlag(args.flags, 'example')) {
    files.push([`${dir}/wci-example.html`, annotatedHtmlExample()]);
  }

  let written = 0;
  let skipped = 0;

  for (const [path, content] of files) {
    if (!force && await ctx.fileExists(path)) {
      ctx.error(`skip   ${path} (already exists — pass --force to overwrite)`);
      skipped += 1;
      continue;
    }
    await ctx.writeFile(path, content);
    ctx.log(`create ${path}`);
    written += 1;
  }

  ctx.log('');
  ctx.log(`${written} file(s) written${skipped ? `, ${skipped} skipped` : ''}.`);
  if (written > 0) {
    ctx.log('');
    ctx.log('Next steps:');
    ctx.log(`  1. Edit ${dir}/wci.txt and ${dir}/wci.md to describe your site.`);
    ctx.log('  2. Annotate your markup with data-wci-id / data-wci-role / data-wci-desc.');
    ctx.log('  3. Run `wci validate <your.html>` to check the annotations.');
  }

  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// help / version
// ─────────────────────────────────────────────────────────────────────────────

export const HELP = `wci — Web Context Interface command line

Usage
  wci <command> [options]

Commands
  validate <file...>     Lint HTML markup, wci.txt directives, or wci.json manifests
  distil <file|url>      Produce the agent-facing view of a page
  stats <file|url>       Report node counts and token compression
  init                   Scaffold wci.txt, wci.json, and wci.md

Validate options
  --strict               Treat warnings as errors (recommended in CI)
  --ignore <rules>       Comma-separated rule ids to skip
  --min-desc <n>         Minimum useful description length (default 10)
  --allow-attr <attrs>   Comma-separated project-specific data-wci-* attributes
  --format <fmt>         text | json | github            (default text)
  --no-color             Disable ANSI colour

Distil options
  --format <fmt>         json | markdown                 (default json)
  --scope <id>           Restrict to one landmark scope
  --max-nodes <n>        Node ceiling                    (default 128)
  --max-tokens <n>       Drop low-priority nodes to fit a token budget
  --no-state             Omit state snapshots
  --include-hidden       Include data-wci-hidden nodes
  --out, -o <file>       Write to a file instead of stdout

Init options
  --dir, -d <dir>        Output directory                (default public)
  --name <name>          Site name
  --url <url>            Site base URL
  --purpose <text>       One-line site purpose
  --contact <email>      Contact address
  --example              Also write an annotated HTML example
  --force                Overwrite existing files

Examples
  wci init --dir public --name "Acme Shop" --url https://acme.com
  wci validate dist/**/*.html --strict
  wci validate public/wci.txt public/wci.json
  wci distil page.html --format markdown --scope checkout
  wci stats page.html
`;
