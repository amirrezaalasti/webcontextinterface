import { describe, it, expect } from 'vitest';
import {
  formatReport,
  formatReportGitHub,
  formatReportJSON,
  mergeReports,
  validateManifest,
  validateMarkup,
  validateWciTxt,
  type RuleId,
} from '@webcontextinterface/validator';

function lint(html: string, options = {}) {
  document.body.innerHTML = html;
  return validateMarkup(document.body, options);
}

function rules(html: string, options = {}): RuleId[] {
  return lint(html, options).issues.map(i => i.rule);
}

const GOOD = `
  <section data-wci-role="landmark" data-wci-id="signup" data-wci-desc="New user registration form">
    <input data-wci-id="email" data-wci-role="form" data-wci-desc="User's email address"
           data-wci-action="fill" data-wci-scope="signup" data-wci-state='{"value":""}'
           data-wci-priority="1" data-wci-required="true" />
    <button data-wci-id="go" data-wci-role="action" data-wci-desc="Submit the registration form"
            data-wci-action="click" data-wci-scope="signup" data-wci-priority="1">Go</button>
  </section>
`;

describe('validateMarkup — clean input', () => {
  it('passes well-formed markup with no issues', () => {
    const report = lint(GOOD);
    expect(report.issues).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.nodesChecked).toBe(3);
  });

  it('warns on a document with no annotations at all', () => {
    const report = lint('<div><p>plain page</p></div>');
    expect(report.issues.map(i => i.rule)).toEqual(['empty-document']);
    expect(report.nodesChecked).toBe(0);
  });
});

describe('validateMarkup — identity rules', () => {
  it('flags duplicate ids as errors', () => {
    const report = lint(`
      <button data-wci-id="dup" data-wci-role="action" data-wci-desc="First button here"></button>
      <button data-wci-id="dup" data-wci-role="action" data-wci-desc="Second button here"></button>
    `);
    const dup = report.issues.find(i => i.rule === 'duplicate-id')!;
    expect(dup.level).toBe('error');
    expect(dup.message).toContain('appears 2 times');
    expect(report.valid).toBe(false);
  });

  it('flags a role without an id', () => {
    expect(rules('<b data-wci-role="display">x</b>')).toContain('missing-id');
  });

  it('flags a landmark without an id', () => {
    expect(rules('<div data-wci-role="landmark" data-wci-desc="A bounded task zone"></div>'))
      .toContain('landmark-without-id');
  });
});

describe('validateMarkup — role and action rules', () => {
  it('rejects an unknown role', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="bogus" data-wci-desc="Some description"></b>')
      .issues.find(i => i.rule === 'invalid-role')!;
    expect(issue.level).toBe('error');
    expect(issue.hint).toContain('landmark');
  });

  it('rejects an unknown action', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="action" data-wci-desc="A description" data-wci-action="teleport"></b>'))
      .toContain('invalid-action');
  });

  it('warns when an action has no role', () => {
    expect(rules('<button data-wci-id="x" data-wci-desc="A button description" data-wci-action="click"></button>'))
      .toContain('action-without-role');
  });

  it.each([
    ['fill', '<div data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="fill"></div>'],
    ['select', '<input data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="select" />'],
    ['check', '<input type="text" data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="check" />'],
    ['upload', '<input type="text" data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="upload" />'],
    ['navigate', '<span data-wci-id="x" data-wci-role="nav" data-wci-desc="A description here" data-wci-action="navigate"></span>'],
    ['submit', '<button data-wci-id="x" data-wci-role="action" data-wci-desc="A description here" data-wci-action="submit"></button>'],
  ])('catches "%s" on the wrong element type', (_action, html) => {
    expect(rules(html)).toContain('action-element-mismatch');
  });

  it.each([
    ['fill on input', '<input data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="fill" />'],
    ['fill on textarea', '<textarea data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="fill"></textarea>'],
    ['check on checkbox', '<input type="checkbox" data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="check" />'],
    ['upload on file input', '<input type="file" data-wci-id="x" data-wci-role="form" data-wci-desc="A description here" data-wci-action="upload" />'],
    ['navigate on anchor', '<a href="/x" data-wci-id="x" data-wci-role="nav" data-wci-desc="A description here" data-wci-action="navigate"></a>'],
    ['submit inside form', '<form><button data-wci-id="x" data-wci-role="action" data-wci-desc="A description here" data-wci-action="submit"></button></form>'],
  ])('accepts "%s"', (_case, html) => {
    expect(rules(html)).not.toContain('action-element-mismatch');
  });
});

describe('validateMarkup — description rules', () => {
  it('warns when a description is absent', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="display"></b>')).toContain('missing-desc');
  });

  it('warns when a description is too short to disambiguate', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="display" data-wci-desc="ok"></b>'))
      .toContain('weak-desc');
  });

  it('honours a custom minimum description length', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="display" data-wci-desc="ok"></b>', { minDescLength: 1 }))
      .not.toContain('weak-desc');
  });
});

describe('validateMarkup — attribute value rules', () => {
  it('rejects malformed JSON state', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-state="{oops"></b>')
      .issues.find(i => i.rule === 'malformed-state')!;
    expect(issue.level).toBe('error');
    expect(issue.hint).toContain('single quotes');
  });

  it('rejects a non-object JSON state', () => {
    expect(rules(`<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-state='[1,2]'></b>`))
      .toContain('malformed-state');
  });

  it('accepts a well-formed state object', () => {
    expect(rules(`<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-state='{"a":1}'></b>`))
      .not.toContain('malformed-state');
  });

  it('warns on options that parse as neither JSON nor a list', () => {
    expect(rules('<select data-wci-id="x" data-wci-role="form" data-wci-desc="A description" data-wci-options="oops"></select>'))
      .toContain('malformed-options');
  });

  it('accepts a comma-separated option list', () => {
    expect(rules('<select data-wci-id="x" data-wci-role="form" data-wci-desc="A description" data-wci-options="a, b"></select>'))
      .not.toContain('malformed-options');
  });

  it('errors on a non-numeric priority', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-priority="high"></b>')
      .issues.find(i => i.rule === 'invalid-priority')!;
    expect(issue.level).toBe('error');
  });

  it('warns on an out-of-range priority that will be clamped', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-priority="9"></b>')
      .issues.find(i => i.rule === 'invalid-priority')!;
    expect(issue.level).toBe('warning');
    expect(issue.message).toContain('clamped');
  });

  it('flags an unknown data-wci-* attribute', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-colour="red"></b>')
      .issues.find(i => i.rule === 'unknown-attribute')!;
    expect(issue.message).toContain('data-wci-colour');
  });
});

describe('validateMarkup — cross-reference rules', () => {
  it('warns when a scope names no existing landmark', () => {
    const issue = lint('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-scope="ghost"></b>')
      .issues.find(i => i.rule === 'unknown-scope')!;
    expect(issue.message).toContain('ghost');
  });

  it('accepts a scope that matches a landmark', () => {
    expect(rules(GOOD)).not.toContain('unknown-scope');
  });

  it('notes a required flag on a non-form node', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-required="true"></b>'))
      .toContain('required-without-form-role');
  });

  it('notes options on an element that offers no choices', () => {
    expect(rules(`<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-options='["a"]'></b>`))
      .toContain('options-without-choice-element');
  });

  it('notes a precondition that will never be evaluated', () => {
    expect(rules('<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-precondition="must be logged in"></b>'))
      .toContain('precondition-without-action');
  });
});

describe('validateMarkup — options', () => {
  it('drops ignored rules from the report', () => {
    const report = lint('<b data-wci-id="x" data-wci-role="display"></b>', { ignore: ['missing-desc'] });
    expect(report.issues.map(i => i.rule)).not.toContain('missing-desc');
  });

  it('promotes warnings to errors in strict mode', () => {
    const report = lint('<b data-wci-id="x" data-wci-role="display"></b>', { strict: true });
    expect(report.issues.every(i => i.level === 'error')).toBe(true);
    expect(report.valid).toBe(false);
  });

  it('stays valid with warnings when not strict', () => {
    expect(lint('<b data-wci-id="x" data-wci-role="display"></b>').valid).toBe(true);
  });

  it('reports a locating path for node-less issues', () => {
    const issue = lint('<section><b data-wci-role="display">x</b></section>')
      .issues.find(i => i.rule === 'missing-id')!;
    expect(issue.path).toContain('nth-child');
  });
});

describe('validateWciTxt', () => {
  it('accepts a complete directive file', () => {
    const report = validateWciTxt(`
# comment
Site-Name: Shop
Site-Purpose: Sell things
Contact: ops@shop.com
Allow-Scope: search
Rate-Limit-Actions: 30
`);
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('warns on an unknown directive', () => {
    expect(validateWciTxt('Site-Nam: typo').issues.map(i => i.rule))
      .toContain('txt-unknown-directive');
  });

  it('warns on a line with no separator', () => {
    const issue = validateWciTxt('this is not a directive').issues
      .find(i => i.rule === 'txt-malformed-line')!;
    expect(issue.line).toBe(1);
  });

  it('errors on a non-numeric rate limit', () => {
    const issue = validateWciTxt('Rate-Limit-Actions: many').issues
      .find(i => i.rule === 'txt-invalid-number')!;
    expect(issue.level).toBe('error');
  });

  it('errors on a negative rate limit', () => {
    expect(validateWciTxt('Rate-Limit-Distil: -5').issues.map(i => i.rule))
      .toContain('txt-invalid-number');
  });

  it('warns when a scope is both allowed and denied', () => {
    const issue = validateWciTxt('Allow-Scope: admin\nDeny-Scope: admin').issues
      .find(i => i.rule === 'txt-conflicting-scope')!;
    expect(issue.message).toContain('deny wins');
  });

  it('notes absent recommended directives', () => {
    const notes = validateWciTxt('Allow-Scope: search').issues
      .filter(i => i.rule === 'txt-missing-recommended');
    expect(notes).toHaveLength(3);
  });

  it('ignores comments and blank lines', () => {
    expect(validateWciTxt('# just a comment\n\n   \n').issues.every(i => i.level === 'info')).toBe(true);
  });
});

describe('validateManifest', () => {
  const MINIMAL = {
    wci_version: '1.0',
    site: { name: 'Shop', base_url: 'https://shop.example', purpose: 'Sell things' },
    capabilities: { wci_supported: true },
  };

  it('accepts a minimal valid manifest', () => {
    expect(validateManifest(MINIMAL).valid).toBe(true);
  });

  it('accepts the manifest as raw JSON text', () => {
    expect(validateManifest(JSON.stringify(MINIMAL)).valid).toBe(true);
  });

  it('reports a JSON syntax error', () => {
    const issue = validateManifest('{not json').issues.find(i => i.rule === 'json-parse-error')!;
    expect(issue.level).toBe('error');
  });

  it('rejects a non-object root', () => {
    expect(validateManifest('[1,2]').issues.map(i => i.rule)).toContain('json-invalid-type');
  });

  it('reports each missing required field', () => {
    const missing = validateManifest({}).issues.filter(i => i.rule === 'json-missing-field');
    expect(missing.map(i => i.message).join()).toContain('wci_version');
    expect(missing.map(i => i.message).join()).toContain('site');
    expect(missing.map(i => i.message).join()).toContain('capabilities');
  });

  it('rejects a relative base_url', () => {
    const report = validateManifest({ ...MINIMAL, site: { ...MINIMAL.site, base_url: '/shop' } });
    expect(report.issues.some(i => i.message.includes('not an absolute URL'))).toBe(true);
  });

  it('requires wci_supported to be a boolean', () => {
    const report = validateManifest({ ...MINIMAL, capabilities: { wci_supported: 'yes' } });
    expect(report.issues.some(i => i.message.includes('must be a boolean'))).toBe(true);
  });

  it('rejects an unknown scope sensitivity', () => {
    const report = validateManifest({
      ...MINIMAL,
      scopes: [{ id: 'pay', desc: 'Payment', sensitivity: 'extreme' }],
    });
    expect(report.issues.map(i => i.rule)).toContain('json-invalid-sensitivity');
  });

  it('warns when a task flow names an undeclared scope', () => {
    const report = validateManifest({
      ...MINIMAL,
      scopes: [{ id: 'cart', desc: 'Cart' }],
      task_flows: [{ id: 'buy', description: 'Buy', steps: [{ scope: 'ghost', url_pattern: '/x' }] }],
    });
    expect(report.issues.map(i => i.rule)).toContain('json-unknown-scope-reference');
  });

  it('skips the cross-reference check when no scopes are declared', () => {
    const report = validateManifest({
      ...MINIMAL,
      task_flows: [{ id: 'buy', description: 'Buy', steps: [{ scope: 'anything', url_pattern: '/x' }] }],
    });
    expect(report.issues.map(i => i.rule)).not.toContain('json-unknown-scope-reference');
  });
});

describe('report formatting', () => {
  const dirty = () => lint('<b data-wci-role="display"></b>');

  it('reports a clean run plainly', () => {
    expect(formatReport(lint(GOOD))).toContain('No issues found');
  });

  it('renders level, message, and rule id', () => {
    const out = formatReport(dirty());
    expect(out).toContain('error');
    expect(out).toContain('missing-id');
    expect(out).toMatch(/\d+ error\(s\)/);
  });

  it('includes hints by default and omits them on request', () => {
    expect(formatReport(dirty())).toContain('→');
    expect(formatReport(dirty(), { hints: false })).not.toContain('→');
  });

  it('emits ANSI codes only when colour is requested', () => {
    expect(formatReport(dirty(), { color: true })).toContain('[');
    expect(formatReport(dirty())).not.toContain('[');
  });

  it('produces parseable JSON', () => {
    const parsed = JSON.parse(formatReportJSON(dirty()));
    expect(parsed.counts.error).toBeGreaterThan(0);
  });

  it('produces GitHub workflow commands', () => {
    const out = formatReportGitHub(dirty(), 'index.html');
    expect(out).toContain('::error ');
    expect(out).toContain('file=index.html');
    expect(out).toContain('title=WCI missing-id');
  });

  it('maps info issues to GitHub notices', () => {
    const report = validateWciTxt('Allow-Scope: x');
    expect(formatReportGitHub(report)).toContain('::notice ');
  });
});

describe('mergeReports', () => {
  it('sums counts and concatenates issues', () => {
    const merged = mergeReports(lint('<b data-wci-role="display"></b>'), validateWciTxt('bad line'));
    expect(merged.counts.error).toBeGreaterThan(0);
    expect(merged.counts.warning).toBeGreaterThan(0);
    expect(merged.valid).toBe(false);
  });

  it('stays valid when every input is valid', () => {
    expect(mergeReports(lint(GOOD), validateWciTxt('Site-Name: S\nSite-Purpose: P\nContact: c')).valid)
      .toBe(true);
  });
});

describe('project-specific attribute extensions', () => {
  const html = '<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-competitor="true"></b>';

  it('flags an undeclared extension attribute', () => {
    expect(rules(html)).toContain('unknown-attribute');
  });

  it('accepts an extension listed in allowAttributes', () => {
    expect(rules(html, { allowAttributes: ['data-wci-competitor'] }))
      .not.toContain('unknown-attribute');
  });

  it('still flags other unknown attributes when one is allowed', () => {
    const both = '<b data-wci-id="x" data-wci-role="display" data-wci-desc="A description" data-wci-competitor="true" data-wci-typo="1"></b>';
    const issue = lint(both, { allowAttributes: ['data-wci-competitor'] })
      .issues.find(i => i.rule === 'unknown-attribute')!;
    expect(issue.message).toContain('data-wci-typo');
  });
});
