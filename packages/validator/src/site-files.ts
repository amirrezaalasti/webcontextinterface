// ─────────────────────────────────────────────────────────────────────────────
// WCI Validator — wci.txt and wci.json rules
// ─────────────────────────────────────────────────────────────────────────────

import type { SiteManifest } from '@webcontextinterface/spec';
import { buildReport, type ValidateOptions, type ValidationIssue, type ValidationReport } from './types';

const KNOWN_DIRECTIVES = new Set([
  'Site-Name', 'Site-Purpose', 'Contact', 'WCI-Version', 'Manifest', 'Context',
  'Allow-Scope', 'Deny-Scope', 'Rate-Limit-Actions', 'Rate-Limit-Distil',
  'Auth-Required', 'Auth-Method', 'Auth-Flow-Scope', 'Require-Human-Confirmation',
  'Last-Updated',
]);

const NUMERIC_DIRECTIVES = new Set(['Rate-Limit-Actions', 'Rate-Limit-Distil']);

const RECOMMENDED_DIRECTIVES = ['Site-Name', 'Site-Purpose', 'Contact'];

const VALID_SENSITIVITIES = new Set(['low', 'medium', 'high', 'critical']);

/** Lint a wci.txt directive file. */
export function validateWciTxt(text: string, options: ValidateOptions = {}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const present = new Set<string>();
  const allowed = new Set<string>();
  const denied = new Set<string>();

  text.split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const lineNo = idx + 1;
    if (!line || line.startsWith('#')) return;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      issues.push({
        level: 'warning',
        rule: 'txt-malformed-line',
        line: lineNo,
        message: `Line ${lineNo} has no "Key: value" separator and is ignored.`,
        hint: 'Directives take the form "Key: value"; prefix comments with #.',
      });
      return;
    }

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    present.add(key);

    if (!KNOWN_DIRECTIVES.has(key)) {
      issues.push({
        level: 'warning',
        rule: 'txt-unknown-directive',
        line: lineNo,
        message: `Unknown directive "${key}".`,
        hint: `Known directives: ${[...KNOWN_DIRECTIVES].join(', ')}.`,
      });
      return;
    }

    if (NUMERIC_DIRECTIVES.has(key)) {
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n) || n < 0) {
        issues.push({
          level: 'error',
          rule: 'txt-invalid-number',
          line: lineNo,
          message: `${key} expects a non-negative integer, got "${value}".`,
          hint: 'The parser falls back to NaN here, which disables the limit entirely.',
        });
      }
    }

    const scopes = value.split(',').map(s => s.trim()).filter(Boolean);
    if (key === 'Allow-Scope') for (const s of scopes) allowed.add(s);
    if (key === 'Deny-Scope') for (const s of scopes) denied.add(s);
  });

  for (const scope of allowed) {
    if (denied.has(scope)) {
      issues.push({
        level: 'warning',
        rule: 'txt-conflicting-scope',
        message: `Scope "${scope}" is both allowed and denied; deny wins.`,
        hint: 'Remove one of the two directives to make the intent explicit.',
      });
    }
  }

  for (const key of RECOMMENDED_DIRECTIVES) {
    if (!present.has(key)) {
      issues.push({
        level: 'info',
        rule: 'txt-missing-recommended',
        message: `Recommended directive "${key}" is absent.`,
        hint: 'Agents surface these to users when explaining what a site does.',
      });
    }
  }

  return buildReport(issues, 0, options);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Lint a wci.json manifest, supplied as raw text or an already-parsed value. */
export function validateManifest(
  input: string | unknown,
  options: ValidateOptions = {},
): ValidationReport {
  const issues: ValidationIssue[] = [];
  let manifest: unknown = input;

  if (typeof input === 'string') {
    try {
      manifest = JSON.parse(input);
    } catch (err) {
      issues.push({
        level: 'error',
        rule: 'json-parse-error',
        message: `wci.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        hint: 'Run the file through a JSON formatter to locate the syntax error.',
      });
      return buildReport(issues, 0, options);
    }
  }

  if (!isPlainObject(manifest)) {
    issues.push({
      level: 'error',
      rule: 'json-invalid-type',
      message: 'wci.json must contain a JSON object at the top level.',
      hint: 'The manifest root is an object with "wci_version", "site", and "capabilities" keys.',
    });
    return buildReport(issues, 0, options);
  }

  const require = (path: string, value: unknown, hint: string): boolean => {
    if (value === undefined || value === null || value === '') {
      issues.push({ level: 'error', rule: 'json-missing-field', message: `Missing required field "${path}".`, hint });
      return false;
    }
    return true;
  };

  require('wci_version', manifest.wci_version, 'Set the spec version this manifest targets, e.g. "1.0".');

  if (require('site', manifest.site, 'The "site" object names and describes the site to agents.')) {
    if (isPlainObject(manifest.site)) {
      require('site.name', manifest.site.name, 'A human-readable site name.');
      require('site.base_url', manifest.site.base_url, 'The canonical origin, e.g. "https://example.com".');
      require('site.purpose', manifest.site.purpose, 'One sentence an agent can use to decide whether this site is relevant.');

      const baseUrl = manifest.site.base_url;
      if (typeof baseUrl === 'string' && baseUrl) {
        try {
          new URL(baseUrl);
        } catch {
          issues.push({
            level: 'error',
            rule: 'json-invalid-type',
            message: `site.base_url "${baseUrl}" is not an absolute URL.`,
            hint: 'Include the scheme, e.g. "https://example.com".',
          });
        }
      }
    } else {
      issues.push({
        level: 'error', rule: 'json-invalid-type',
        message: '"site" must be an object.',
        hint: 'See the specification for the manifest shape.',
      });
    }
  }

  if (require('capabilities', manifest.capabilities, 'Declares what the site supports, starting with "wci_supported".')) {
    if (isPlainObject(manifest.capabilities)) {
      if (typeof manifest.capabilities.wci_supported !== 'boolean') {
        issues.push({
          level: 'error', rule: 'json-invalid-type',
          message: 'capabilities.wci_supported must be a boolean.',
          hint: 'Set it to true once the site ships data-wci-* markup.',
        });
      }
    }
  }

  // Cross-reference scopes named by task flows against declared scopes.
  const m = manifest as unknown as SiteManifest;
  const declaredScopes = new Set((m.scopes ?? []).map(s => s.id));

  for (const scope of m.scopes ?? []) {
    if (scope.sensitivity && !VALID_SENSITIVITIES.has(scope.sensitivity)) {
      issues.push({
        level: 'error',
        rule: 'json-invalid-sensitivity',
        message: `Scope "${scope.id}" has unknown sensitivity "${scope.sensitivity}".`,
        hint: `Valid values: ${[...VALID_SENSITIVITIES].join(', ')}.`,
      });
    }
  }

  for (const flow of m.task_flows ?? []) {
    for (const step of flow.steps ?? []) {
      if (declaredScopes.size > 0 && !declaredScopes.has(step.scope)) {
        issues.push({
          level: 'warning',
          rule: 'json-unknown-scope-reference',
          message: `Task flow "${flow.id}" references undeclared scope "${step.scope}".`,
          hint: 'Add the scope to the top-level "scopes" array so agents can look up its sensitivity.',
        });
      }
    }
  }

  return buildReport(issues, 0, options);
}
