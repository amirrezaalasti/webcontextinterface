import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { PolicyEngine } from '@webcontextinterface/context';
import {
  ALL_TOOLS,
  SERVER_INSTRUCTIONS,
  SERVER_VERSION,
  WciSession,
  createNodeEnvironment,
  createWciMcpServer,
  loadSiteContext,
  actSequenceTool,
  actTool,
  distilChangesTool,
  distilTool,
  historyTool,
  openPageTool,
  parseWciTxt,
  siteContextTool,
  validateTool,
  type SessionEnvironment,
  type SiteContextState,
} from '@webcontextinterface/mcp';

const PAGE = `<!doctype html><html><head><title>Checkout</title></head><body>
  <form data-wci-role="landmark" data-wci-id="checkout" data-wci-desc="Payment and shipping details">
    <input data-wci-id="email" data-wci-role="form" data-wci-desc="Billing email address"
           data-wci-action="fill" data-wci-scope="checkout" data-wci-state='{"value":""}'
           data-wci-priority="1" />
    <select data-wci-id="ship" data-wci-role="form" data-wci-desc="Shipping speed"
            data-wci-action="select" data-wci-scope="checkout">
      <option value="std">Standard</option><option value="exp">Express</option>
    </select>
    <button type="button" data-wci-id="pay" data-wci-role="action" data-wci-desc="Place the order"
            data-wci-action="click" data-wci-scope="checkout" data-wci-priority="1">Pay</button>
    <span data-wci-id="total" data-wci-role="display" data-wci-desc="Order total"
          data-wci-scope="checkout" data-wci-state='{"amount":42}'>42</span>
  </form>
</body></html>`;

const BROKEN_PAGE = `<!doctype html><html><head><title>Broken</title></head><body>
  <button data-wci-id="dup" data-wci-role="action" data-wci-desc="First action here"></button>
  <button data-wci-id="dup" data-wci-role="bogus"></button>
</body></html>`;

/** A SessionEnvironment backed by an in-memory URL map. */
function fakeEnv(routes: Record<string, string> = {}, context?: SiteContextState) {
  const fetched: string[] = [];
  const env: SessionEnvironment = {
    fetchText: async (url) => {
      fetched.push(url);
      const hit = routes[url];
      if (hit === undefined) throw new Error(`404 ${url}`);
      return hit;
    },
    parseHtml: (html, url) => {
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = html
        .replace(/<!doctype html>/i, '')
        .replace(/<\/?html[^>]*>/gi, '');
      return { document: doc, url, close: () => {} };
    },
    ...(context ? { loadSiteContext: async () => context } : {}),
  };
  return { env, fetched };
}

const call = (
  tool: (typeof ALL_TOOLS)[number],
  args: Record<string, unknown>,
  session: WciSession,
) => tool.handler(args, session);

const parse = (text: string) => JSON.parse(text) as Record<string, never>;

describe('tool catalogue', () => {
  it('exposes eight tools with unique names', () => {
    expect(ALL_TOOLS).toHaveLength(8);
    expect(new Set(ALL_TOOLS.map(t => t.name)).size).toBe(8);
  });

  it('names every tool under the wci_ prefix', () => {
    expect(ALL_TOOLS.every(t => t.name.startsWith('wci_'))).toBe(true);
  });

  it('gives each tool a description an agent can route on', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(60);
      expect(tool.title).toBeTruthy();
    }
  });

  it('marks the read-only tools as such', () => {
    const readOnly = ALL_TOOLS.filter(t => t.readOnly).map(t => t.name);
    expect(readOnly).toContain('wci_distil');
    expect(readOnly).toContain('wci_site_context');
    expect(readOnly).not.toContain('wci_act');
    expect(readOnly).not.toContain('wci_open_page');
  });

  it('documents the expected loop in the server instructions', () => {
    expect(SERVER_INSTRUCTIONS).toContain('wci_open_page');
    expect(SERVER_INSTRUCTIONS).toContain('SCOPE_DENIED');
  });
});

describe('wci_open_page', () => {
  let session: WciSession;

  it('loads a page and reports its title and node count', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);

    const out = await call(openPageTool, { url: 'https://s.test/c' }, session);
    expect(out.isError).toBeFalsy();
    const info = parse(out.text) as unknown as { title: string; nodeCount: number; next: string };
    expect(info.title).toBe('Checkout');
    expect(info.nodeCount).toBe(5);
    expect(info.next).toContain('wci_distil');
  });

  it('reports a fetch failure as a tool error, not a crash', async () => {
    const { env } = fakeEnv();
    const out = await call(openPageTool, { url: 'https://s.test/missing' }, new WciSession(env));
    expect(out.isError).toBe(true);
    expect(out.text).toContain('404');
  });

  it('points at the validator when a page carries no annotations', async () => {
    const { env } = fakeEnv({ 'https://s.test/plain': '<html><body><p>hi</p></body></html>' });
    const out = await call(openPageTool, { url: 'https://s.test/plain' }, new WciSession(env));
    expect(out.text).toContain('wci_validate');
  });

  it('loads the site policy alongside the page', async () => {
    const policy = new PolicyEngine(parseWciTxt('Deny-Scope: checkout'));
    const { env } = fakeEnv({ 'https://s.test/c': PAGE }, { policy, manifest: null, narrative: null });
    const out = await call(openPageTool, { url: 'https://s.test/c' }, new WciSession(env));
    expect((parse(out.text) as unknown as { policyLoaded: boolean }).policyLoaded).toBe(true);
  });

  it('replaces a previously loaded page', async () => {
    const { env } = fakeEnv({ 'https://s.test/a': PAGE, 'https://s.test/b': BROKEN_PAGE });
    const s = new WciSession(env);
    await call(openPageTool, { url: 'https://s.test/a' }, s);
    const out = await call(openPageTool, { url: 'https://s.test/b' }, s);
    expect((parse(out.text) as unknown as { title: string }).title).toBe('Broken');
    expect(s.history()).toEqual([]);
  });
});

describe('tools without an open page', () => {
  it.each([
    ['wci_distil', distilTool],
    ['wci_act', actTool],
    ['wci_site_context', siteContextTool],
    ['wci_validate', validateTool],
    ['wci_distil_changes', distilChangesTool],
  ])('%s explains that a page must be opened first', async (_name, tool) => {
    const { env } = fakeEnv();
    const out = await call(tool, { nodeId: 'x', action: 'click' }, new WciSession(env));
    expect(out.isError).toBe(true);
    expect(out.text).toContain('wci_open_page');
  });
});

describe('wci_distil', () => {
  let session: WciSession;

  beforeEach(async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);
    await session.open('https://s.test/c');
  });

  it('returns a JSON view by default', async () => {
    const view = parse((await call(distilTool, {}, session)).text) as unknown as {
      page_title: string; nodes: { id: string }[];
    };
    expect(view.page_title).toBe('Checkout');
    expect(view.nodes.map(n => n.id)).toContain('pay');
  });

  it('returns markdown on request', async () => {
    const out = await call(distilTool, { format: 'markdown' }, session);
    expect(out.text).toContain('### Actionable Nodes');
    expect(out.text).toContain('`pay`');
  });

  it('restricts to a scope', async () => {
    const view = parse((await call(distilTool, { scope: 'checkout' }, session)).text) as unknown as {
      scope: string;
    };
    expect(view.scope).toBe('checkout');
  });

  it('honours maxNodes', async () => {
    const view = parse((await call(distilTool, { maxNodes: 2 }, session)).text) as unknown as {
      nodes: unknown[];
    };
    expect(view.nodes).toHaveLength(2);
  });

  it('honours a token budget', async () => {
    const full = parse((await call(distilTool, {}, session)).text) as unknown as { nodes: unknown[] };
    const small = parse((await call(distilTool, { maxTokens: 60 }, session)).text) as unknown as {
      nodes: unknown[];
    };
    expect(small.nodes.length).toBeLessThan(full.nodes.length);
  });

  it('drops state when asked', async () => {
    const view = parse((await call(distilTool, { includeState: false }, session)).text) as unknown as {
      nodes: { state: Record<string, unknown> }[];
    };
    expect(view.nodes.every(n => Object.keys(n.state ?? {}).length === 0)).toBe(true);
  });

  it('enforces the site distil rate limit', async () => {
    const policy = new PolicyEngine(parseWciTxt('Rate-Limit-Distil: 1'));
    const { env } = fakeEnv({ 'https://s.test/c': PAGE }, { policy, manifest: null, narrative: null });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    expect((await call(distilTool, {}, s)).isError).toBeFalsy();
    const second = await call(distilTool, {}, s);
    expect(second.isError).toBe(true);
    expect(second.text).toContain('rate limit');
  });
});

describe('wci_act', () => {
  let session: WciSession;

  beforeEach(async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);
    await session.open('https://s.test/c');
  });

  it('fills a field and reports the state change', async () => {
    const out = await call(actTool, { nodeId: 'email', action: 'fill', value: 'a@b.c' }, session);
    expect(out.isError).toBeFalsy();
    const result = parse(out.text) as unknown as {
      success: boolean; stateChange: { after: { value: string } };
    };
    expect(result.success).toBe(true);
    expect(result.stateChange.after.value).toBe('a@b.c');
  });

  it('selects a valid option', async () => {
    const out = await call(actTool, { nodeId: 'ship', action: 'select', value: 'exp' }, session);
    expect(out.isError).toBeFalsy();
  });

  it('marks a failed action as a tool error and names the code', async () => {
    const out = await call(actTool, { nodeId: 'ghost', action: 'click' }, session);
    expect(out.isError).toBe(true);
    expect(out.text).toContain('NODE_NOT_FOUND');
  });

  it('surfaces an invalid select option with the valid ones', async () => {
    const out = await call(actTool, { nodeId: 'ship', action: 'select', value: 'teleport' }, session);
    expect(out.isError).toBe(true);
    expect(out.text).toContain('VALIDATION_FAILED');
    expect(out.text).toContain('std, exp');
  });

  it('blocks an action the site policy denies', async () => {
    const policy = new PolicyEngine(parseWciTxt('Deny-Scope: checkout'));
    const { env } = fakeEnv({ 'https://s.test/c': PAGE }, { policy, manifest: null, narrative: null });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    const out = await call(actTool, { nodeId: 'pay', action: 'click' }, s);
    expect(out.isError).toBe(true);
    expect(out.text).toContain('SCOPE_DENIED');
  });

  it('blocks an action needing human confirmation', async () => {
    const policy = new PolicyEngine(parseWciTxt('Require-Human-Confirmation: checkout'));
    const { env } = fakeEnv({ 'https://s.test/c': PAGE }, { policy, manifest: null, narrative: null });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    expect((await call(actTool, { nodeId: 'pay', action: 'click' }, s)).text)
      .toContain('HUMAN_CONFIRMATION_REQUIRED');
  });
});

describe('wci_act_sequence', () => {
  let session: WciSession;

  beforeEach(async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);
    await session.open('https://s.test/c');
  });

  it('runs every step when all succeed', async () => {
    const out = await call(actSequenceTool, {
      actions: [
        { nodeId: 'email', action: 'fill', value: 'a@b.c' },
        { nodeId: 'ship', action: 'select', value: 'exp' },
        { nodeId: 'pay', action: 'click' },
      ],
    }, session);

    expect(out.isError).toBeFalsy();
    const result = parse(out.text) as unknown as { completed: number; requested: number };
    expect(result.completed).toBe(3);
    expect(result.requested).toBe(3);
  });

  it('stops at the first failure and says where', async () => {
    const out = await call(actSequenceTool, {
      actions: [
        { nodeId: 'email', action: 'fill', value: 'a@b.c' },
        { nodeId: 'ghost', action: 'click' },
        { nodeId: 'pay', action: 'click' },
      ],
    }, session);

    expect(out.isError).toBe(true);
    const result = parse(out.text) as unknown as {
      completed: number; stoppedAt: string; reason: string;
    };
    expect(result.completed).toBe(2);
    expect(result.stoppedAt).toBe('ghost');
    expect(result.reason).toBe('NODE_NOT_FOUND');
  });

  it('rejects a malformed action payload', async () => {
    const out = await call(actSequenceTool, { actions: [{ nodeId: 'email' }] }, session);
    expect(out.isError).toBe(true);
  });
});

describe('wci_distil_changes', () => {
  let session: WciSession;

  beforeEach(async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);
    await session.open('https://s.test/c');
  });

  it('returns a full view first, then only the delta', async () => {
    const first = parse((await call(distilChangesTool, {}, session)).text) as unknown as {
      nodes?: unknown[];
    };
    expect(first.nodes).toBeDefined();

    await session.act({ nodeId: 'email', action: 'fill', value: 'a@b.c' });

    const second = parse((await call(distilChangesTool, {}, session)).text) as unknown as {
      kind: string; updated: { id: string }[];
    };
    expect(second.kind).toBe('diff');
    expect(second.updated.map(u => u.id)).toContain('email');
  });

  it('costs fewer tokens than a full view after a small change', async () => {
    await call(distilChangesTool, {}, session);
    await session.act({ nodeId: 'email', action: 'fill', value: 'a@b.c' });

    const diff = (await call(distilChangesTool, {}, session)).text;
    const full = (await call(distilTool, {}, session)).text;
    expect(diff.length).toBeLessThan(full.length);
  });

  it('reports no changes when the page is stable', async () => {
    await call(distilChangesTool, {}, session);
    const out = await call(distilChangesTool, { format: 'markdown' }, session);
    expect(out.text).toContain('No changes');
  });
});

describe('wci_site_context', () => {
  it('reports the parsed policy and manifest', async () => {
    const policy = new PolicyEngine(parseWciTxt('Site-Name: Shop\nDeny-Scope: admin'));
    const { env } = fakeEnv({ 'https://s.test/c': PAGE }, {
      policy,
      manifest: { wci_version: '1.0' } as never,
      narrative: '# Shop',
    });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    const out = parse((await call(siteContextTool, {}, s)).text) as unknown as {
      policy: { siteName: string; deniedScopes: string[] };
      narrative: string;
      note: string;
    };
    expect(out.policy.siteName).toBe('Shop');
    expect(out.policy.deniedScopes).toEqual(['admin']);
    expect(out.narrative).toBe('# Shop');
    expect(out.note).toContain('enforced automatically');
  });

  it('says plainly when a site publishes no policy', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/c');
    expect((await call(siteContextTool, {}, s)).text).toContain('no wci.txt');
  });
});

describe('wci_validate', () => {
  it('reports annotation problems on the open page', async () => {
    const { env } = fakeEnv({ 'https://s.test/b': BROKEN_PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/b');

    const out = await call(validateTool, {}, s);
    expect(out.text).toContain('duplicate-id');
    expect(out.text).toContain('invalid-role');
  });

  it('passes a well-annotated page', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/c');
    expect((await call(validateTool, {}, s)).text).toContain('No issues found');
  });
});

describe('wci_history', () => {
  let session: WciSession;

  beforeEach(async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    session = new WciSession(env);
    await session.open('https://s.test/c');
  });

  it('starts empty', async () => {
    const out = parse((await call(historyTool, {}, session)).text) as unknown as { total: number };
    expect(out.total).toBe(0);
  });

  it('records actions in order', async () => {
    await session.act({ nodeId: 'email', action: 'fill', value: 'x' });
    await session.act({ nodeId: 'pay', action: 'click' });

    const out = parse((await call(historyTool, {}, session)).text) as unknown as {
      total: number; actions: { nodeId: string }[];
    };
    expect(out.total).toBe(2);
    expect(out.actions.map(a => a.nodeId)).toEqual(['email', 'pay']);
  });

  it('honours a limit, returning the most recent', async () => {
    await session.act({ nodeId: 'email', action: 'fill', value: 'x' });
    await session.act({ nodeId: 'pay', action: 'click' });

    const out = parse((await call(historyTool, { limit: 1 }, session)).text) as unknown as {
      total: number; actions: { nodeId: string }[];
    };
    expect(out.total).toBe(2);
    expect(out.actions.map(a => a.nodeId)).toEqual(['pay']);
  });
});

describe('parseWciTxt', () => {
  it('parses scalars, lists, and limits', () => {
    const p = parseWciTxt(`
# comment
Site-Name: Shop
Allow-Scope: a, b
Deny-Scope: admin
Auth-Required: orders
Require-Human-Confirmation: pay
Rate-Limit-Actions: 12
`);
    expect(p.siteName).toBe('Shop');
    expect(p.allowedScopes).toEqual(['a', 'b']);
    expect(p.deniedScopes).toEqual(['admin']);
    expect(p.authRequired).toEqual(['orders']);
    expect(p.requireHumanConfirmation).toEqual(['pay']);
    expect(p.rateLimitActions).toBe(12);
  });

  it('keeps the default when a limit is malformed', () => {
    // Falling back to NaN here would silently disable the site's rate limit.
    expect(parseWciTxt('Rate-Limit-Actions: lots').rateLimitActions).toBe(60);
    expect(parseWciTxt('Rate-Limit-Distil: -1').rateLimitDistil).toBe(120);
  });

  it('ignores unknown directives and malformed lines', () => {
    const p = parseWciTxt('Nonsense: x\nno colon here\n');
    expect(p.allowedScopes).toEqual([]);
  });
});

describe('WciSession lifecycle', () => {
  it('clears page, history, and context on close', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/c');
    await s.act({ nodeId: 'pay', action: 'click' });

    expect(s.isOpen()).toBe(true);
    s.close();

    expect(s.isOpen()).toBe(false);
    expect(s.history()).toEqual([]);
    expect(s.getContext().policy).toBeNull();
  });

  it('close is safe to call twice', () => {
    const { env } = fakeEnv();
    const s = new WciSession(env);
    s.close();
    expect(() => s.close()).not.toThrow();
  });

  it('accepts a policy attached after opening', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    s.setPolicy(parseWciTxt('Deny-Scope: checkout'));
    expect((await s.act({ nodeId: 'pay', action: 'click' })).error?.code).toBe('SCOPE_DENIED');
  });

  it('resets the diff baseline on request', async () => {
    const { env } = fakeEnv({ 'https://s.test/c': PAGE });
    const s = new WciSession(env);
    await s.open('https://s.test/c');

    s.distilChanges();
    s.resetDiffBaseline();
    expect('nodes' in s.distilChanges()).toBe(true);
  });
});

describe('createNodeEnvironment', () => {
  it('parses HTML into a working document', async () => {
    const env = createNodeEnvironment();
    const page = env.parseHtml('<html><body><b data-wci-id="x">hi</b></body></html>', 'https://s.test/');

    expect(page.url).toBe('https://s.test/');
    expect(page.document.querySelector('[data-wci-id="x"]')?.textContent).toBe('hi');
    page.close();
  });

  it('does not execute scripts in a fetched page', async () => {
    const env = createNodeEnvironment();
    const page = env.parseHtml(
      '<html><body><script>document.body.setAttribute("data-pwned","1")</script></body></html>',
      'https://s.test/',
    );
    expect(page.document.body.hasAttribute('data-pwned')).toBe(false);
    page.close();
  });
});

describe('loadSiteContext', () => {
  function envFor(routes: Record<string, string>): SessionEnvironment {
    return {
      fetchText: async (url) => {
        const hit = routes[url];
        if (hit === undefined) throw new Error(`404 ${url}`);
        return hit;
      },
      parseHtml: (_html, url) => ({
        document: document.implementation.createHTMLDocument(''), url, close: () => {},
      }),
    };
  }

  it('reads the three root-level files', async () => {
    const ctx = await loadSiteContext('https://s.test/page', envFor({
      'https://s.test/wci.txt': 'Site-Name: Shop\nDeny-Scope: admin',
      'https://s.test/wci.json': '{"wci_version":"1.0"}',
      'https://s.test/wci.md': '# Shop',
    }));

    expect(ctx.policy?.policy.siteName).toBe('Shop');
    expect(ctx.policy?.isScopeDenied('admin')).toBe(true);
    expect(ctx.manifest?.wci_version).toBe('1.0');
    expect(ctx.narrative).toBe('# Shop');
  });

  it('falls back to .well-known', async () => {
    const ctx = await loadSiteContext('https://s.test/page', envFor({
      'https://s.test/.well-known/wci/directives.txt': 'Site-Name: WellKnown',
    }));
    expect(ctx.policy?.policy.siteName).toBe('WellKnown');
  });

  it('prefers the root file over .well-known', async () => {
    const ctx = await loadSiteContext('https://s.test/page', envFor({
      'https://s.test/wci.txt': 'Site-Name: Root',
      'https://s.test/.well-known/wci/directives.txt': 'Site-Name: WellKnown',
    }));
    expect(ctx.policy?.policy.siteName).toBe('Root');
  });

  it('returns empty context when a site publishes nothing', async () => {
    const ctx = await loadSiteContext('https://s.test/page', envFor({}));
    expect(ctx).toEqual({ policy: null, manifest: null, narrative: null });
  });

  it('survives a malformed manifest', async () => {
    const ctx = await loadSiteContext('https://s.test/page', envFor({
      'https://s.test/wci.json': '{not json',
    }));
    expect(ctx.manifest).toBeNull();
  });

  it('returns empty context for an unparseable URL', async () => {
    expect(await loadSiteContext('not-a-url', envFor({})))
      .toEqual({ policy: null, manifest: null, narrative: null });
  });
});

describe('createWciMcpServer', () => {
  /** Connect a real MCP client to the server over an in-memory transport. */
  async function connected(routes: Record<string, string> = {}) {
    const { env } = fakeEnv(routes);
    const server = createWciMcpServer(new WciSession(env));
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, close: () => client.close() };
  }

  it('advertises every tool with a schema and a description', async () => {
    const { client, close } = await connected();
    const { tools } = await client.listTools();

    expect(tools.map(t => t.name).sort()).toEqual(ALL_TOOLS.map(t => t.name).sort());
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
    }
    await close();
  });

  it('marks read-only tools so clients can auto-approve them', async () => {
    const { client, close } = await connected();
    const { tools } = await client.listTools();

    const distil = tools.find(t => t.name === 'wci_distil')!;
    const act = tools.find(t => t.name === 'wci_act')!;
    expect(distil.annotations?.readOnlyHint).toBe(true);
    expect(act.annotations?.readOnlyHint).toBe(false);
    await close();
  });

  it('routes a real tool call end to end', async () => {
    const { client, close } = await connected({ 'https://s.test/c': PAGE });

    const result = await client.callTool({
      name: 'wci_open_page',
      arguments: { url: 'https://s.test/c' },
    }) as { content: { text: string }[] };

    expect(result.content[0].text).toContain('Checkout');
    await close();
  });

  it('reports a handler failure as a tool error, not a protocol error', async () => {
    const { client, close } = await connected();

    const result = await client.callTool({ name: 'wci_distil', arguments: {} }) as {
      content: { text: string }[]; isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('wci_open_page');
    await close();
  });

  it('reports the server version', () => {
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
