// ─────────────────────────────────────────────────────────────────────────────
// WCI MCP — page session
//
// Holds the DOM an agent is currently working against, plus the site policy and
// the distiller session used to send diffs instead of whole views.
// ─────────────────────────────────────────────────────────────────────────────

import { WciBridge, type ActionRequest, type ActionResult } from '@webcontextinterface/bridge';
import { PolicyEngine } from '@webcontextinterface/context';
import {
  WciDistiller,
  WciDistillerSession,
  type DistillerOptions,
  type WciViewDiff,
} from '@webcontextinterface/distiller';
import type { SiteManifest, WciPolicy, WciView } from '@webcontextinterface/spec';

/** A parsed DOM plus the means to release it. */
export interface PageHandle {
  document: Document;
  url: string;
  close: () => void;
}

/** Everything the server needs from the outside world. */
export interface SessionEnvironment {
  /** Fetch a URL's HTML. */
  fetchText: (url: string) => Promise<string>;
  /** Parse HTML into a DOM. */
  parseHtml: (html: string, url: string) => PageHandle;
  /**
   * Fetch and parse the site's wci.txt / wci.json / wci.md for a page URL.
   * Optional: without it, a session runs with no policy in force.
   */
  loadSiteContext?: (pageUrl: string) => Promise<SiteContextState>;
}

export interface SiteContextState {
  policy: PolicyEngine | null;
  manifest: SiteManifest | null;
  narrative: string | null;
}

const EMPTY_POLICY: WciPolicy = {
  allowedScopes: [], deniedScopes: [], rateLimitActions: 60, rateLimitDistil: 120,
  authRequired: [], requireHumanConfirmation: [],
};

/**
 * One agent's working context: the loaded page, its site policy, and the
 * diff baseline. MCP tools are stateless calls, so this is where continuity
 * between them lives.
 */
export class WciSession {
  private page: PageHandle | null = null;
  private bridge: WciBridge | null = null;
  private distillerSession: WciDistillerSession | null = null;
  private context: SiteContextState = { policy: null, manifest: null, narrative: null };

  constructor(private readonly env: SessionEnvironment) {}

  /** Load a page, replacing whatever was loaded before. */
  async open(url: string, siteContext?: Partial<SiteContextState>): Promise<{
    url: string;
    title: string;
    nodeCount: number;
    policyLoaded: boolean;
  }> {
    this.close();

    // The page and its policy are fetched together: the policy governs the
    // very first action, so loading it lazily would leave a window in which
    // an agent could act on a denied scope.
    const [html, discovered] = await Promise.all([
      this.env.fetchText(url),
      siteContext ? Promise.resolve(null) : this.env.loadSiteContext?.(url) ?? Promise.resolve(null),
    ]);

    this.page = this.env.parseHtml(html, url);

    const body = this.page.document.body;
    if (!body) throw new Error(`Loaded document for ${url} has no <body>.`);

    const resolved = siteContext ?? discovered ?? {};
    this.context = {
      policy: resolved.policy ?? null,
      manifest: resolved.manifest ?? null,
      narrative: resolved.narrative ?? null,
    };

    this.bridge = new WciBridge(body, { policy: this.context.policy ?? undefined });
    this.distillerSession = null;

    const view = new WciDistiller({ onWarn: () => {} }).toView(this.page.document);
    return {
      url,
      title: view.page_title,
      nodeCount: view.node_count,
      policyLoaded: this.context.policy !== null,
    };
  }

  /** True once a page is loaded. */
  isOpen(): boolean {
    return this.page !== null;
  }

  /** The loaded page, or a clear error naming the tool that fixes it. */
  requirePage(): PageHandle {
    if (!this.page) {
      throw new Error('No page is open. Call wci_open_page with a URL first.');
    }
    return this.page;
  }

  private requireBridge(): WciBridge {
    if (!this.bridge) {
      throw new Error('No page is open. Call wci_open_page with a URL first.');
    }
    return this.bridge;
  }

  getContext(): SiteContextState {
    return this.context;
  }

  /** Attach a site policy parsed from wci.txt. */
  setPolicy(policy: WciPolicy | null): void {
    const engine = policy ? new PolicyEngine(policy) : null;
    this.context.policy = engine;
    this.bridge?.setPolicy(engine ?? undefined);
  }

  /** Full distillation of the current page. */
  distil(options: DistillerOptions = {}): WciView {
    const page = this.requirePage();
    const policy = this.context.policy;

    if (policy?.isDistilRateLimited()) {
      throw new Error(
        `Distil rate limit (${policy.policy.rateLimitDistil}/min) exceeded — wait before retrying.`,
      );
    }

    const view = new WciDistiller({ onWarn: () => {}, ...options }).toView(page.document);
    policy?.recordDistil();
    return view;
  }

  /** Only what changed since the last call; a full view on the first. */
  distilChanges(options: DistillerOptions = {}): WciView | WciViewDiff {
    const page = this.requirePage();
    if (!this.distillerSession) {
      this.distillerSession = new WciDistillerSession(
        new WciDistiller({ onWarn: () => {}, ...options }),
      );
    }
    return this.distillerSession.next(page.document);
  }

  /** Reset the diff baseline so the next call returns a full view. */
  resetDiffBaseline(): void {
    this.distillerSession?.reset();
  }

  /** Dispatch one action against the loaded page. */
  async act(request: ActionRequest): Promise<ActionResult> {
    return this.requireBridge().dispatch(request);
  }

  /** Dispatch a sequence, stopping at the first failure. */
  async actSequence(requests: ActionRequest[]): Promise<ActionResult[]> {
    return this.requireBridge().dispatchSequence(requests);
  }

  /** Every action taken against the current page. */
  history(): ActionResult[] {
    return this.bridge?.getHistory() ?? [];
  }

  /** Release the DOM and its listeners. */
  close(): void {
    this.bridge?.destroy();
    this.bridge = null;
    this.distillerSession = null;
    this.page?.close();
    this.page = null;
    this.context = { policy: null, manifest: null, narrative: null };
  }
}

export { EMPTY_POLICY };
