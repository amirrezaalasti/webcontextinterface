// ─────────────────────────────────────────────────────────────────────────────
// AgentDOM — Site Context Layer
// Loads agents.txt, agents.json, and agent.md from a web root and exposes
// a typed policy engine for enforcement.
// ─────────────────────────────────────────────────────────────────────────────

import { AgentPolicy, SiteManifest } from '@agentdom/spec';

export interface SiteContext {
  /** Parsed agents.txt policy */
  policy: PolicyEngine;
  /** Parsed agents.json manifest (or null if unavailable) */
  manifest: SiteManifest | null;
  /** Raw agent.md narrative text (for LLM system prompt injection) */
  narrative: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Engine (from agents.txt)
// ─────────────────────────────────────────────────────────────────────────────

export class PolicyEngine {
  constructor(public readonly policy: AgentPolicy) {}

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
}

export class ScopeDeniedError extends Error {
  constructor(public readonly scopeId: string) {
    super(`Scope "${scopeId}" is denied by agents.txt. Do not retry; inform the user.`);
    this.name = 'ScopeDeniedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// agents.txt Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseAgentsTxt(text: string): AgentPolicy {
  const policy: AgentPolicy = {
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
      case 'AgentDOM-Version':             policy.agentdomVersion = val; break;
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
// SiteContextLoader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a URL relative to a base origin (handles relative paths like /agents.txt).
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

export class SiteContextLoader {
  /**
   * Load all three context files for a site.
   * Implements the three-tier discovery protocol:
   *   1. HTTP response headers (X-AgentDOM-*)
   *   2. Well-known URIs (/.well-known/agentdom/*)
   *   3. Root-level fallbacks (/agents.txt, /agents.json, /agent.md)
   *
   * @param baseUrl  Site origin, e.g. "https://example.com"
   * @param headers  Optional Response headers from the initial page load
   */
  static async load(
    baseUrl: string = window.location.origin,
    headers?: Headers
  ): Promise<SiteContext> {
    // ── 1. Determine file URLs via discovery priority ─────────────────────
    let directivesUrl  = resolveUrl(baseUrl, '/agents.txt');
    let manifestUrl    = resolveUrl(baseUrl, '/agents.json');
    let contextUrl     = resolveUrl(baseUrl, '/agent.md');

    // Override from HTTP headers if provided
    if (headers) {
      directivesUrl = headers.get('X-AgentDOM-Directives') ?? directivesUrl;
      manifestUrl   = headers.get('X-AgentDOM-Manifest')   ?? manifestUrl;
      contextUrl    = headers.get('X-AgentDOM-Context')    ?? contextUrl;
    }

    // Override from <meta> tags (DOM fallback)
    if (typeof document !== 'undefined') {
      const mDirectives = document.querySelector<HTMLMetaElement>('meta[name="agentdom:directives"]');
      const mManifest   = document.querySelector<HTMLMetaElement>('meta[name="agentdom:manifest"]');
      const mContext    = document.querySelector<HTMLMetaElement>('meta[name="agentdom:context"]');
      if (mDirectives?.content) directivesUrl = resolveUrl(baseUrl, mDirectives.content);
      if (mManifest?.content)   manifestUrl   = resolveUrl(baseUrl, mManifest.content);
      if (mContext?.content)    contextUrl    = resolveUrl(baseUrl, mContext.content);
    }

    // Try well-known URIs first (RFC 8615) for directives and manifest
    const wellKnownDirectives = resolveUrl(baseUrl, '/.well-known/agentdom/directives.txt');
    const wellKnownManifest   = resolveUrl(baseUrl, '/.well-known/agentdom/manifest.json');
    const wellKnownContext    = resolveUrl(baseUrl, '/.well-known/agentdom/context.md');

    // ── 2. Fetch all three in parallel ────────────────────────────────────
    const [
      directivesTxt,
      directivesTxtWK,
      manifestJson,
      manifestJsonWK,
      agentMd,
      agentMdWK,
    ] = await Promise.all([
      tryFetch(directivesUrl),
      tryFetch(wellKnownDirectives),
      tryFetch(manifestUrl),
      tryFetch(wellKnownManifest),
      tryFetch(contextUrl),
      tryFetch(wellKnownContext),
    ]);

    // ── 3. Parse ──────────────────────────────────────────────────────────
    const rawDirectives = directivesTxtWK ?? directivesTxt;
    const rawManifest   = manifestJsonWK  ?? manifestJson;
    const rawNarrative  = agentMdWK       ?? agentMd;

    const parsedPolicy = parseAgentsTxt(rawDirectives ?? '');

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

export type { AgentPolicy, SiteManifest } from '@agentdom/spec';
