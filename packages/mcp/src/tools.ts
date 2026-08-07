// ─────────────────────────────────────────────────────────────────────────────
// WCI MCP — tool definitions
//
// Defined as plain data plus plain handlers, independent of the MCP SDK. The
// SDK adapter in server.ts registers them; the tests call them directly. That
// split is what lets the whole tool surface be covered without a transport.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { VALID_WCI_ACTIONS } from '@webcontextinterface/spec';
import { serializeDiffMarkdown, serializeMarkdown } from '@webcontextinterface/distiller';
import { validateMarkup, formatReport } from '@webcontextinterface/validator';
import type { WciSession } from './session';

/** What a tool hands back to the MCP layer. */
export interface ToolOutput {
  text: string;
  isError?: boolean;
}

export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  /** Advertises that the tool only reads, so clients can auto-approve it. */
  readOnly: boolean;
  handler: (args: Record<string, unknown>, session: WciSession) => Promise<ToolOutput>;
}

const json = (value: unknown): string => JSON.stringify(value, null, 2);

/** Turn a thrown error into a tool error rather than a transport failure. */
async function guard(run: () => Promise<ToolOutput>): Promise<ToolOutput> {
  try {
    return await run();
  } catch (err) {
    return { text: err instanceof Error ? err.message : String(err), isError: true };
  }
}

const actionEnum = z.enum(VALID_WCI_ACTIONS as unknown as [string, ...string[]]);

const actionRequestSchema = z.object({
  nodeId: z.string().describe('The data-wci-id of the target node, taken from a distilled view.'),
  action: actionEnum.describe('The action verb to dispatch.'),
  value: z.union([z.string(), z.number(), z.boolean()]).optional()
    .describe('Value for fill/select/check; omit for click, focus, submit.'),
});

// ─────────────────────────────────────────────────────────────────────────────

export const openPageTool: ToolDefinition = {
  name: 'wci_open_page',
  title: 'Open a page',
  description:
    'Load a URL into the WCI session so it can be distilled and acted on. ' +
    'Also loads the site policy from /wci.txt when present, which may restrict ' +
    'which scopes you are allowed to touch. Call this before any other tool.',
  readOnly: false,
  inputSchema: {
    url: z.string().describe('Absolute URL of the page to load.'),
  },
  handler: (args, session) => guard(async () => {
    const info = await session.open(String(args.url));
    return {
      text: json({
        ...info,
        next: info.nodeCount > 0
          ? 'Call wci_distil to see the actionable nodes.'
          : 'This page carries no data-wci-* annotations; wci_validate explains what is missing.',
      }),
    };
  }),
};

export const distilTool: ToolDefinition = {
  name: 'wci_distil',
  title: 'Distil the page',
  description:
    'Return the agent-facing view of the open page: every annotated node with ' +
    'its id, role, description, available action, and current state. This is ' +
    'a fraction of the tokens the raw HTML would cost.',
  readOnly: true,
  inputSchema: {
    format: z.enum(['json', 'markdown']).optional()
      .describe('json for tool-calling, markdown for reading. Default json.'),
    scope: z.string().optional()
      .describe('Restrict to one landmark scope id, e.g. "checkout".'),
    maxNodes: z.number().int().positive().optional().describe('Node ceiling. Default 128.'),
    maxTokens: z.number().int().positive().optional()
      .describe('Token budget; the lowest-priority nodes are dropped to fit.'),
    includeState: z.boolean().optional().describe('Include state snapshots. Default true.'),
  },
  handler: (args, session) => guard(async () => {
    const format = args.format === 'markdown' ? 'markdown' : 'json';
    const view = session.distil({
      scope: args.scope as string | undefined,
      maxNodes: args.maxNodes as number | undefined,
      maxTokens: args.maxTokens as number | undefined,
      includeState: args.includeState as boolean | undefined,
    });

    if (format === 'markdown') {
      return {
        text: serializeMarkdown(view.nodes, {
          pageTitle: view.page_title,
          scope: view.scope,
          scopeDesc: view.scope_desc,
          distilledAt: view.distilled_at,
        }),
      };
    }
    return { text: json(view) };
  }),
};

export const distilChangesTool: ToolDefinition = {
  name: 'wci_distil_changes',
  title: 'Distil only what changed',
  description:
    'Return the difference between the page now and the last time you distilled ' +
    'it — added, removed, and updated nodes only. Use this after an action ' +
    'instead of a full wci_distil; it costs tokens proportional to the change ' +
    'rather than to the page.',
  readOnly: true,
  inputSchema: {
    format: z.enum(['json', 'markdown']).optional().describe('Default json.'),
    scope: z.string().optional().describe('Restrict to one landmark scope id.'),
  },
  handler: (args, session) => guard(async () => {
    const result = session.distilChanges({ scope: args.scope as string | undefined });

    if (args.format === 'markdown') {
      return {
        text: 'kind' in result
          ? serializeDiffMarkdown(result)
          : serializeMarkdown(result.nodes, {
              pageTitle: result.page_title,
              scope: result.scope,
              distilledAt: result.distilled_at,
            }),
      };
    }
    return { text: json(result) };
  }),
};

export const actTool: ToolDefinition = {
  name: 'wci_act',
  title: 'Act on a node',
  description:
    'Dispatch one typed action against a node id from a distilled view. Returns ' +
    'a structured result: what changed on the target, what changed elsewhere on ' +
    'the page, and — on failure — a machine-readable error code plus a hint. ' +
    'Site policy is enforced here: denied scopes, auth, human confirmation, and ' +
    'rate limits all surface as errors rather than silent no-ops.',
  readOnly: false,
  inputSchema: {
    nodeId: z.string().describe('The data-wci-id of the target node.'),
    action: actionEnum.describe('The action verb to dispatch.'),
    value: z.union([z.string(), z.number(), z.boolean()]).optional()
      .describe('Value for fill/select/check; omit for click, focus, submit.'),
  },
  handler: (args, session) => guard(async () => {
    const result = await session.act({
      nodeId: String(args.nodeId),
      action: args.action as never,
      value: args.value as never,
    });
    return { text: json(result), isError: !result.success };
  }),
};

export const actSequenceTool: ToolDefinition = {
  name: 'wci_act_sequence',
  title: 'Act on several nodes',
  description:
    'Dispatch actions in order, stopping at the first failure. Use this for a ' +
    'known multi-field form — it saves a round trip per field. The returned ' +
    'array is shorter than the input when a step failed.',
  readOnly: false,
  inputSchema: {
    actions: z.array(actionRequestSchema).min(1)
      .describe('Actions to dispatch, in order.'),
  },
  handler: (args, session) => guard(async () => {
    const requests = (args.actions as unknown[]).map(a => {
      const parsed = actionRequestSchema.parse(a);
      return { nodeId: parsed.nodeId, action: parsed.action as never, value: parsed.value as never };
    });
    const results = await session.actSequence(requests);
    const failed = results.find(r => !r.success);
    return {
      text: json({
        completed: results.length,
        requested: requests.length,
        results,
        ...(failed ? { stoppedAt: failed.nodeId, reason: failed.error?.code } : {}),
      }),
      isError: Boolean(failed),
    };
  }),
};

export const siteContextTool: ToolDefinition = {
  name: 'wci_site_context',
  title: 'Read site policy and context',
  description:
    'Return the site-level grounding for the open page: the parsed wci.txt ' +
    'policy (denied scopes, auth requirements, rate limits), the wci.json ' +
    'manifest, and the wci.md narrative. Read this before acting on anything ' +
    'consequential — it tells you what the site permits.',
  readOnly: true,
  inputSchema: {},
  handler: (_args, session) => guard(async () => {
    session.requirePage();
    const ctx = session.getContext();
    return {
      text: json({
        policy: ctx.policy?.policy ?? null,
        manifest: ctx.manifest,
        narrative: ctx.narrative,
        note: ctx.policy
          ? 'Policy is enforced automatically on every wci_act call.'
          : 'This site publishes no wci.txt; no policy restrictions are in force.',
      }),
    };
  }),
};

export const validateTool: ToolDefinition = {
  name: 'wci_validate',
  title: 'Validate page annotations',
  description:
    'Lint the open page\'s data-wci-* markup and report problems: duplicate ids, ' +
    'actions on incompatible elements, scopes pointing at no landmark, malformed ' +
    'state JSON. Use it when a page seems to be missing nodes you expected, or ' +
    'when helping a developer annotate their site.',
  readOnly: true,
  inputSchema: {
    strict: z.boolean().optional().describe('Treat warnings as errors.'),
  },
  handler: (args, session) => guard(async () => {
    const page = session.requirePage();
    const report = validateMarkup(page.document.body ?? page.document, {
      strict: Boolean(args.strict),
    });
    return { text: formatReport(report, { color: false }) };
  }),
};

export const historyTool: ToolDefinition = {
  name: 'wci_history',
  title: 'Review actions taken',
  description:
    'Return every action dispatched against the current page, in order, with ' +
    'its result. Use it to check what has already been done before repeating ' +
    'a step, or to explain to the user what happened.',
  readOnly: true,
  inputSchema: {
    limit: z.number().int().positive().optional().describe('Return only the most recent N.'),
  },
  handler: (args, session) => guard(async () => {
    const all = session.history();
    const limit = args.limit as number | undefined;
    const shown = limit ? all.slice(-limit) : all;
    return { text: json({ total: all.length, actions: shown }) };
  }),
};

/** Every tool the server exposes. */
export const ALL_TOOLS: ToolDefinition[] = [
  openPageTool,
  distilTool,
  distilChangesTool,
  actTool,
  actSequenceTool,
  siteContextTool,
  validateTool,
  historyTool,
];
