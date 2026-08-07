import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WciPolicy } from '@webcontextinterface/spec';
import { PolicyEngine, ScopeDeniedError, WciContextLoader } from '@webcontextinterface/context';

function policyOf(overrides: Partial<WciPolicy> = {}): PolicyEngine {
  return new PolicyEngine({
    allowedScopes: [], deniedScopes: [], rateLimitActions: 60, rateLimitDistil: 120,
    authRequired: [], requireHumanConfirmation: [], ...overrides,
  });
}

describe('PolicyEngine — scopes', () => {
  it('allows everything when no rules are set', () => {
    expect(policyOf().isScopeDenied('anything')).toBe(false);
  });

  it('denies an explicitly denied scope', () => {
    expect(policyOf({ deniedScopes: ['admin'] }).isScopeDenied('admin')).toBe(true);
  });

  it('treats a non-empty allow-list as exhaustive', () => {
    const p = policyOf({ allowedScopes: ['search'] });
    expect(p.isScopeDenied('search')).toBe(false);
    expect(p.isScopeDenied('checkout')).toBe(true);
  });

  it('lets deny win over allow for the same scope', () => {
    const p = policyOf({ allowedScopes: ['admin'], deniedScopes: ['admin'] });
    expect(p.isScopeDenied('admin')).toBe(true);
  });

  it('assertScopeAllowed throws a typed, agent-readable error', () => {
    const p = policyOf({ deniedScopes: ['admin'] });
    expect(() => p.assertScopeAllowed('admin')).toThrow(ScopeDeniedError);
    try {
      p.assertScopeAllowed('admin');
    } catch (e) {
      expect((e as ScopeDeniedError).scopeId).toBe('admin');
      expect((e as Error).name).toBe('ScopeDeniedError');
      expect((e as Error).message).toContain('Do not retry');
    }
  });

  it('assertScopeAllowed is silent for an allowed scope', () => {
    expect(() => policyOf().assertScopeAllowed('ok')).not.toThrow();
  });

  it('reports auth and human-confirmation requirements', () => {
    const p = policyOf({ authRequired: ['orders'], requireHumanConfirmation: ['pay'] });
    expect(p.requiresAuth('orders')).toBe(true);
    expect(p.requiresAuth('search')).toBe(false);
    expect(p.requiresHumanConfirmation('pay')).toBe(true);
    expect(p.requiresHumanConfirmation('search')).toBe(false);
  });
});

describe('PolicyEngine — rate limiting', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks once the action limit is reached', () => {
    const p = policyOf({ rateLimitActions: 3 });
    for (let i = 0; i < 3; i++) {
      expect(p.isActionRateLimited()).toBe(false);
      p.recordAction();
    }
    expect(p.isActionRateLimited()).toBe(true);
  });

  it('tracks distil requests on a separate budget', () => {
    const p = policyOf({ rateLimitActions: 1, rateLimitDistil: 2 });
    p.recordAction();
    expect(p.isActionRateLimited()).toBe(true);
    expect(p.isDistilRateLimited()).toBe(false);

    p.recordDistil();
    p.recordDistil();
    expect(p.isDistilRateLimited()).toBe(true);
  });

  it('frees budget as the one-minute window slides', () => {
    const p = policyOf({ rateLimitActions: 2 });
    p.recordAction();
    p.recordAction();
    expect(p.isActionRateLimited()).toBe(true);

    vi.advanceTimersByTime(61_000);
    expect(p.isActionRateLimited()).toBe(false);
  });

  it('expires only the timestamps that fell outside the window', () => {
    const p = policyOf({ rateLimitActions: 2 });
    p.recordAction();
    vi.advanceTimersByTime(40_000);
    p.recordAction();
    expect(p.isActionRateLimited()).toBe(true);

    // 65s total: the first record aged out, the second (25s old) has not.
    vi.advanceTimersByTime(25_000);
    expect(p.isActionRateLimited()).toBe(false);
    p.recordAction();
    expect(p.isActionRateLimited()).toBe(true);
  });

  it('blocks everything when the limit is zero', () => {
    expect(policyOf({ rateLimitActions: 0 }).isActionRateLimited()).toBe(true);
  });
});

describe('WciContextLoader', () => {
  const WCI_TXT = `
# comment line
Site-Name: Example Shop
Site-Purpose: Sell things
Contact: ops@example.com
WCI-Version: 1.2
Manifest: /wci.json
Context: /wci.md
Allow-Scope: search, browse
Deny-Scope: admin
Deny-Scope: internal
Rate-Limit-Actions: 30
Rate-Limit-Distil: 90
Auth-Required: orders, account
Auth-Method: oauth2
Auth-Flow-Scope: login
Require-Human-Confirmation: checkout
Last-Updated: 2026-01-01
Unknown-Directive: ignored
malformed line without a colon
`;

  const MANIFEST = JSON.stringify({
    wci_version: '1.0',
    site: { name: 'Example Shop', base_url: 'https://example.com', purpose: 'Sell things' },
    capabilities: { wci_supported: true },
  });

  function mockFetch(routes: Record<string, string | number>) {
    return vi.fn(async (url: string) => {
      const hit = routes[String(url)];
      if (hit === undefined) return { ok: false, status: 404, text: async () => '' };
      if (typeof hit === 'number') return { ok: false, status: hit, text: async () => '' };
      return { ok: true, status: 200, text: async () => hit };
    });
  }

  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('parses every supported wci.txt directive', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'https://example.com/wci.txt': WCI_TXT }));
    const { policy } = await WciContextLoader.load('https://example.com');
    const p = policy.policy;

    expect(p.siteName).toBe('Example Shop');
    expect(p.sitePurpose).toBe('Sell things');
    expect(p.contact).toBe('ops@example.com');
    expect(p.wciVersion).toBe('1.2');
    expect(p.manifestUrl).toBe('/wci.json');
    expect(p.contextUrl).toBe('/wci.md');
    expect(p.allowedScopes).toEqual(['search', 'browse']);
    expect(p.deniedScopes).toEqual(['admin', 'internal']);
    expect(p.rateLimitActions).toBe(30);
    expect(p.rateLimitDistil).toBe(90);
    expect(p.authRequired).toEqual(['orders', 'account']);
    expect(p.authMethod).toBe('oauth2');
    expect(p.authFlowScope).toBe('login');
    expect(p.requireHumanConfirmation).toEqual(['checkout']);
    expect(p.lastUpdated).toBe('2026-01-01');
  });

  it('falls back to safe defaults when no wci.txt exists', async () => {
    vi.stubGlobal('fetch', mockFetch({}));
    const { policy, manifest, narrative } = await WciContextLoader.load('https://example.com');

    expect(policy.policy.rateLimitActions).toBe(60);
    expect(policy.policy.deniedScopes).toEqual([]);
    expect(policy.isScopeDenied('anything')).toBe(false);
    expect(manifest).toBeNull();
    expect(narrative).toBeNull();
  });

  it('parses the manifest and narrative', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://example.com/wci.json': MANIFEST,
      'https://example.com/wci.md': '# Shop context',
    }));
    const { manifest, narrative } = await WciContextLoader.load('https://example.com');
    expect(manifest?.site.name).toBe('Example Shop');
    expect(narrative).toBe('# Shop context');
  });

  it('survives a malformed manifest without throwing', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'https://example.com/wci.json': '{not json' }));
    await expect(WciContextLoader.load('https://example.com')).resolves.toMatchObject({ manifest: null });
  });

  it('survives a rejected fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(WciContextLoader.load('https://example.com')).resolves.toBeDefined();
  });

  it('prefers meta tags over root-level defaults', async () => {
    document.head.innerHTML = '<meta name="wci:directives" content="/custom/rules.txt">';
    const fetchMock = mockFetch({ 'https://example.com/custom/rules.txt': 'Site-Name: Custom' });
    vi.stubGlobal('fetch', fetchMock);

    const { policy } = await WciContextLoader.load('https://example.com');
    expect(policy.policy.siteName).toBe('Custom');
  });

  it('prefers meta tags over HTTP headers', async () => {
    document.head.innerHTML = '<meta name="wci:directives" content="/from-meta.txt">';
    vi.stubGlobal('fetch', mockFetch({
      'https://example.com/from-meta.txt': 'Site-Name: Meta',
      'https://example.com/from-header.txt': 'Site-Name: Header',
    }));

    const headers = new Headers({ 'X-WCI-Directives': 'https://example.com/from-header.txt' });
    const { policy } = await WciContextLoader.load('https://example.com', headers);
    expect(policy.policy.siteName).toBe('Meta');
  });

  it('uses HTTP headers when no meta tag is present', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://example.com/from-header.txt': 'Site-Name: Header',
    }));
    const headers = new Headers({ 'X-WCI-Directives': 'https://example.com/from-header.txt' });
    const { policy } = await WciContextLoader.load('https://example.com', headers);
    expect(policy.policy.siteName).toBe('Header');
  });

  it('falls back to .well-known when the root file is missing', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://example.com/.well-known/wci/directives.txt': 'Site-Name: WellKnown',
    }));
    const { policy } = await WciContextLoader.load('https://example.com');
    expect(policy.policy.siteName).toBe('WellKnown');
  });

  it('does not probe .well-known once a location was declared explicitly', async () => {
    document.head.innerHTML = '<meta name="wci:directives" content="/explicit.txt">';
    const fetchMock = mockFetch({ 'https://example.com/explicit.txt': 'Site-Name: Explicit' });
    vi.stubGlobal('fetch', fetchMock);

    await WciContextLoader.load('https://example.com');
    const requested = fetchMock.mock.calls.map(c => String(c[0]));
    expect(requested).not.toContain('https://example.com/.well-known/wci/directives.txt');
  });

  it('prefers the root file over .well-known when both exist', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'https://example.com/wci.txt': 'Site-Name: Root',
      'https://example.com/.well-known/wci/directives.txt': 'Site-Name: WellKnown',
    }));
    const { policy } = await WciContextLoader.load('https://example.com');
    expect(policy.policy.siteName).toBe('Root');
  });

  it('resolves absolute URLs in meta tags as-is', async () => {
    document.head.innerHTML = '<meta name="wci:manifest" content="https://cdn.example.net/m.json">';
    vi.stubGlobal('fetch', mockFetch({ 'https://cdn.example.net/m.json': MANIFEST }));
    const { manifest } = await WciContextLoader.load('https://example.com');
    expect(manifest?.site.name).toBe('Example Shop');
  });

  it('resolves a relative path without a leading slash', async () => {
    document.head.innerHTML = '<meta name="wci:context" content="ctx.md">';
    vi.stubGlobal('fetch', mockFetch({ 'https://example.com/ctx.md': 'ctx' }));
    expect((await WciContextLoader.load('https://example.com')).narrative).toBe('ctx');
  });

  it('discards a non-OK response', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'https://example.com/wci.md': 500 }));
    expect((await WciContextLoader.load('https://example.com')).narrative).toBeNull();
  });

  it('fetches all three files concurrently', async () => {
    const fetchMock = mockFetch({ 'https://example.com/wci.txt': 'Site-Name: S' });
    vi.stubGlobal('fetch', fetchMock);
    await WciContextLoader.load('https://example.com');
    const requested = fetchMock.mock.calls.map(c => String(c[0]));
    expect(requested).toContain('https://example.com/wci.txt');
    expect(requested).toContain('https://example.com/wci.json');
    expect(requested).toContain('https://example.com/wci.md');
  });
});
