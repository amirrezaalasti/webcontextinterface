// ─────────────────────────────────────────────────────────────────────────────
// WCI MCP — Node.js environment
// ─────────────────────────────────────────────────────────────────────────────

import { JSDOM } from 'jsdom';
import { PolicyEngine } from '@webcontextinterface/context';
import type { SiteManifest, WciPolicy } from '@webcontextinterface/spec';
import type { PageHandle, SessionEnvironment, SiteContextState } from './session';

export interface NodeEnvOptions {
  /** Request timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** User-Agent sent with every request. */
  userAgent?: string;
}

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_UA = 'wci-mcp/1.3.0 (+https://webcontextinterface.vercel.app/)';

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  userAgent: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'text/html,application/json,text/plain' },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

export function createNodeEnvironment(options: NodeEnvOptions = {}): SessionEnvironment {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const userAgent = options.userAgent ?? DEFAULT_UA;

  return {
    fetchText: async (url) => {
      const res = await fetchWithTimeout(url, timeoutMs, userAgent);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`);
      return res.text();
    },

    parseHtml: (html, url): PageHandle => {
      // Page scripts stay off: an agent loading an arbitrary URL must not
      // execute that page's JavaScript inside the MCP server process.
      const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
      return {
        document: dom.window.document,
        url,
        close: () => dom.window.close(),
      };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Site context loading
//
// WciContextLoader in @webcontextinterface/context reads `document` and
// `window.location` from the ambient browser globals. Server-side there is no
// ambient document, so the same discovery order is reimplemented here against
// an explicit origin.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, keyof WciPolicy> = {
  'Site-Name': 'siteName',
  'Site-Purpose': 'sitePurpose',
  Contact: 'contact',
  'WCI-Version': 'wciVersion',
  Manifest: 'manifestUrl',
  Context: 'contextUrl',
  'Auth-Method': 'authMethod',
  'Auth-Flow-Scope': 'authFlowScope',
  'Last-Updated': 'lastUpdated',
};

const LIST_MAP: Record<string, 'allowedScopes' | 'deniedScopes' | 'authRequired' | 'requireHumanConfirmation'> = {
  'Allow-Scope': 'allowedScopes',
  'Deny-Scope': 'deniedScopes',
  'Auth-Required': 'authRequired',
  'Require-Human-Confirmation': 'requireHumanConfirmation',
};

export function parseWciTxt(text: string): WciPolicy {
  const policy: WciPolicy = {
    allowedScopes: [], deniedScopes: [], rateLimitActions: 60, rateLimitDistil: 120,
    authRequired: [], requireHumanConfirmation: [],
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    const scalar = KEY_MAP[key];
    if (scalar) {
      (policy as unknown as Record<string, string>)[scalar] = value;
      continue;
    }

    const list = LIST_MAP[key];
    if (list) {
      policy[list].push(...value.split(',').map(s => s.trim()).filter(Boolean));
      continue;
    }

    if (key === 'Rate-Limit-Actions' || key === 'Rate-Limit-Distil') {
      const n = Number.parseInt(value, 10);
      // A malformed limit must not disable the limit; keep the default.
      if (Number.isFinite(n) && n >= 0) {
        policy[key === 'Rate-Limit-Actions' ? 'rateLimitActions' : 'rateLimitDistil'] = n;
      }
    }
  }

  return policy;
}

/** Fetch the three site files for an origin; missing files are not errors. */
export async function loadSiteContext(
  pageUrl: string,
  env: SessionEnvironment,
): Promise<SiteContextState> {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return { policy: null, manifest: null, narrative: null };
  }

  const tryGet = async (path: string): Promise<string | null> => {
    try {
      return await env.fetchText(`${origin}${path}`);
    } catch {
      return null;
    }
  };

  const [txt, txtWellKnown, jsonText, jsonWellKnown, md, mdWellKnown] = await Promise.all([
    tryGet('/wci.txt'),
    tryGet('/.well-known/wci/directives.txt'),
    tryGet('/wci.json'),
    tryGet('/.well-known/wci/manifest.json'),
    tryGet('/wci.md'),
    tryGet('/.well-known/wci/context.md'),
  ]);

  const rawTxt = txt ?? txtWellKnown;
  const rawJson = jsonText ?? jsonWellKnown;
  const narrative = md ?? mdWellKnown;

  let manifest: SiteManifest | null = null;
  if (rawJson) {
    try { manifest = JSON.parse(rawJson) as SiteManifest; } catch { /* not fatal */ }
  }

  return {
    policy: rawTxt ? new PolicyEngine(parseWciTxt(rawTxt)) : null,
    manifest,
    narrative,
  };
}
