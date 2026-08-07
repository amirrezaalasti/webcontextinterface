import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyEngine } from '@webcontextinterface/context';
import type { WciPolicy } from '@webcontextinterface/spec';
import {
  WciBridge,
  dispatchAction,
  checkPolicyBeforeDispatch,
  resolveScopeId,
} from '@webcontextinterface/bridge';

const FORM = `
  <form data-wci-role="landmark" data-wci-id="signup" data-wci-desc="Sign up">
    <input data-wci-id="email" data-wci-role="form" data-wci-action="fill"
           data-wci-scope="signup" data-wci-state='{"value":""}' />
    <textarea data-wci-id="bio" data-wci-role="form" data-wci-action="fill"
              data-wci-scope="signup"></textarea>
    <select data-wci-id="plan" data-wci-role="form" data-wci-action="select" data-wci-scope="signup">
      <option value="free">Free</option>
      <option value="pro">Pro</option>
    </select>
    <input type="checkbox" data-wci-id="terms" data-wci-role="form"
           data-wci-action="check" data-wci-scope="signup" />
    <input type="file" data-wci-id="avatar" data-wci-role="form"
           data-wci-action="upload" data-wci-scope="signup" />
    <button type="button" data-wci-id="submit" data-wci-role="action"
            data-wci-action="click" data-wci-scope="signup"
            data-wci-emit="wci:submitted">Go</button>
    <button type="button" data-wci-id="blocked" data-wci-role="action"
            data-wci-action="click" data-wci-scope="signup"
            data-wci-precondition="Terms must be accepted" disabled>Blocked</button>
    <span data-wci-id="status" data-wci-role="status" data-wci-scope="signup"
          data-wci-state='{"text":"idle"}'></span>
  </form>
`;

function mount(html = FORM): void {
  document.body.innerHTML = html;
}

function policyOf(overrides: Partial<WciPolicy> = {}): PolicyEngine {
  return new PolicyEngine({
    allowedScopes: [], deniedScopes: [], rateLimitActions: 60, rateLimitDistil: 120,
    authRequired: [], requireHumanConfirmation: [], ...overrides,
  });
}

beforeEach(() => mount());

describe('dispatchAction — lookup and guards', () => {
  it('returns NODE_NOT_FOUND for a missing node', async () => {
    const r = await dispatchAction({ nodeId: 'ghost', action: 'click' });
    expect(r.success).toBe(false);
    expect(r.error?.code).toBe('NODE_NOT_FOUND');
  });

  it('does not let a crafted node id select a different element', async () => {
    // Unescaped, this id would close the selector and match `submit`.
    const r = await dispatchAction({ nodeId: '"], [data-wci-id="submit', action: 'click' });
    expect(r.success).toBe(false);
    expect(r.error?.code).toBe('NODE_NOT_FOUND');
    expect(document.querySelector('[data-wci-id="submit"]')!.getAttribute('data-wci-state')).toBeNull();
  });

  it('blocks a disabled node that declares a precondition', async () => {
    const r = await dispatchAction({ nodeId: 'blocked', action: 'click' });
    expect(r.error?.code).toBe('PRECONDITION_UNMET');
    expect(r.error?.message).toContain('Terms must be accepted');
  });

  it('blocks on aria-disabled too', async () => {
    mount('<button data-wci-id="b" data-wci-precondition="nope" aria-disabled="true"></button>');
    expect((await dispatchAction({ nodeId: 'b', action: 'click' })).error?.code)
      .toBe('PRECONDITION_UNMET');
  });

  it('allows a disabled node that declares no precondition', async () => {
    mount('<button data-wci-id="b" data-wci-role="action" disabled></button>');
    expect((await dispatchAction({ nodeId: 'b', action: 'click' })).success).toBe(true);
  });
});

describe('dispatchAction — actions', () => {
  it('fills an input and fires input + change', async () => {
    const input = document.querySelector<HTMLInputElement>('[data-wci-id="email"]')!;
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));

    const r = await dispatchAction({ nodeId: 'email', action: 'fill', value: 'a@b.c' });
    expect(r.success).toBe(true);
    expect(input.value).toBe('a@b.c');
    expect(events).toEqual(['input', 'change']);
    expect(r.stateChange).toEqual({ before: { value: '' }, after: { value: 'a@b.c' } });
  });

  it('fills a textarea', async () => {
    await dispatchAction({ nodeId: 'bio', action: 'fill', value: 'hello' });
    expect(document.querySelector<HTMLTextAreaElement>('[data-wci-id="bio"]')!.value).toBe('hello');
  });

  it('rejects fill on a non-input with ACTION_NOT_SUPPORTED', async () => {
    const r = await dispatchAction({ nodeId: 'submit', action: 'fill', value: 'x' });
    expect(r.success).toBe(false);
    expect(r.error?.code).toBe('ACTION_NOT_SUPPORTED');
  });

  it('selects a valid option', async () => {
    const r = await dispatchAction({ nodeId: 'plan', action: 'select', value: 'pro' });
    expect(r.success).toBe(true);
    expect(document.querySelector<HTMLSelectElement>('[data-wci-id="plan"]')!.value).toBe('pro');
  });

  it('rejects an option that does not exist and lists the valid ones', async () => {
    const r = await dispatchAction({ nodeId: 'plan', action: 'select', value: 'enterprise' });
    expect(r.success).toBe(false);
    expect(r.error?.code).toBe('VALIDATION_FAILED');
    expect(r.error?.message).toContain('free, pro');
  });

  it('checks and unchecks a checkbox', async () => {
    await dispatchAction({ nodeId: 'terms', action: 'check' });
    const box = document.querySelector<HTMLInputElement>('[data-wci-id="terms"]')!;
    expect(box.checked).toBe(true);

    const r = await dispatchAction({ nodeId: 'terms', action: 'check', value: false });
    expect(box.checked).toBe(false);
    expect(r.stateChange?.after).toEqual({ checked: false });
  });

  it('clicking a checkbox records the resulting checked state', async () => {
    const r = await dispatchAction({ nodeId: 'terms', action: 'click' });
    expect(r.stateChange?.after).toEqual({ checked: true });
  });

  it('clears an input', async () => {
    await dispatchAction({ nodeId: 'email', action: 'fill', value: 'x' });
    const r = await dispatchAction({ nodeId: 'email', action: 'clear' });
    expect(document.querySelector<HTMLInputElement>('[data-wci-id="email"]')!.value).toBe('');
    expect(r.stateChange?.after).toEqual({ value: '' });
  });

  it('focuses a node', async () => {
    const r = await dispatchAction({ nodeId: 'email', action: 'focus' });
    expect(r.success).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-wci-id="email"]'));
  });

  it('submits the containing form', async () => {
    const form = document.querySelector('form')!;
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onSubmit);

    const r = await dispatchAction({ nodeId: 'email', action: 'submit' });
    expect(r.success).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('fails to submit when no form ancestor exists', async () => {
    mount('<button data-wci-id="lonely" data-wci-role="action"></button>');
    const r = await dispatchAction({ nodeId: 'lonely', action: 'submit' });
    expect(r.error?.code).toBe('ACTION_NOT_SUPPORTED');
    expect(r.error?.message).toContain('No form ancestor');
  });

  it('navigates without throwing where navigation is unavailable', async () => {
    mount('<a data-wci-id="link" data-wci-role="nav" href="/next">Next</a>');
    const r = await dispatchAction({ nodeId: 'link', action: 'navigate' });
    expect(r.success).toBe(true);
    expect(r.stateChange?.after).toEqual({ navigating: '/next' });
  });

  it('fails navigation with no href and no value', async () => {
    mount('<a data-wci-id="link" data-wci-role="nav">Next</a>');
    expect((await dispatchAction({ nodeId: 'link', action: 'navigate' })).error?.code)
      .toBe('VALIDATION_FAILED');
  });

  it('uploads files described as plain objects', async () => {
    const r = await dispatchAction({
      nodeId: 'avatar',
      action: 'upload',
      value: { name: 'cv.txt', content: 'hello', type: 'text/plain' },
    });
    expect(r.success).toBe(true);
    const input = document.querySelector<HTMLInputElement>('[data-wci-id="avatar"]')!;
    expect(input.files).toHaveLength(1);
    expect(input.files![0].name).toBe('cv.txt');
    expect(r.stateChange?.after).toEqual({ files: ['cv.txt'] });
  });

  it('uploads multiple files', async () => {
    const r = await dispatchAction({
      nodeId: 'avatar',
      action: 'upload',
      value: [{ name: 'a.txt' }, { name: 'b.txt' }],
    });
    expect(r.stateChange?.after).toEqual({ files: ['a.txt', 'b.txt'] });
  });

  it('rejects upload on a non-file input', async () => {
    const r = await dispatchAction({ nodeId: 'email', action: 'upload', value: { name: 'a' } });
    expect(r.error?.code).toBe('ACTION_NOT_SUPPORTED');
  });

  it('rejects an unusable upload payload', async () => {
    const r = await dispatchAction({ nodeId: 'avatar', action: 'upload', value: 42 });
    expect(r.error?.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an unknown action verb', async () => {
    const r = await dispatchAction({ nodeId: 'submit', action: 'teleport' as never });
    expect(r.error?.code).toBe('ACTION_NOT_SUPPORTED');
    expect(r.error?.message).toContain('Unknown action');
  });
});

describe('dispatchAction — events and side effects', () => {
  it('fires the node\'s custom emit event', async () => {
    const seen = vi.fn();
    document.addEventListener('wci:submitted', seen);
    await dispatchAction({ nodeId: 'submit', action: 'click' });
    expect(seen).toHaveBeenCalledOnce();
  });

  it('fires the generic wci:state-change bus event', async () => {
    const seen = vi.fn();
    document.addEventListener('wci:state-change', seen);
    await dispatchAction({ nodeId: 'submit', action: 'click' });
    expect(seen).toHaveBeenCalledOnce();
  });

  it('reports another node whose state changed', async () => {
    const status = document.querySelector<HTMLElement>('[data-wci-id="status"]')!;
    document.querySelector('[data-wci-id="submit"]')!
      .addEventListener('click', () => { status.dataset.wciState = '{"text":"saving"}'; });

    const r = await dispatchAction({ nodeId: 'submit', action: 'click' });
    expect(r.sideEffects).toEqual([{ nodeId: 'status', change: { text: 'saving' } }]);
  });

  it('reports a node that appeared as a result of the action', async () => {
    document.querySelector('[data-wci-id="submit"]')!.addEventListener('click', () => {
      const n = document.createElement('span');
      n.dataset.wciId = 'toast';
      n.dataset.wciState = '{"text":"done"}';
      document.body.appendChild(n);
    });
    const r = await dispatchAction({ nodeId: 'submit', action: 'click' }, document.body);
    expect(r.sideEffects).toContainEqual({ nodeId: 'toast', change: { text: 'done' } });
  });

  it('never reports the target as its own side effect', async () => {
    const r = await dispatchAction({ nodeId: 'email', action: 'fill', value: 'x' });
    expect(r.sideEffects?.some(s => s.nodeId === 'email')).toBeFalsy();
  });

  it('omits sideEffects entirely when nothing else moved', async () => {
    expect((await dispatchAction({ nodeId: 'email', action: 'focus' })).sideEffects).toBeUndefined();
  });

  it('skips side-effect collection when disabled', async () => {
    const status = document.querySelector<HTMLElement>('[data-wci-id="status"]')!;
    document.querySelector('[data-wci-id="submit"]')!
      .addEventListener('click', () => { status.dataset.wciState = '{"text":"x"}'; });

    const r = await dispatchAction(
      { nodeId: 'submit', action: 'click' }, document.body, undefined,
      { collectSideEffects: false },
    );
    expect(r.sideEffects).toBeUndefined();
  });

  it('caps reported side effects at maxSideEffects', async () => {
    mount('<button data-wci-id="go" data-wci-role="action"></button>');
    for (let i = 0; i < 10; i++) {
      const n = document.createElement('span');
      n.dataset.wciId = `n${i}`;
      n.dataset.wciState = '{"v":0}';
      document.body.appendChild(n);
    }
    document.querySelector('[data-wci-id="go"]')!.addEventListener('click', () => {
      document.querySelectorAll<HTMLElement>('span[data-wci-id]')
        .forEach(n => { n.dataset.wciState = '{"v":1}'; });
    });

    const r = await dispatchAction(
      { nodeId: 'go', action: 'click' }, document.body, undefined, { maxSideEffects: 3 },
    );
    expect(r.sideEffects).toHaveLength(3);
  });
});

describe('policy enforcement', () => {
  it('blocks a denied scope', async () => {
    const r = await dispatchAction(
      { nodeId: 'submit', action: 'click' }, document.body, policyOf({ deniedScopes: ['signup'] }),
    );
    expect(r.error?.code).toBe('SCOPE_DENIED');
  });

  it('treats anything off a non-empty allow-list as denied', async () => {
    const r = await dispatchAction(
      { nodeId: 'submit', action: 'click' }, document.body, policyOf({ allowedScopes: ['other'] }),
    );
    expect(r.error?.code).toBe('SCOPE_DENIED');
  });

  it('blocks a scope needing auth', async () => {
    const r = await dispatchAction(
      { nodeId: 'submit', action: 'click' }, document.body, policyOf({ authRequired: ['signup'] }),
    );
    expect(r.error?.code).toBe('AUTH_REQUIRED');
  });

  it('blocks a scope needing human confirmation', async () => {
    const r = await dispatchAction(
      { nodeId: 'submit', action: 'click' }, document.body,
      policyOf({ requireHumanConfirmation: ['signup'] }),
    );
    expect(r.error?.code).toBe('HUMAN_CONFIRMATION_REQUIRED');
  });

  it('blocks once the action rate limit is reached', async () => {
    const policy = policyOf({ rateLimitActions: 2 });
    expect((await dispatchAction({ nodeId: 'submit', action: 'click' }, document.body, policy)).success).toBe(true);
    expect((await dispatchAction({ nodeId: 'submit', action: 'click' }, document.body, policy)).success).toBe(true);
    const third = await dispatchAction({ nodeId: 'submit', action: 'click' }, document.body, policy);
    expect(third.error?.code).toBe('RATE_LIMITED');
  });

  it('does not count a blocked action against the rate limit', async () => {
    const policy = policyOf({ rateLimitActions: 5 });
    await dispatchAction({ nodeId: 'ghost', action: 'click' }, document.body, policy);
    expect(policy.isActionRateLimited()).toBe(false);
  });

  it('allows everything when no policy is supplied', async () => {
    expect((await dispatchAction({ nodeId: 'submit', action: 'click' })).success).toBe(true);
  });
});

describe('resolveScopeId', () => {
  it('prefers the node\'s own data-wci-scope', () => {
    mount('<div data-wci-scope="explicit" data-wci-id="n"></div>');
    expect(resolveScopeId(document.querySelector('[data-wci-id="n"]')!, 'n')).toBe('explicit');
  });

  it('walks up to the nearest landmark', () => {
    mount('<div data-wci-role="landmark" data-wci-id="zone"><b data-wci-id="n"></b></div>');
    expect(resolveScopeId(document.querySelector('[data-wci-id="n"]')!, 'n')).toBe('zone');
  });

  it('falls back to the node id when nothing scopes it', () => {
    mount('<b data-wci-id="n"></b>');
    expect(resolveScopeId(document.querySelector('[data-wci-id="n"]')!, 'n')).toBe('n');
  });
});

describe('checkPolicyBeforeDispatch', () => {
  it('reports a missing node', () => {
    expect(checkPolicyBeforeDispatch(undefined, { nodeId: 'ghost', action: 'click' }, document.body)?.error?.code)
      .toBe('NODE_NOT_FOUND');
  });

  it('returns null when the node exists and no policy is set', () => {
    expect(checkPolicyBeforeDispatch(undefined, { nodeId: 'submit', action: 'click' }, document.body))
      .toBeNull();
  });

  it('applies policy when one is set', () => {
    const blocked = checkPolicyBeforeDispatch(
      policyOf({ deniedScopes: ['signup'] }), { nodeId: 'submit', action: 'click' }, document.body,
    );
    expect(blocked?.error?.code).toBe('SCOPE_DENIED');
  });
});

describe('WciBridge', () => {
  let bridge: WciBridge;
  beforeEach(() => { bridge = new WciBridge(document.body); });
  afterEach(() => bridge.destroy());

  it('exposes convenience methods for each action', async () => {
    expect((await bridge.fill('email', 'a@b.c')).success).toBe(true);
    expect((await bridge.click('submit')).success).toBe(true);
    expect((await bridge.check('terms')).success).toBe(true);
    expect((await bridge.select('plan', 'pro')).success).toBe(true);
    expect((await bridge.clear('email')).success).toBe(true);
    expect((await bridge.submit('email')).success).toBe(true);
    expect((await bridge.upload('avatar', { name: 'a.txt' })).success).toBe(true);
  });

  it('records history in order', async () => {
    await bridge.fill('email', 'x');
    await bridge.click('submit');
    expect(bridge.getHistory().map(h => h.nodeId)).toEqual(['email', 'submit']);
  });

  it('returns a defensive copy of history', async () => {
    await bridge.click('submit');
    bridge.getHistory().push({} as never);
    expect(bridge.getHistory()).toHaveLength(1);
  });

  it('clears history on demand', async () => {
    await bridge.click('submit');
    bridge.clearHistory();
    expect(bridge.getHistory()).toEqual([]);
  });

  it('caps retained history at maxHistory', async () => {
    const b = new WciBridge(document.body, { maxHistory: 3 });
    for (let i = 0; i < 6; i++) await b.click('submit');
    expect(b.getHistory()).toHaveLength(3);
    b.destroy();
  });

  it('notifies state-change subscribers and supports unsubscribe', async () => {
    const seen = vi.fn();
    const off = bridge.onStateChange(seen);
    await bridge.click('submit');
    expect(seen).toHaveBeenCalledOnce();
    expect(seen.mock.calls[0][0]).toMatchObject({ nodeId: 'submit', action: 'click' });

    off();
    await bridge.click('submit');
    expect(seen).toHaveBeenCalledOnce();
  });

  it('stops at the first failure in a sequence', async () => {
    const results = await bridge.dispatchSequence([
      { nodeId: 'email', action: 'fill', value: 'a' },
      { nodeId: 'ghost', action: 'click' },
      { nodeId: 'submit', action: 'click' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[1].error?.code).toBe('NODE_NOT_FOUND');
  });

  it('runs a full sequence when every step succeeds', async () => {
    const results = await bridge.dispatchSequence([
      { nodeId: 'email', action: 'fill', value: 'a@b.c' },
      { nodeId: 'terms', action: 'check' },
      { nodeId: 'submit', action: 'click' },
    ]);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('accepts a policy after construction', async () => {
    bridge.setPolicy(policyOf({ deniedScopes: ['signup'] }));
    expect(bridge.getPolicy()).toBeDefined();
    expect((await bridge.click('submit')).error?.code).toBe('SCOPE_DENIED');
  });

  it('can be retargeted at a different root', async () => {
    mount(`<div id="a">${FORM}</div><div id="b"></div>`);
    bridge.setRoot(document.querySelector('#b')!);
    expect(bridge.getRoot().id).toBe('b');
    expect((await bridge.click('submit')).error?.code).toBe('NODE_NOT_FOUND');
  });

  it('detaches its document listener on destroy', async () => {
    const seen = vi.fn();
    const b = new WciBridge(document.body);
    b.onStateChange(seen);
    b.destroy();

    // The event still fires; a destroyed bridge must simply not react to it.
    document.dispatchEvent(new CustomEvent('wci:state-change', { detail: { nodeId: 'x' } }));
    expect(seen).not.toHaveBeenCalled();
  });

  it('refuses to dispatch after destroy', async () => {
    const b = new WciBridge(document.body);
    b.destroy();
    const r = await b.dispatch({ nodeId: 'submit', action: 'click' });
    expect(r.success).toBe(false);
    expect(r.error?.message).toContain('destroyed');
  });

  it('destroy is idempotent', () => {
    const b = new WciBridge(document.body);
    b.destroy();
    expect(() => b.destroy()).not.toThrow();
  });

  it('onResult fires after the result is in history', async () => {
    const seen: number[] = [];
    bridge.onResult((result, history) => {
      // The DOM state-change event fires mid-dispatch; a subscriber reading
      // history from it would always be one action behind.
      expect(history[history.length - 1]).toBe(result);
      seen.push(history.length);
    });

    await bridge.click('submit');
    await bridge.click('submit');
    expect(seen).toEqual([1, 2]);
  });

  it('onResult reports failures too', async () => {
    const codes: (string | undefined)[] = [];
    bridge.onResult(r => codes.push(r.error?.code));
    await bridge.click('ghost');
    expect(codes).toEqual(['NODE_NOT_FOUND']);
  });

  it('onResult unsubscribes cleanly', async () => {
    const seen = vi.fn();
    const off = bridge.onResult(seen);
    await bridge.click('submit');
    off();
    await bridge.click('submit');
    expect(seen).toHaveBeenCalledOnce();
  });

  it('does not leak listeners across many bridge lifecycles', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    for (let i = 0; i < 20; i++) new WciBridge(document.body).destroy();
    expect(add).toHaveBeenCalledTimes(20);
    expect(remove).toHaveBeenCalledTimes(20);
  });
});
