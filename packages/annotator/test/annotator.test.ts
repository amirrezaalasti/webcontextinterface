import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyInferredAnnotations,
  inferAnnotations,
  inferView,
} from '@webcontextinterface/annotator';
import { validateMarkup } from '@webcontextinterface/validator';
import { WciDistiller } from '@webcontextinterface/distiller';

/** A plain, unannotated page of the kind WCI is meant to work on. */
const PLAIN = `
  <form id="checkout">
    <label for="email">Billing email</label>
    <input id="email" name="email" type="email" required value="" />

    <label>Card number <input name="card" type="text" /></label>

    <select id="ship" name="shipping" aria-label="Shipping speed">
      <option value="std">Standard</option>
      <option value="exp">Express</option>
    </select>

    <input type="checkbox" id="terms" name="terms" />
    <label for="terms">I accept the terms</label>

    <input type="file" id="receipt" name="receipt" aria-label="Upload receipt" />

    <button type="submit">Place Order</button>
    <button type="button">Cancel</button>
  </form>
  <nav aria-label="Site navigation">
    <a href="/help">Help centre</a>
    <a href="#top">Back to top</a>
  </nav>
  <div role="status" aria-live="polite">Order pending</div>
  <input type="hidden" name="csrf" value="abc" />
  <div aria-hidden="true"><button>Invisible</button></div>
`;

function mount(html = PLAIN): Document {
  document.title = 'Checkout';
  document.body.innerHTML = html;
  return document;
}

beforeEach(() => { mount(); });

const byId = (id: string) => inferAnnotations(document).nodes.find(n => n.id === id);

describe('role inference', () => {
  it('classifies native form controls as form nodes', () => {
    expect(byId('email')?.role).toBe('form');
    expect(byId('ship')?.role).toBe('form');
    expect(byId('terms')?.role).toBe('form');
  });

  it('classifies buttons as actions', () => {
    const nodes = inferAnnotations(document).nodes;
    expect(nodes.find(n => n.desc === 'Place Order')?.role).toBe('action');
    expect(nodes.find(n => n.desc === 'Cancel')?.role).toBe('action');
  });

  it('separates real navigation from in-page anchors', () => {
    const nodes = inferAnnotations(document).nodes;
    expect(nodes.find(n => n.desc === 'Help centre')?.role).toBe('nav');
    expect(nodes.find(n => n.desc === 'Back to top')?.role).toBe('action');
  });

  it('classifies forms and nav elements as landmarks', () => {
    expect(byId('checkout')?.role).toBe('landmark');
    expect(inferAnnotations(document).nodes.some(n => n.role === 'landmark' && n.desc.includes('Site navigation')))
      .toBe(true);
  });

  it('classifies aria-live regions as status', () => {
    expect(inferAnnotations(document).nodes.find(n => n.desc === 'Order pending')?.role).toBe('status');
  });
});

describe('accessible name derivation', () => {
  it('prefers aria-label', () => {
    const node = byId('ship')!;
    expect(node.desc).toBe('Shipping speed');
    expect(node.evidence).toContain('aria-label');
  });

  it('uses an associated label[for]', () => {
    const node = byId('email')!;
    expect(node.desc).toBe('Billing email');
    expect(node.evidence).toContain('label[for]');
  });

  it('uses a wrapping label, excluding the control\'s own value', () => {
    const node = inferAnnotations(document).nodes.find(n => n.desc === 'Card number')!;
    expect(node.evidence).toContain('wrapping-label');
  });

  it('falls back to text content for buttons', () => {
    const node = inferAnnotations(document).nodes.find(n => n.desc === 'Place Order')!;
    expect(node.evidence).toContain('text-content');
  });

  it('falls back to placeholder when nothing else names the field', () => {
    mount('<input placeholder="Search products" />');
    const node = inferAnnotations(document).nodes[0];
    expect(node.desc).toBe('Search products');
    expect(node.evidence).toContain('placeholder');
  });

  it('resolves aria-labelledby', () => {
    mount('<span id="lbl">Promo code</span><input aria-labelledby="lbl" />');
    const node = inferAnnotations(document).nodes.find(n => n.role === 'form')!;
    expect(node.desc).toBe('Promo code');
  });
});

describe('action inference', () => {
  it.each([
    ['email', 'fill'],
    ['ship', 'select'],
    ['terms', 'check'],
    ['receipt', 'upload'],
  ])('maps %s to the %s verb', (id, action) => {
    expect(byId(id)?.action).toBe(action);
  });

  it('maps buttons to click and links to navigate', () => {
    const nodes = inferAnnotations(document).nodes;
    expect(nodes.find(n => n.desc === 'Place Order')?.action).toBe('click');
    expect(nodes.find(n => n.desc === 'Help centre')?.action).toBe('navigate');
  });
});

describe('state and options', () => {
  it('captures input values and checkbox state', () => {
    expect(byId('email')?.state).toEqual({ value: '' });
    expect(byId('terms')?.state).toEqual({ checked: false });
  });

  it('never captures a password value', () => {
    mount('<input id="pw" type="password" value="hunter2" />');
    expect(JSON.stringify(byId('pw')?.state)).not.toContain('hunter2');
  });

  it('captures disabled state', () => {
    mount('<button id="b" disabled>Go</button>');
    expect(byId('b')?.state.disabled).toBe(true);
  });

  it('extracts select options', () => {
    expect(byId('ship')?.options).toEqual(['std', 'exp']);
  });

  it('extracts a radio group as an option set', () => {
    mount(`
      <input type="radio" id="r1" name="plan" value="free" />
      <input type="radio" id="r2" name="plan" value="pro" />
    `);
    expect(byId('r1')?.options).toEqual(['free', 'pro']);
  });

  it('marks required fields', () => {
    expect(byId('email')?.required).toBe(true);
  });
});

describe('scope inference', () => {
  it('scopes controls to their enclosing landmark', () => {
    expect(byId('email')?.scope).toBe('checkout');
    expect(byId('terms')?.scope).toBe('checkout');
  });

  it('leaves top-level nodes unscoped', () => {
    mount('<button>Lonely</button>');
    expect(inferAnnotations(document).nodes[0].scope).toBeUndefined();
  });
});

describe('priority inference', () => {
  it('ranks a submit button above a cancel button', () => {
    const nodes = inferAnnotations(document).nodes;
    const submit = nodes.find(n => n.desc === 'Place Order')!;
    const cancel = nodes.find(n => n.desc === 'Cancel')!;
    expect(submit.priority!).toBeLessThan(cancel.priority!);
  });

  it('ranks required fields above optional ones', () => {
    const required = byId('email')!;
    const optional = inferAnnotations(document).nodes.find(n => n.desc === 'Card number')!;
    expect(required.priority!).toBeLessThanOrEqual(optional.priority!);
  });

  it('ranks the primary action above navigation', () => {
    const nodes = inferAnnotations(document).nodes;
    const submit = nodes.find(n => n.desc === 'Place Order')!;
    const nav = nodes.find(n => n.desc === 'Help centre')!;
    expect(submit.priority!).toBeLessThan(nav.priority!);
  });

  it('returns nodes sorted by priority', () => {
    const priorities = inferAnnotations(document).nodes.map(n => n.priority!);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });
});

describe('exclusions', () => {
  it('skips hidden inputs', () => {
    expect(inferAnnotations(document).nodes.some(n => n.desc.includes('csrf'))).toBe(false);
  });

  it('skips aria-hidden subtrees', () => {
    expect(inferAnnotations(document).nodes.some(n => n.desc === 'Invisible')).toBe(false);
  });

  it('skips inline display:none', () => {
    mount('<button style="display: none">Gone</button>');
    expect(inferAnnotations(document).nodes).toHaveLength(0);
  });

  it('skips layout-only containers with no controls', () => {
    mount('<section><p>Just prose</p></section>');
    expect(inferAnnotations(document).nodes.some(n => n.role === 'landmark')).toBe(false);
  });

  it('counts what it skipped', () => {
    expect(inferAnnotations(document).skipped).toBeGreaterThan(0);
  });
});

describe('confidence scoring', () => {
  it('scores an aria-labelled native control highly', () => {
    expect(byId('ship')!.confidence).toBeGreaterThan(0.8);
  });

  it('scores an unnamed div-with-role low', () => {
    mount('<div role="button"></div>');
    expect(inferAnnotations(document).nodes[0].confidence).toBeLessThan(0.5);
  });

  it('ranks a labelled native button above an unnamed div', () => {
    mount('<button aria-label="Pay now">P</button><div role="button" onclick="x()"></div>');
    const [a, b] = inferAnnotations(document).nodes
      .sort((x, y) => y.confidence - x.confidence);
    expect(a.confidence).toBeGreaterThan(b.confidence);
  });

  it('reports a mean confidence for the page', () => {
    const report = inferAnnotations(document);
    expect(report.meanConfidence).toBeGreaterThan(0);
    expect(report.meanConfidence).toBeLessThanOrEqual(1);
  });

  it('generates unique ids even for unnamed elements', () => {
    mount('<div role="button"></div><div role="button"></div>');
    const ids = inferAnnotations(document).nodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('applyInferredAnnotations', () => {
  it('writes attributes the distiller reads back', () => {
    const result = applyInferredAnnotations(document);
    expect(result.annotated).toBeGreaterThan(0);

    const view = new WciDistiller().toView(document);
    expect(view.nodes.some(n => n.desc === 'Place Order' && n.action === 'click')).toBe(true);
    expect(view.nodes.find(n => n.id === 'email')?.scope).toBe('checkout');
  });

  it('produces markup the validator accepts', () => {
    applyInferredAnnotations(document);
    const report = validateMarkup(document.body, { ignore: ['weak-desc', 'missing-desc'] });
    expect(report.counts.error).toBe(0);
  });

  it('preserves existing annotations by default', () => {
    mount('<button data-wci-id="hand-written" data-wci-role="action" data-wci-desc="Curated description">Go</button>');
    const result = applyInferredAnnotations(document);
    expect(result.preserved).toBe(1);
    expect(document.querySelector('button')!.dataset.wciDesc).toBe('Curated description');
  });

  it('overwrites when preservation is disabled', () => {
    mount('<button data-wci-id="old" data-wci-role="action" data-wci-desc="Stale">Fresh label</button>');
    applyInferredAnnotations(document, { preserveExisting: false });
    expect(document.querySelector('button')!.dataset.wciDesc).toBe('Fresh label');
  });

  it('honours a confidence threshold', () => {
    mount('<button aria-label="Named">N</button><div role="button"></div>');
    const result = applyInferredAnnotations(document, { minConfidence: 0.6 });
    expect(result.belowThreshold).toBeGreaterThan(0);
    expect(document.querySelector('div')!.dataset.wciId).toBeUndefined();
  });
});

describe('inferView', () => {
  it('produces a WciView without touching the DOM', () => {
    const view = inferView(document);
    expect(view.page_title).toBe('Checkout');
    expect(view.node_count).toBe(view.nodes.length);
    expect(document.querySelector('#email')!.hasAttribute('data-wci-id')).toBe(false);
  });

  it('omits inference-only fields from the view', () => {
    const node = inferView(document).nodes[0] as unknown as Record<string, unknown>;
    expect(node.confidence).toBeUndefined();
    expect(node.evidence).toBeUndefined();
    expect(node.selector).toBeUndefined();
  });

  it('filters by confidence', () => {
    mount('<button aria-label="Named">N</button><div role="button"></div>');
    expect(inferView(document, { minConfidence: 0.6 }).nodes.length)
      .toBeLessThan(inferView(document).nodes.length);
  });

  it('returns an empty view for a page with nothing actionable', () => {
    mount('<p>Just prose, nothing to do here.</p>');
    expect(inferView(document).nodes).toHaveLength(0);
  });
});
