// ─────────────────────────────────────────────────────────────────────────────
// WCI CLI — site file templates for `wci init`
// ─────────────────────────────────────────────────────────────────────────────

export interface ScaffoldInput {
  siteName: string;
  baseUrl: string;
  purpose: string;
  contact: string;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export function wciTxtTemplate(input: ScaffoldInput): string {
  return `# WCI directives — https://webcontextinterface.vercel.app/
# Analogous to robots.txt, but for agents rather than crawlers.

Site-Name: ${input.siteName}
Site-Purpose: ${input.purpose}
Contact: ${input.contact}
WCI-Version: 1.0

Manifest: /wci.json
Context: /wci.md

# Scopes an agent may act in. Leave Allow-Scope out entirely to permit
# everything that is not explicitly denied.
# Allow-Scope: search, browse

# Scopes that are always off-limits.
Deny-Scope: admin

# Ceiling on agent traffic, per minute.
Rate-Limit-Actions: 60
Rate-Limit-Distil: 120

# Scopes that need a signed-in user.
# Auth-Required: checkout, account
# Auth-Method: oauth2
# Auth-Flow-Scope: login

# Scopes where the agent must get explicit human sign-off first.
# Require-Human-Confirmation: checkout, delete-account

Last-Updated: ${today()}
`;
}

export function wciJsonTemplate(input: ScaffoldInput): string {
  return `${JSON.stringify({
    wci_version: '1.0',
    site: {
      name: input.siteName,
      base_url: input.baseUrl,
      purpose: input.purpose,
      language: 'en',
      contact: input.contact,
    },
    capabilities: {
      wci_supported: true,
      server_side_distil: false,
      action_protocol_version: '1.0',
    },
    scopes: [
      {
        id: 'example-scope',
        desc: 'Replace with a real landmark id from your markup',
        url_pattern: '/*',
        sensitivity: 'low',
        key_actions: ['example-action'],
      },
    ],
    denied_scopes: ['admin'],
    rate_limits: {
      actions_per_minute: 60,
      distil_requests_per_minute: 120,
    },
    last_updated: today(),
  }, null, 2)}\n`;
}

export function wciMdTemplate(input: ScaffoldInput): string {
  return `# ${input.siteName} — agent context

${input.purpose}

This file is injected into an agent's system prompt before it acts on the site.
Write it for a model, not for a search engine: state what the site is for, which
tasks it supports, and where the sharp edges are.

## What agents can do here

- Describe each supported task in one line.
- Name the landmark scope that task lives in.

## What agents must not do

- List anything destructive, irreversible, or billable that needs a human.

## Conventions

- Every actionable element carries \`data-wci-id\` and \`data-wci-desc\`.
- Bounded task zones are marked \`data-wci-role="landmark"\`.
- Policy lives in [/wci.txt](${input.baseUrl}/wci.txt); the machine-readable
  manifest is [/wci.json](${input.baseUrl}/wci.json).

## Contact

${input.contact}
`;
}

export function annotatedHtmlExample(): string {
  return `<!-- WCI annotation example — copy the attribute pattern, not the markup -->
<section
  data-wci-role="landmark"
  data-wci-id="signup"
  data-wci-desc="New user registration — collects email and password">

  <input
    data-wci-id="signup-email"
    data-wci-role="form"
    data-wci-desc="Email address — must be unique across accounts"
    data-wci-action="fill"
    data-wci-required="true"
    data-wci-state='{"value":"","valid":null}'
    data-wci-scope="signup"
    data-wci-priority="1" />

  <button
    data-wci-id="signup-submit"
    data-wci-role="action"
    data-wci-desc="Create the account and sign the user in"
    data-wci-action="click"
    data-wci-precondition="Email must be valid and terms accepted"
    data-wci-scope="signup"
    data-wci-priority="1">Create account</button>

  <span
    data-wci-id="signup-status"
    data-wci-role="status"
    data-wci-desc="Registration result message"
    data-wci-state='{"text":"","kind":"idle"}'
    data-wci-scope="signup"
    data-wci-priority="2"></span>

</section>
`;
}
