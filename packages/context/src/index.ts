// ─────────────────────────────────────────────────────────────────────────────
// WCI — Site Context Layer
// Loads wci.txt, wci.json, and wci.md from a web root and exposes
// a typed policy engine for enforcement.
// ─────────────────────────────────────────────────────────────────────────────

import { WciPolicy, SiteManifest } from '@webcontextinterface/spec';

export interface SiteContext {
  /** Parsed wci.txt policy */
  policy: PolicyEngine;
  /** Parsed wci.json manifest (or null if unavailable) */
  manifest: SiteManifest | null;
  /** Raw wci.md narrative text (for LLM system prompt injection) */
  narrative: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Engine (from wci.txt)
// ─────────────────────────────────────────────────────────────────────────────

export class PolicyEngine {
  /** Sliding-window timestamps for rate-limit tracking */
  private actionTimestamps: number[] = [];
  private distilTimestamps: number[] = [];

  constructor(public readonly policy: WciPolicy) {}

  /** Returns true if the scope is explicitly denied */
  isScopeDenied(scopeId: string): boolean {
    if (this.policy.deniedScopes.includes(scopeId)) return true;
    // If an allow-list is defined, anything not on it is implicitly denied
    if (this.policy.allowedScopes.length > 0 && !this.policy.allowedScopes.includes(scopeId)) {
      return true;
    }
    return false;
  }

  /** Throws a typed error if the scope is denied */
  assertScopeAllowed(scopeId: string): void {
    if (this.isScopeDenied(scopeId)) {
      throw new ScopeDeniedError(scopeId);
    }
  }

  /** Returns true if the scope requires authentication */
  requiresAuth(scopeId: string): boolean {
    return this.policy.authRequired.includes(scopeId);
  }

  /** Returns true if the scope requires an explicit human confirmation */
  requiresHumanConfirmation(scopeId: string): boolean {
    return this.policy.requireHumanConfirmation.includes(scopeId);
  }

  /**
   * Check and record an action against the rate limit.
   * Returns true if the action is rate-limited (should be blocked).
   */
  isActionRateLimited(): boolean {
    return this.checkRateLimit(
      this.actionTimestamps,
      this.policy.rateLimitActions
    );
  }

  /**
   * Check and record a distil request against the rate limit.
   * Returns true if the request is rate-limited (should be blocked).
   */
  isDistilRateLimited(): boolean {
    return this.checkRateLimit(
      this.distilTimestamps,
      this.policy.rateLimitDistil
    );
  }

  /**
   * Record an action dispatch (call after a successful dispatch).
   */
  recordAction(): void {
    this.actionTimestamps.push(Date.now());
  }

  /**
   * Record a distil request (call after a successful distil).
   */
  recordDistil(): void {
    this.distilTimestamps.push(Date.now());
  }

  /** Sliding-window rate limit check (1-minute window) */
  private checkRateLimit(timestamps: number[], limit: number): boolean {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute

    // Evict timestamps older than the window
    while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
      timestamps.shift();
    }

    return timestamps.length >= limit;
  }
}

export class ScopeDeniedError extends Error {
  constructor(public readonly scopeId: string) {
    super(`Scope "${scopeId}" is denied by wci.txt. Do not retry; inform the user.`);
    this.name = 'ScopeDeniedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// wci.txt Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseWciTxt(text: string): WciPolicy {
  const policy: WciPolicy = {
    allowedScopes: [],
    deniedScopes: [],
    rateLimitActions: 60,
    rateLimitDistil: 120,
    authRequired: [],
    requireHumanConfirmation: [],
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();

    switch (key) {
      case 'Site-Name':                    policy.siteName = val; break;
      case 'Site-Purpose':                 policy.sitePurpose = val; break;
      case 'Contact':                      policy.contact = val; break;
      case 'WCI-Version':             policy.wciVersion = val; break;
      case 'Manifest':                     policy.manifestUrl = val; break;
      case 'Context':                      policy.contextUrl = val; break;
      case 'Allow-Scope':                  policy.allowedScopes.push(...val.split(',').map(s => s.trim())); break;
      case 'Deny-Scope':                   policy.deniedScopes.push(...val.split(',').map(s => s.trim())); break;
      case 'Rate-Limit-Actions':           policy.rateLimitActions = parseInt(val, 10); break;
      case 'Rate-Limit-Distil':            policy.rateLimitDistil = parseInt(val, 10); break;
      case 'Auth-Required':                policy.authRequired.push(...val.split(',').map(s => s.trim())); break;
      case 'Auth-Method':                  policy.authMethod = val; break;
      case 'Auth-Flow-Scope':              policy.authFlowScope = val; break;
      case 'Require-Human-Confirmation':   policy.requireHumanConfirmation.push(...val.split(',').map(s => s.trim())); break;
      case 'Last-Updated':                 policy.lastUpdated = val; break;
    }
  }

  return policy;
}

// ─────────────────────────────────────────────────────────────────────────────
// WciContextLoader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a URL relative to a base origin (handles relative paths like /wci.txt).
 */
function resolveUrl(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = new URL(base).origin;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Try to fetch a resource; return null on any error (network, 404, CORS).
 */
async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export class WciContextLoader {
  /**
   * Load all three context files for a site.
   * Discovery priority (highest → lowest):
   *   1. `<meta>` tags in the document head
   *   2. HTTP response headers (X-WCI-*)
   *   3. Root-level fallbacks (/wci.txt, /wci.json, /wci.md)
   *   4. Well-known URIs (/.well-known/wci/*) — used only as fallback
   *
   * @param baseUrl  Site origin, e.g. "https://example.com"
   * @param headers  Optional Response headers from the initial page load
   */
  static async load(
    baseUrl: string = window.location.origin,
    headers?: Headers
  ): Promise<SiteContext> {
    // ── 1. Start with root-level defaults ──────────────────────────────────
    let directivesUrl  = resolveUrl(baseUrl, '/wci.txt');
    let manifestUrl    = resolveUrl(baseUrl, '/wci.json');
    let contextUrl     = resolveUrl(baseUrl, '/wci.md');

    // Track whether an explicit (non-default) URL was provided
    let directivesExplicit = false;
    let manifestExplicit   = false;
    let contextExplicit    = false;

    // ── 2. Override from HTTP headers if provided ─────────────────────────
    if (headers) {
      const hDir = headers.get('X-WCI-Directives');
      const hMan = headers.get('X-WCI-Manifest');
      const hCtx = headers.get('X-WCI-Context');
      if (hDir) { directivesUrl = hDir; directivesExplicit = true; }
      if (hMan) { manifestUrl   = hMan; manifestExplicit   = true; }
      if (hCtx) { contextUrl    = hCtx; contextExplicit    = true; }
    }

    // ── 3. Override from <meta> tags (highest priority) ───────────────────
    if (typeof document !== 'undefined') {
      const mDirectives = document.querySelector<HTMLMetaElement>('meta[name="wci:directives"]');
      const mManifest   = document.querySelector<HTMLMetaElement>('meta[name="wci:manifest"]');
      const mContext    = document.querySelector<HTMLMetaElement>('meta[name="wci:context"]');
      if (mDirectives?.content) { directivesUrl = resolveUrl(baseUrl, mDirectives.content); directivesExplicit = true; }
      if (mManifest?.content)   { manifestUrl   = resolveUrl(baseUrl, mManifest.content);   manifestExplicit   = true; }
      if (mContext?.content)    { contextUrl    = resolveUrl(baseUrl, mContext.content);     contextExplicit    = true; }
    }

    // ── 4. Well-known URIs (fallback only) ────────────────────────────────
    const wellKnownDirectives = resolveUrl(baseUrl, '/.well-known/wci/directives.txt');
    const wellKnownManifest   = resolveUrl(baseUrl, '/.well-known/wci/manifest.json');
    const wellKnownContext    = resolveUrl(baseUrl, '/.well-known/wci/context.md');

    // ── 5. Fetch all in parallel ──────────────────────────────────────────
    const [
      directivesTxt,
      directivesTxtWK,
      manifestJson,
      manifestJsonWK,
      agentMd,
      agentMdWK,
    ] = await Promise.all([
      tryFetch(directivesUrl),
      directivesExplicit ? Promise.resolve(null) : tryFetch(wellKnownDirectives),
      tryFetch(manifestUrl),
      manifestExplicit   ? Promise.resolve(null) : tryFetch(wellKnownManifest),
      tryFetch(contextUrl),
      contextExplicit    ? Promise.resolve(null) : tryFetch(wellKnownContext),
    ]);

    // ── 6. Resolve: explicit/root-level wins; well-known is fallback ─────
    const rawDirectives = directivesTxt ?? directivesTxtWK;
    const rawManifest   = manifestJson  ?? manifestJsonWK;
    const rawNarrative  = agentMd       ?? agentMdWK;

    const parsedPolicy = parseWciTxt(rawDirectives ?? '');

    let parsedManifest: SiteManifest | null = null;
    if (rawManifest) {
      try { parsedManifest = JSON.parse(rawManifest); } catch { /* ignore */ }
    }

    return {
      policy:    new PolicyEngine(parsedPolicy),
      manifest:  parsedManifest,
      narrative: rawNarrative,
    };
  }
}

export type { WciPolicy, SiteManifest } from '@webcontextinterface/spec';
