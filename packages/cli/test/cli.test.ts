import { describe, it, expect } from 'vitest';
import {
  boolFlag,
  createNodeContext,
  listFlag,
  numberFlag,
  parseArgs,
  run,
  stringFlag,
  VERSION,
  wciJsonTemplate,
  wciTxtTemplate,
  type CommandContext,
} from '@webcontextinterface/cli';
import { validateManifest, validateWciTxt } from '@webcontextinterface/validator';

const GOOD_HTML = `<!doctype html><html><head><title>Shop</title></head><body>
  <section data-wci-role="landmark" data-wci-id="cart" data-wci-desc="Shopping cart contents">
    <button data-wci-id="checkout" data-wci-role="action" data-wci-desc="Proceed to checkout page"
            data-wci-action="click" data-wci-scope="cart" data-wci-priority="1">Checkout</button>
    <span data-wci-id="total" data-wci-role="display" data-wci-desc="Order total in USD"
          data-wci-scope="cart" data-wci-state='{"amount":42}'>42</span>
  </section>
</body></html>`;

const BAD_HTML = `<!doctype html><html><body>
  <button data-wci-id="dup" data-wci-role="action" data-wci-desc="First action button"></button>
  <button data-wci-id="dup" data-wci-role="bogus"></button>
</body></html>`;

/** In-memory CommandContext — the CLI never touches a real disk in tests. */
function harness(files: Record<string, string> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const written = new Map<string, string>(Object.entries(files));

  const ctx: CommandContext = {
    cwd: '/proj',
    readFile: async (path) => {
      const hit = written.get(path);
      if (hit === undefined) throw new Error('ENOENT: no such file');
      return hit;
    },
    writeFile: async (path, content) => { written.set(path, content); },
    fileExists: async (path) => written.has(path),
    parseHtml: (html) => {
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = html
        .replace(/<!doctype html>/i, '')
        .replace(/<\/?html[^>]*>/gi, '');
      return { document: doc, close: () => {} };
    },
    fetchText: async (url) => {
      const hit = written.get(url);
      if (hit === undefined) throw new Error(`404 for ${url}`);
      return hit;
    },
    log: (l) => out.push(l),
    error: (l) => err.push(l),
  };

  return {
    ctx,
    written,
    stdout: () => out.join('\n'),
    stderr: () => err.join('\n'),
    run: (line: string) => run(line.split(' ').filter(Boolean), ctx),
  };
}

describe('parseArgs', () => {
  it('separates command, positionals, and flags', () => {
    const a = parseArgs(['validate', 'a.html', 'b.html', '--strict']);
    expect(a.command).toBe('validate');
    expect(a.positionals).toEqual(['a.html', 'b.html']);
    expect(a.flags.strict).toBe(true);
  });

  it('supports --key=value', () => {
    expect(parseArgs(['x', '--format=json']).flags.format).toBe('json');
  });

  it('supports --key value', () => {
    expect(parseArgs(['x', '--format', 'json']).flags.format).toBe('json');
  });

  it('treats a flag followed by another flag as boolean', () => {
    const a = parseArgs(['x', '--strict', '--format', 'json']);
    expect(a.flags.strict).toBe(true);
    expect(a.flags.format).toBe('json');
  });

  it('expands clustered short flags', () => {
    const a = parseArgs(['x', '-ab']);
    expect(a.flags.a).toBe(true);
    expect(a.flags.b).toBe(true);
  });

  it('treats everything after -- as positional', () => {
    expect(parseArgs(['x', '--', '--not-a-flag']).positionals).toEqual(['--not-a-flag']);
  });

  it('handles an empty argv', () => {
    expect(parseArgs([]).command).toBeUndefined();
  });

  it('reads typed flags with fallbacks and aliases', () => {
    const { flags } = parseArgs(['x', '--format', 'json', '-o', 'out.txt', '--n', '5', '--list', 'a,b']);
    expect(stringFlag(flags, 'format', 'text')).toBe('json');
    expect(stringFlag(flags, 'missing', 'default')).toBe('default');
    expect(boolFlag(flags, 'o')).toBe(true);
    expect(numberFlag(flags, 'n', 1)).toBe(5);
    expect(numberFlag(flags, 'missing', 7)).toBe(7);
    expect(listFlag(flags, 'list')).toEqual(['a', 'b']);
    expect(listFlag(flags, 'missing')).toEqual([]);
  });

  it('ignores a non-numeric value for a number flag', () => {
    expect(numberFlag(parseArgs(['x', '--n', 'abc']).flags, 'n', 3)).toBe(3);
  });
});

describe('run — dispatch', () => {
  it('prints help and exits 2 with no command', async () => {
    const h = harness();
    expect(await h.run('')).toBe(2);
    expect(h.stdout()).toContain('Usage');
  });

  it('prints help and exits 0 for the help command', async () => {
    const h = harness();
    expect(await h.run('help')).toBe(0);
    expect(h.stdout()).toContain('Commands');
  });

  it('prints the version', async () => {
    const h = harness();
    expect(await h.run('version')).toBe(0);
    expect(h.stdout().trim()).toBe(VERSION);
  });

  it('supports --version', async () => {
    const h = harness();
    await h.run('--version');
    expect(h.stdout().trim()).toBe(VERSION);
  });

  it('rejects an unknown command with exit 2', async () => {
    const h = harness();
    expect(await h.run('frobnicate')).toBe(2);
    expect(h.stderr()).toContain('Unknown command');
  });

  it('accepts "distill" as an alias for "distil"', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    expect(await h.run('distill p.html')).toBe(0);
  });

  it('accepts "lint" as an alias for "validate"', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    expect(await h.run('lint p.html')).toBe(0);
  });
});

describe('run — validate', () => {
  it('exits 0 for clean markup', async () => {
    const h = harness({ 'good.html': GOOD_HTML });
    expect(await h.run('validate good.html')).toBe(0);
    expect(h.stdout()).toContain('No issues found');
  });

  it('exits 1 and names the problems for bad markup', async () => {
    const h = harness({ 'bad.html': BAD_HTML });
    expect(await h.run('validate bad.html')).toBe(1);
    expect(h.stdout()).toContain('duplicate-id');
    expect(h.stdout()).toContain('invalid-role');
  });

  it('exits 2 when no file is given', async () => {
    const h = harness();
    expect(await h.run('validate')).toBe(2);
    expect(h.stderr()).toContain('no files given');
  });

  it('exits 2 for an unreadable file', async () => {
    const h = harness();
    expect(await h.run('validate missing.html')).toBe(2);
    expect(h.stderr()).toContain('Cannot read');
  });

  it('validates a .txt target as wci.txt directives', async () => {
    const h = harness({ 'wci.txt': 'Rate-Limit-Actions: lots' });
    expect(await h.run('validate wci.txt')).toBe(1);
    expect(h.stdout()).toContain('txt-invalid-number');
  });

  it('validates a .json target as a manifest', async () => {
    const h = harness({ 'wci.json': '{"wci_version":"1.0"}' });
    expect(await h.run('validate wci.json')).toBe(1);
    expect(h.stdout()).toContain('json-missing-field');
  });

  it('fails on warnings under --strict', async () => {
    const h = harness({ 'weak.html': '<body><b data-wci-id="x" data-wci-role="display"></b></body>' });
    expect(await h.run('validate weak.html')).toBe(0);

    const strict = harness({ 'weak.html': '<body><b data-wci-id="x" data-wci-role="display"></b></body>' });
    expect(await strict.run('validate weak.html --strict')).toBe(1);
  });

  it('honours --ignore', async () => {
    const h = harness({ 'weak.html': '<body><b data-wci-id="x" data-wci-role="display"></b></body>' });
    await h.run('validate weak.html --ignore missing-desc');
    expect(h.stdout()).not.toContain('missing-desc');
  });

  it('emits parseable JSON for --format json', async () => {
    const h = harness({ 'bad.html': BAD_HTML });
    await h.run('validate bad.html --format json');
    const parsed = JSON.parse(h.stdout());
    expect(parsed.counts.error).toBeGreaterThan(0);
  });

  it('emits GitHub workflow commands for --format github', async () => {
    const h = harness({ 'bad.html': BAD_HTML });
    await h.run('validate bad.html --format github');
    expect(h.stdout()).toContain('::error ');
    expect(h.stdout()).toContain('file=bad.html');
  });

  it('aggregates multiple files and reports a total', async () => {
    const h = harness({ 'a.html': GOOD_HTML, 'b.html': BAD_HTML });
    expect(await h.run('validate a.html b.html')).toBe(1);
    expect(h.stdout()).toContain('across 2 file(s)');
  });

  it('validates a URL target', async () => {
    const h = harness({ 'https://x.test/p.html': GOOD_HTML });
    expect(await h.run('validate https://x.test/p.html')).toBe(0);
  });
});

describe('run — distil', () => {
  it('writes a JSON view to stdout by default', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    expect(await h.run('distil p.html')).toBe(0);
    const view = JSON.parse(h.stdout());
    expect(view.page_title).toBe('Shop');
    expect(view.nodes.map((n: { id: string }) => n.id)).toContain('checkout');
  });

  it('renders markdown on request', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    await h.run('distil p.html --format markdown');
    expect(h.stdout()).toContain('### Actionable Nodes');
  });

  it('restricts output to one scope', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    await h.run('distil p.html --scope cart');
    expect(JSON.parse(h.stdout()).scope).toBe('cart');
  });

  it('drops state with --no-state', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    await h.run('distil p.html --no-state');
    const total = JSON.parse(h.stdout()).nodes.find((n: { id: string }) => n.id === 'total');
    expect(total.state).toEqual({});
  });

  it('respects --max-nodes', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    await h.run('distil p.html --max-nodes 1');
    expect(JSON.parse(h.stdout()).nodes).toHaveLength(1);
  });

  it('writes to a file with --out and reports to stderr', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    expect(await h.run('distil p.html --out view.json')).toBe(0);
    expect(h.written.get('view.json')).toContain('"page_title"');
    expect(h.stdout()).toBe('');
    expect(h.stderr()).toContain('Wrote view.json');
  });

  it('exits 2 with no target', async () => {
    const h = harness();
    expect(await h.run('distil')).toBe(2);
  });

  it('exits 2 for an unreadable target', async () => {
    const h = harness();
    expect(await h.run('distil nope.html')).toBe(2);
    expect(h.stderr()).toContain('Cannot read');
  });
});

describe('run — stats', () => {
  it('reports node counts, roles, and compression', async () => {
    const h = harness({ 'p.html': GOOD_HTML });
    expect(await h.run('stats p.html')).toBe(0);
    expect(h.stdout()).toContain('Raw HTML');
    expect(h.stdout()).toContain('Distilled view');
    expect(h.stdout()).toMatch(/Compression\s+[\d.]+% fewer tokens/);
    expect(h.stdout()).toContain('Nodes by role');
    expect(h.stdout()).toContain('action');
  });

  it('says so plainly when a page has no annotations', async () => {
    const h = harness({ 'plain.html': '<body><p>nothing here</p></body>' });
    await h.run('stats plain.html');
    expect(h.stdout()).toContain('No annotated nodes found');
  });

  it('exits 2 with no target', async () => {
    expect(await harness().run('stats')).toBe(2);
  });
});

describe('run — init', () => {
  it('scaffolds the three site files', async () => {
    const h = harness();
    expect(await h.run('init')).toBe(0);
    expect([...h.written.keys()]).toEqual([
      'public/wci.txt', 'public/wci.json', 'public/wci.md',
    ]);
    expect(h.stdout()).toContain('Next steps');
  });

  it('honours --dir', async () => {
    const h = harness();
    await h.run('init --dir static');
    expect(h.written.has('static/wci.txt')).toBe(true);
  });

  it('threads site details into the templates', async () => {
    const h = harness();
    await h.run('init --name Acme --url https://acme.test --contact bots@acme.test');
    expect(h.written.get('public/wci.txt')).toContain('Site-Name: Acme');
    expect(JSON.parse(h.written.get('public/wci.json')!).site.base_url).toBe('https://acme.test');
    expect(h.written.get('public/wci.md')).toContain('bots@acme.test');
  });

  it('adds an annotated example with --example', async () => {
    const h = harness();
    await h.run('init --example');
    expect(h.written.get('public/wci-example.html')).toContain('data-wci-role="landmark"');
  });

  it('refuses to clobber existing files', async () => {
    const h = harness({ 'public/wci.txt': 'mine' });
    await h.run('init');
    expect(h.written.get('public/wci.txt')).toBe('mine');
    expect(h.stderr()).toContain('already exists');
    expect(h.stdout()).toContain('1 skipped');
  });

  it('overwrites with --force', async () => {
    const h = harness({ 'public/wci.txt': 'mine' });
    await h.run('init --force');
    expect(h.written.get('public/wci.txt')).toContain('Site-Name');
  });
});

describe('scaffolded files are themselves valid', () => {
  const input = {
    siteName: 'Acme', baseUrl: 'https://acme.test',
    purpose: 'Sell widgets to people', contact: 'bots@acme.test',
  };

  it('generates a wci.txt that passes the validator', () => {
    const report = validateWciTxt(wciTxtTemplate(input));
    expect(report.valid).toBe(true);
    expect(report.counts.warning).toBe(0);
  });

  it('generates a wci.json that passes the validator', () => {
    expect(validateManifest(wciJsonTemplate(input)).valid).toBe(true);
  });
});

describe('createNodeContext', () => {
  it('builds a context wired to the real filesystem', () => {
    const ctx = createNodeContext('/tmp');
    expect(ctx.cwd).toBe('/tmp');
    expect(typeof ctx.readFile).toBe('function');
    expect(typeof ctx.fetchText).toBe('function');
  });
});
