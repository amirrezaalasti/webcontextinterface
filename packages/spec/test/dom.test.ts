import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_WCI_PRIORITY,
  escapeCssString,
  findAllWciElements,
  findWciElement,
  parseWciOptions,
  parseWciPriority,
  parseWciState,
  readWciNodeSpec,
  wciIdSelector,
} from '@webcontextinterface/spec';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

function el(html: string): HTMLElement {
  return mount(html).firstElementChild as HTMLElement;
}

describe('escapeCssString', () => {
  it('escapes quotes and backslashes', () => {
    expect(escapeCssString('a"b')).toBe('a\\"b');
    expect(escapeCssString('a\\b')).toBe('a\\\\b');
  });

  it('escapes newlines to a CSS hex escape', () => {
    expect(escapeCssString('a\nb')).toBe('a\\A b');
  });

  it('leaves ordinary ids untouched', () => {
    expect(escapeCssString('submit-btn')).toBe('submit-btn');
  });
});

describe('wciIdSelector / findWciElement', () => {
  it('finds a node by plain id', () => {
    const root = mount('<button data-wci-id="go">Go</button>');
    expect(findWciElement(root, 'go')?.textContent).toBe('Go');
  });

  it('does not break on an id containing a double quote', () => {
    const root = mount(`<button data-wci-id='say"hi'>Q</button><button data-wci-id="other">O</button>`);
    expect(findWciElement(root, 'say"hi')?.textContent).toBe('Q');
  });

  it('resists selector injection that would otherwise match a different node', () => {
    // Without escaping, this id closes the attribute selector early and the
    // remainder parses as `[data-wci-id="admin"]`, hitting the wrong button.
    const root = mount(
      '<button data-wci-id="safe">safe</button><button data-wci-id="admin">admin</button>',
    );
    const malicious = '"], [data-wci-id="admin';
    expect(() => findWciElement(root, malicious)).not.toThrow();
    expect(findWciElement(root, malicious)).toBeNull();
  });

  it('escapes ids inside generated selectors', () => {
    expect(wciIdSelector('a"b')).toBe('[data-wci-id="a\\"b"]');
  });

  it('findAllWciElements returns every duplicate', () => {
    const root = mount('<i data-wci-id="dup"></i><i data-wci-id="dup"></i>');
    expect(findAllWciElements(root, 'dup')).toHaveLength(2);
  });
});

describe('parseWciState', () => {
  it('parses a JSON object', () => {
    expect(parseWciState('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns {} for undefined, malformed, or non-object JSON', () => {
    expect(parseWciState(undefined)).toEqual({});
    expect(parseWciState('{oops')).toEqual({});
    expect(parseWciState('[1,2]')).toEqual({});
    expect(parseWciState('42')).toEqual({});
    expect(parseWciState('null')).toEqual({});
  });
});

describe('parseWciOptions', () => {
  it('parses a JSON array and stringifies members', () => {
    expect(parseWciOptions('["a","b"]')).toEqual(['a', 'b']);
    expect(parseWciOptions('[1,2]')).toEqual(['1', '2']);
  });

  it('accepts a comma-separated list', () => {
    expect(parseWciOptions('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('returns undefined for empty input', () => {
    expect(parseWciOptions(undefined)).toBeUndefined();
    expect(parseWciOptions('')).toBeUndefined();
    expect(parseWciOptions('  ,  ')).toBeUndefined();
  });
});

describe('parseWciPriority', () => {
  it('defaults when absent or unparseable', () => {
    expect(parseWciPriority(undefined)).toBe(DEFAULT_WCI_PRIORITY);
    expect(parseWciPriority('abc')).toBe(DEFAULT_WCI_PRIORITY);
    expect(parseWciPriority('')).toBe(DEFAULT_WCI_PRIORITY);
  });

  it('clamps into the 1..5 range', () => {
    expect(parseWciPriority('0')).toBe(1);
    expect(parseWciPriority('-7')).toBe(1);
    expect(parseWciPriority('99')).toBe(5);
    expect(parseWciPriority('2')).toBe(2);
  });

  it('never yields NaN, which would corrupt priority sorting', () => {
    expect(Number.isNaN(parseWciPriority('NaN'))).toBe(false);
  });
});

describe('readWciNodeSpec', () => {
  it('returns null when the element carries no id and no role', () => {
    expect(readWciNodeSpec(el('<div data-wci-desc="nope"></div>'))).toBeNull();
  });

  it('reads a fully annotated node', () => {
    const node = readWciNodeSpec(el(`
      <input data-wci-id="email" data-wci-role="form" data-wci-desc="Email"
             data-wci-action="fill" data-wci-required="true"
             data-wci-state='{"value":"","valid":null}'
             data-wci-options='["a","b"]' data-wci-emit="wci:email"
             data-wci-scope="signup" data-wci-priority="1"
             data-wci-precondition="form visible" />
    `))!;

    expect(node).toMatchObject({
      id: 'email',
      role: 'form',
      desc: 'Email',
      action: 'fill',
      required: true,
      options: ['a', 'b'],
      emits: 'wci:email',
      scope: 'signup',
      priority: 1,
      precondition: 'form visible',
    });
    expect(node.state).toEqual({ value: '', valid: null });
  });

  it('falls back to the element id, then to a generated id', () => {
    expect(readWciNodeSpec(el('<b id="native" data-wci-role="display"></b>'))!.id).toBe('native');

    // `el.id` is "" rather than nullish when unset, so a `??` chain here would
    // have produced an empty-string id that no selector can ever match.
    const generated = readWciNodeSpec(el('<b data-wci-role="display"></b>'))!;
    expect(generated.id).not.toBe('');
    expect(generated.id).toMatch(/^wci-anon-/);
  });

  it('generates distinct ids for distinct anonymous nodes', () => {
    const a = readWciNodeSpec(el('<b data-wci-role="display"></b>'))!.id;
    const b = readWciNodeSpec(el('<b data-wci-role="display"></b>'))!.id;
    expect(a).not.toBe(b);
  });

  it('falls back to trimmed text content for desc', () => {
    const node = readWciNodeSpec(el('<b data-wci-role="display">  Total: $9  </b>'))!;
    expect(node.desc).toBe('Total: $9');
  });

  it('truncates fallback desc at the configured length', () => {
    const node = readWciNodeSpec(
      el(`<b data-wci-role="display">${'x'.repeat(50)}</b>`),
      { maxFallbackDescLength: 10 },
    )!;
    expect(node.desc).toHaveLength(10);
  });

  it('downgrades an unknown role to display and warns', () => {
    const onWarn = vi.fn();
    const node = readWciNodeSpec(el('<b data-wci-id="x" data-wci-role="bogus"></b>'), { onWarn })!;
    expect(node.role).toBe('display');
    expect(onWarn).toHaveBeenCalledOnce();
    expect(onWarn.mock.calls[0][0]).toContain('bogus');
  });

  it('drops an unknown action and warns', () => {
    const onWarn = vi.fn();
    const node = readWciNodeSpec(el('<b data-wci-id="x" data-wci-action="teleport"></b>'), { onWarn })!;
    expect(node.action).toBeUndefined();
    expect(onWarn).toHaveBeenCalledOnce();
  });

  it('treats a bare boolean attribute as true', () => {
    const node = readWciNodeSpec(el('<input data-wci-id="x" data-wci-required />'))!;
    expect(node.required).toBe(true);
  });

  it('leaves boolean attributes undefined when absent', () => {
    const node = readWciNodeSpec(el('<input data-wci-id="x" />'))!;
    expect(node.required).toBeUndefined();
    expect(node.hidden).toBeUndefined();
  });

  it('falls back to console.warn when no handler is supplied', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    readWciNodeSpec(el('<b data-wci-id="x" data-wci-role="bogus"></b>'));
    expect(spy).toHaveBeenCalledOnce();
  });
});
