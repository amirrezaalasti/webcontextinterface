import { describe, it, expect, beforeEach } from 'vitest';
import type { WciView } from '@webcontextinterface/spec';
import {
  WciDistiller,
  WciDistillerSession,
  chooseCheaperPayload,
  diffViews,
  escapeTableCell,
  estimateTokens,
  pruneDOM,
  serializeDiffMarkdown,
  serializeJSON,
  serializeMarkdown,
} from '@webcontextinterface/distiller';

const PAGE = `
  <section data-wci-role="landmark" data-wci-id="signup" data-wci-desc="Sign-up form">
    <input data-wci-id="email" data-wci-role="form" data-wci-desc="Email address"
           data-wci-action="fill" data-wci-required="true" data-wci-scope="signup"
           data-wci-priority="1" data-wci-state='{"value":""}' />
    <input data-wci-id="nickname" data-wci-role="form" data-wci-desc="Nickname"
           data-wci-action="fill" data-wci-scope="signup" data-wci-priority="4" />
    <button data-wci-id="submit" data-wci-role="action" data-wci-desc="Create account"
            data-wci-action="click" data-wci-scope="signup" data-wci-priority="1">Go</button>
    <span data-wci-id="hint" data-wci-role="display" data-wci-desc="Helper text"
          data-wci-scope="signup" data-wci-priority="5">Use a work email</span>
    <span data-wci-id="secret" data-wci-role="display" data-wci-hidden="true"
          data-wci-scope="signup">hidden</span>
  </section>
  <a data-wci-id="home" data-wci-role="nav" data-wci-desc="Home" href="/">Home</a>
`;

function mount(html = PAGE): void {
  document.title = 'Test Page';
  document.body.innerHTML = html;
}

beforeEach(() => mount());

describe('pruneDOM', () => {
  it('collects every non-hidden WCI node', () => {
    const ids = pruneDOM(document.body).map(n => n.id);
    expect(ids).toContain('email');
    expect(ids).toContain('home');
    expect(ids).not.toContain('secret');
  });

  it('includes hidden nodes when asked', () => {
    expect(pruneDOM(document.body, { includeHidden: true }).map(n => n.id)).toContain('secret');
  });

  it('includes the root element itself when it carries markup', () => {
    const root = document.querySelector('[data-wci-id="signup"]') as HTMLElement;
    expect(pruneDOM(root).map(n => n.id)).toContain('signup');
  });

  it('sorts by priority ascending', () => {
    const priorities = pruneDOM(document.body).map(n => n.priority);
    expect([...priorities].sort((a, b) => a! - b!)).toEqual(priorities);
  });

  it('keeps document order within one priority band', () => {
    const p1 = pruneDOM(document.body).filter(n => n.priority === 1).map(n => n.id);
    expect(p1).toEqual(['email', 'submit']);
  });

  it('filters by scope, matching members and the landmark itself', () => {
    const ids = pruneDOM(document.body, { scope: 'signup' }).map(n => n.id);
    expect(ids).toContain('signup');
    expect(ids).toContain('email');
    expect(ids).not.toContain('home');
  });

  it('filters by role', () => {
    const roles = pruneDOM(document.body, { roles: ['action'] }).map(n => n.role);
    expect(roles).toEqual(['action']);
  });

  it('filters by maxPriority', () => {
    const ids = pruneDOM(document.body, { maxPriority: 1 }).map(n => n.id);
    expect(ids).toEqual(['email', 'submit']);
  });

  it('caps at maxNodes, keeping the highest-priority nodes', () => {
    const nodes = pruneDOM(document.body, { maxNodes: 2 });
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => n.priority === 1)).toBe(true);
  });

  it('returns an empty list for maxNodes: 0', () => {
    expect(pruneDOM(document.body, { maxNodes: 0 })).toEqual([]);
  });
});

describe('WciDistiller', () => {
  it('produces a structured view', () => {
    const view = new WciDistiller().toView(document);
    expect(view.page_title).toBe('Test Page');
    expect(view.wci_version).toBe('1.0');
    expect(view.node_count).toBe(view.nodes.length);
  });

  it('attaches scope metadata from the landmark description', () => {
    const view = new WciDistiller({ scope: 'signup' }).toView(document);
    expect(view.scope).toBe('signup');
    expect(view.scope_desc).toBe('Sign-up form');
  });

  it('does not break when the scope id contains selector syntax', () => {
    mount('<div data-wci-role="landmark" data-wci-id=\'a"b\' data-wci-desc="Quoted"></div>');
    expect(() => new WciDistiller({ scope: 'a"b' }).toView(document)).not.toThrow();
    expect(new WciDistiller({ scope: 'a"b' }).toView(document).scope_desc).toBe('Quoted');
  });

  it('strips state when includeState is false', () => {
    const view = new WciDistiller({ includeState: false }).toView(document);
    expect(view.nodes.every(n => Object.keys(n.state).length === 0)).toBe(true);
  });

  it('compacts no-information fields by default', () => {
    const node = new WciDistiller().toView(document).nodes.find(n => n.id === 'nickname')!;
    expect(node).not.toHaveProperty('required');
    expect(node).not.toHaveProperty('hidden');
    expect(node.state).toEqual({});
  });

  it('keeps default-valued fields when compact is off', () => {
    const node = new WciDistiller({ compact: false }).toView(document).nodes.find(n => n.id === 'hint')!;
    expect(node).toHaveProperty('hidden');
  });

  it('distilJSON returns parseable pretty JSON', () => {
    const parsed = JSON.parse(new WciDistiller().distilJSON(document)) as WciView;
    expect(parsed.nodes.length).toBeGreaterThan(0);
  });

  it('distilMarkdown renders both tables', () => {
    const md = new WciDistiller().distilMarkdown(document);
    expect(md).toContain('### Actionable Nodes');
    expect(md).toContain('### Status & Display Nodes');
    expect(md).toContain('`email`');
  });

  it('distil() honours the configured format', () => {
    expect(typeof new WciDistiller({ format: 'markdown' }).distil(document)).toBe('string');
    expect(typeof new WciDistiller({ format: 'json' }).distil(document)).toBe('object');
  });

  it('leaves the configured format unchanged after a one-off call', () => {
    const d = new WciDistiller({ format: 'markdown' });
    d.distilJSON(document);
    expect(typeof d.distil(document)).toBe('string');
  });

  it('accepts an Element root and reads its description as the title', () => {
    const root = document.querySelector('[data-wci-id="signup"]') as HTMLElement;
    expect(new WciDistiller().toView(root).page_title).toBe('Sign-up form');
  });

  describe('token budget', () => {
    it('drops the lowest-priority nodes until the view fits', () => {
      const full = new WciDistiller().toView(document);
      const fullTokens = estimateTokens(JSON.stringify(full));

      const d = new WciDistiller({ maxTokens: Math.floor(fullTokens / 2) });
      const trimmed = d.toView(document);

      expect(trimmed.nodes.length).toBeLessThan(full.nodes.length);
      expect(estimateTokens(JSON.stringify(trimmed))).toBeLessThanOrEqual(Math.floor(fullTokens / 2));
      expect(d.getStats().droppedForBudget).toBeGreaterThan(0);
    });

    it('keeps the highest-priority nodes when trimming', () => {
      const full = new WciDistiller().toView(document);
      const budget = Math.floor(estimateTokens(JSON.stringify(full)) * 0.6);
      const kept = new WciDistiller({ maxTokens: budget }).toView(document).nodes;
      const keptMax = Math.max(...kept.map(n => n.priority ?? 3));
      const droppedMin = Math.min(
        ...full.nodes.filter(n => !kept.some(k => k.id === n.id)).map(n => n.priority ?? 3),
      );
      expect(keptMax).toBeLessThanOrEqual(droppedMin);
    });

    it('leaves the view untouched when it already fits', () => {
      const d = new WciDistiller({ maxTokens: 100_000 });
      const view = d.toView(document);
      expect(d.getStats().droppedForBudget).toBe(0);
      expect(view.nodes.length).toBeGreaterThan(0);
    });

    it('applies the budget to markdown output too', () => {
      const d = new WciDistiller({ format: 'markdown', maxTokens: 40 });
      expect(estimateTokens(d.distilMarkdown(document))).toBeLessThanOrEqual(40);
    });

    it('reports estimated tokens in stats', () => {
      const d = new WciDistiller();
      d.toView(document);
      expect(d.getStats().estimatedTokens).toBeGreaterThan(0);
      expect(d.getStats().nodeCount).toBeGreaterThan(0);
    });
  });
});

describe('serializeMarkdown escaping', () => {
  it('escapes pipes so a description cannot forge extra table columns', () => {
    expect(escapeTableCell('a | b')).toBe('a \\| b');
    expect(escapeTableCell('line1\nline2')).toBe('line1 line2');
  });

  it('keeps the column count stable for a piped description', () => {
    mount('<button data-wci-id="x" data-wci-role="action" data-wci-desc="Pay | Now"></button>');
    const row = new WciDistiller().distilMarkdown(document)
      .split('\n')
      .find(l => l.includes('`x`'))!;
    // 6 columns → 7 pipes; an unescaped pipe in desc would make 8.
    expect(row.match(/(?<!\\)\|/g)).toHaveLength(7);
  });
});

describe('serializeJSON', () => {
  it('honours a fixed distilledAt for deterministic output', () => {
    const at = '2020-01-01T00:00:00.000Z';
    expect(serializeJSON([], { pageTitle: 'p', distilledAt: at }).distilled_at).toBe(at);
  });

  it('omits absent optional keys when compacting', () => {
    const view = serializeJSON([], { pageTitle: 'p' }, { compact: true });
    expect(view).not.toHaveProperty('scope');
    expect(view).not.toHaveProperty('site_context');
  });
});

describe('serializeMarkdown site context', () => {
  it('renders the site header block', () => {
    const md = serializeMarkdown([], {
      pageTitle: 'p',
      siteContext: {
        name: 'Shop',
        purpose: 'Retail',
        auth_required_for: ['checkout'],
        denied_scopes: ['admin'],
        active_task_flow: 'buy',
        current_step: 2,
      },
    });
    expect(md).toContain('**Site:** Shop — Retail');
    expect(md).toContain('**Denied scopes:** admin');
    expect(md).toContain('**Auth required for:** checkout');
    expect(md).toContain('(step 2)');
  });

  it('renders precondition warnings', () => {
    const md = serializeMarkdown(
      [{ id: 'x', role: 'action', desc: 'd', state: {}, precondition: 'must be valid' }],
      { pageTitle: 'p' },
    );
    expect(md).toContain('⚠️ **Precondition on `x`:** must be valid');
  });
});

describe('diffViews', () => {
  const view = (nodes: WciView['nodes'], at = '2020-01-01T00:00:00.000Z'): WciView => ({
    wci_version: '1.0', page_title: 'p', distilled_at: at, node_count: nodes.length, nodes,
  });

  it('reports an unchanged diff for identical views', () => {
    const a = view([{ id: 'x', role: 'action', desc: 'd', state: {} }]);
    expect(diffViews(a, a).unchanged).toBe(true);
  });

  it('detects added nodes', () => {
    const d = diffViews(view([]), view([{ id: 'x', role: 'action', desc: 'd', state: {} }]));
    expect(d.added.map(n => n.id)).toEqual(['x']);
    expect(d.unchanged).toBe(false);
  });

  it('detects removed nodes', () => {
    const d = diffViews(view([{ id: 'x', role: 'action', desc: 'd', state: {} }]), view([]));
    expect(d.removed).toEqual(['x']);
  });

  it('reports only the fields that changed, with previous values', () => {
    const d = diffViews(
      view([{ id: 'x', role: 'form', desc: 'same', state: { value: '' } }]),
      view([{ id: 'x', role: 'form', desc: 'same', state: { value: 'a@b.c' } }]),
    );
    expect(d.updated).toHaveLength(1);
    expect(Object.keys(d.updated[0].changed)).toEqual(['state']);
    expect(d.updated[0].previous.state).toEqual({ value: '' });
    expect(d.updated[0].changed.state).toEqual({ value: 'a@b.c' });
  });

  it('compares nested state structurally, not by reference', () => {
    const d = diffViews(
      view([{ id: 'x', role: 'form', desc: 'd', state: { a: { b: 1 } } }]),
      view([{ id: 'x', role: 'form', desc: 'd', state: { a: { b: 1 } } }]),
    );
    expect(d.unchanged).toBe(true);
  });

  it('treats a field going undefined as a change', () => {
    const d = diffViews(
      view([{ id: 'x', role: 'form', desc: 'd', state: {}, action: 'fill' }]),
      view([{ id: 'x', role: 'form', desc: 'd', state: {} }]),
    );
    expect(Object.keys(d.updated[0].changed)).toEqual(['action']);
  });

  it('renders a readable markdown summary', () => {
    const d = diffViews(
      view([{ id: 'gone', role: 'action', desc: 'd', state: {} }]),
      view([{ id: 'fresh', role: 'action', desc: 'New', state: {} }]),
    );
    const md = serializeDiffMarkdown(d);
    expect(md).toContain('**Added**');
    expect(md).toContain('`fresh`');
    expect(md).toContain('**Removed**');
  });

  it('says so plainly when nothing changed', () => {
    const a = view([]);
    expect(serializeDiffMarkdown(diffViews(a, a))).toContain('No changes');
  });
});

describe('chooseCheaperPayload', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    id: `n${i}`, role: 'display' as const, desc: `Node number ${i} with a fairly long description`, state: {},
  }));

  it('prefers a diff when one field moved on a large page', () => {
    const before: WciView = {
      wci_version: '1.0', page_title: 'p', distilled_at: 'a', node_count: many.length, nodes: many,
    };
    const after: WciView = {
      ...before,
      distilled_at: 'b',
      nodes: many.map((n, i) => (i === 0 ? { ...n, state: { hit: true } } : n)),
    };
    const chosen = chooseCheaperPayload(before, after);
    expect(chosen.kind).toBe('diff');
    expect(chosen.savedTokens).toBeGreaterThan(0);
  });

  it('falls back to the full view when the page changed wholesale', () => {
    const before: WciView = {
      wci_version: '1.0', page_title: 'p', distilled_at: 'a', node_count: many.length, nodes: many,
    };
    const after: WciView = {
      ...before,
      distilled_at: 'b',
      nodes: many.map(n => ({ ...n, desc: `${n.desc} — completely rewritten copy here` })),
    };
    expect(chooseCheaperPayload(before, after).kind).toBe('full');
  });
});

describe('WciDistillerSession', () => {
  it('returns a full view first, then diffs', () => {
    const s = new WciDistillerSession();
    const first = s.next(document);
    expect('nodes' in first).toBe(true);

    (document.querySelector('[data-wci-id="email"]') as HTMLElement)
      .dataset.wciState = '{"value":"a@b.c"}';

    const second = s.next(document);
    expect('kind' in second && second.kind).toBe('diff');
    if ('updated' in second) {
      expect(second.updated.map(u => u.id)).toEqual(['email']);
    }
  });

  it('reports an unchanged diff when the DOM is stable', () => {
    const s = new WciDistillerSession();
    s.start(document);
    const d = s.next(document);
    expect('unchanged' in d && d.unchanged).toBe(true);
  });

  it('reset() restores full-view output', () => {
    const s = new WciDistillerSession();
    s.start(document);
    s.reset();
    expect('nodes' in s.next(document)).toBe(true);
  });

  it('nextCheapest reports which payload it chose', () => {
    const s = new WciDistillerSession();
    expect(s.nextCheapest(document).kind).toBe('full');
    expect(['full', 'diff']).toContain(s.nextCheapest(document).kind);
  });
});

describe('estimateTokens', () => {
  it('is zero for empty input and grows with length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('x'.repeat(370))).toBeGreaterThan(estimateTokens('x'.repeat(37)));
  });
});
