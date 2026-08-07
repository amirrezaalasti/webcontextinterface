import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { WciDistiller } from '@webcontextinterface/distiller';
import { validateMarkup } from '@webcontextinterface/validator';
import {
  Wci,
  WciLandmark,
  WciScope,
  useWciActions,
  useWciBridge,
  useWciNode,
  useWciScope,
  useWciView,
  wciProps,
} from '@webcontextinterface/react';

afterEach(cleanup);

describe('wciProps', () => {
  it('emits the three required attributes', () => {
    expect(wciProps({ id: 'x', role: 'action', desc: 'Do a thing' })).toEqual({
      'data-wci-id': 'x',
      'data-wci-role': 'action',
      'data-wci-desc': 'Do a thing',
    });
  });

  it('omits absent optionals rather than rendering "undefined"', () => {
    const props = wciProps({ id: 'x', role: 'action', desc: 'd' });
    expect(props).not.toHaveProperty('data-wci-action');
    expect(props).not.toHaveProperty('data-wci-scope');
    expect(Object.values(props)).not.toContain(undefined);
  });

  it('serialises state as JSON', () => {
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', state: { value: 'a', ok: true } })
      ['data-wci-state']).toBe('{"value":"a","ok":true}');
  });

  it('omits empty state', () => {
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', state: {} }))
      .not.toHaveProperty('data-wci-state');
  });

  it('serialises options as a JSON array', () => {
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', options: ['a', 'b'] })
      ['data-wci-options']).toBe('["a","b"]');
  });

  it('renders booleans only when true', () => {
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', required: true })['data-wci-required']).toBe('true');
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', required: false })).not.toHaveProperty('data-wci-required');
    expect(wciProps({ id: 'x', role: 'form', desc: 'd', hidden: true })['data-wci-hidden']).toBe('true');
  });

  it('stringifies priority', () => {
    expect(wciProps({ id: 'x', role: 'action', desc: 'd', priority: 1 })['data-wci-priority']).toBe('1');
  });
});

describe('<Wci>', () => {
  it('renders a div by default with the annotations attached', () => {
    const { container } = render(<Wci id="x" role="display" desc="A total" />);
    const el = container.querySelector('[data-wci-id="x"]')!;
    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('data-wci-role')).toBe('display');
    expect(el.getAttribute('data-wci-desc')).toBe('A total');
  });

  it('renders the element named by `as`', () => {
    const { container } = render(
      <Wci as="button" id="pay" role="action" desc="Place the order" action="click" />,
    );
    const el = container.querySelector('[data-wci-id="pay"]')!;
    expect(el.tagName).toBe('BUTTON');
    expect(el.getAttribute('data-wci-action')).toBe('click');
  });

  it('forwards unknown props to the element', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Wci as="button" id="x" role="action" desc="d" className="cta" onClick={onClick} type="button" />,
    );
    const el = container.querySelector('button')!;
    expect(el.className).toBe('cta');
    expect(el.getAttribute('type')).toBe('button');
    el.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders children', () => {
    const { container } = render(<Wci as="button" id="x" role="action" desc="d">Go</Wci>);
    expect(container.querySelector('button')!.textContent).toBe('Go');
  });

  it('reflects updated state into the attribute', () => {
    function Widget() {
      const [value, setValue] = useState('');
      return (
        <>
          <Wci as="input" id="f" role="form" desc="Field" action="fill" state={{ value }} />
          <button onClick={() => setValue('typed')}>set</button>
        </>
      );
    }
    const { container } = render(<Widget />);
    expect(container.querySelector('[data-wci-id="f"]')!.getAttribute('data-wci-state'))
      .toBe('{"value":""}');

    act(() => { container.querySelector('button')!.click(); });
    expect(container.querySelector('[data-wci-id="f"]')!.getAttribute('data-wci-state'))
      .toBe('{"value":"typed"}');
  });
});

describe('<WciLandmark> scope inheritance', () => {
  it('marks itself as a landmark', () => {
    const { container } = render(<WciLandmark id="cart" desc="Shopping cart" />);
    const el = container.querySelector('[data-wci-id="cart"]')!;
    expect(el.getAttribute('data-wci-role')).toBe('landmark');
    expect(el.tagName).toBe('SECTION');
  });

  it('passes its id down as the scope of descendants', () => {
    const { container } = render(
      <WciLandmark id="cart" desc="Shopping cart contents">
        <Wci as="button" id="pay" role="action" desc="Place the order" action="click" />
      </WciLandmark>,
    );
    expect(container.querySelector('[data-wci-id="pay"]')!.getAttribute('data-wci-scope'))
      .toBe('cart');
  });

  it('lets a descendant override the inherited scope', () => {
    const { container } = render(
      <WciLandmark id="cart" desc="Shopping cart contents">
        <Wci as="button" id="pay" role="action" desc="d" scope="other" />
      </WciLandmark>,
    );
    expect(container.querySelector('[data-wci-id="pay"]')!.getAttribute('data-wci-scope'))
      .toBe('other');
  });

  it('applies the innermost landmark when nested', () => {
    const { container } = render(
      <WciLandmark id="outer" desc="Outer task zone">
        <WciLandmark id="inner" desc="Inner task zone">
          <Wci as="button" id="deep" role="action" desc="A deep action" />
        </WciLandmark>
      </WciLandmark>,
    );
    expect(container.querySelector('[data-wci-id="deep"]')!.getAttribute('data-wci-scope'))
      .toBe('inner');
  });

  it('leaves scope unset outside any landmark', () => {
    const { container } = render(<Wci as="button" id="loose" role="action" desc="d" />);
    expect(container.querySelector('[data-wci-id="loose"]')!.hasAttribute('data-wci-scope'))
      .toBe(false);
  });
});

describe('<WciScope>', () => {
  it('sets the scope without rendering an element', () => {
    const { container } = render(
      <WciScope scope="virtual">
        <Wci as="button" id="x" role="action" desc="An action here" />
      </WciScope>,
    );
    expect(container.children).toHaveLength(1);
    expect(container.querySelector('[data-wci-id="x"]')!.getAttribute('data-wci-scope'))
      .toBe('virtual');
  });
});

describe('useWciScope / useWciNode', () => {
  it('returns undefined with no enclosing landmark', () => {
    expect(renderHook(() => useWciScope()).result.current).toBeUndefined();
  });

  it('reads the enclosing landmark scope', () => {
    const { result } = renderHook(() => useWciScope(), {
      wrapper: ({ children }) => <WciScope scope="zone">{children}</WciScope>,
    });
    expect(result.current).toBe('zone');
  });

  it('returns a referentially stable object across identical renders', () => {
    const { result, rerender } = renderHook(
      (props: { desc: string }) => useWciNode({ id: 'x', role: 'action', desc: props.desc }),
      { initialProps: { desc: 'same' } },
    );
    const first = result.current;
    rerender({ desc: 'same' });
    expect(result.current).toBe(first);

    rerender({ desc: 'changed' });
    expect(result.current).not.toBe(first);
  });

  it('stays stable when state is a new object with equal contents', () => {
    const { result, rerender } = renderHook(
      () => useWciNode({ id: 'x', role: 'form', desc: 'd', state: { value: 'a' } }),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('useWciBridge', () => {
  it('creates a bridge and tears it down on unmount', async () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { result, unmount } = renderHook(() => useWciBridge());

    await waitFor(() => expect(result.current.bridge).not.toBeNull());
    unmount();

    expect(remove).toHaveBeenCalledWith('wci:state-change', expect.any(Function));
  });

  it('does not create a bridge when disabled', () => {
    const { result } = renderHook(() => useWciBridge({ enabled: false }));
    expect(result.current.bridge).toBeNull();
  });

  it('dispatches actions against the live DOM', async () => {
    function App() {
      const { bridge, rootRef } = useWciBridge();
      return (
        <div ref={rootRef as React.RefObject<HTMLDivElement>}>
          <Wci as="input" id="email" role="form" desc="Email address" action="fill" />
          <button onClick={() => void bridge?.fill('email', 'a@b.c')}>go</button>
        </div>
      );
    }
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('input')).not.toBeNull());

    await act(async () => { container.querySelector('button')!.click(); });

    await waitFor(() => {
      expect(container.querySelector<HTMLInputElement>('[data-wci-id="email"]')!.value)
        .toBe('a@b.c');
    });
  });

  it('records dispatched actions in history', async () => {
    function App() {
      const { bridge, rootRef, history } = useWciBridge();
      return (
        <div ref={rootRef as React.RefObject<HTMLDivElement>}>
          <Wci as="button" id="go" role="action" desc="An action" action="click" />
          <button data-testid="fire" onClick={() => void bridge?.click('go')}>fire</button>
          <span data-testid="count">{history.length}</span>
        </div>
      );
    }
    const { getByTestId } = render(<App />);
    await act(async () => { getByTestId('fire').click(); });
    await waitFor(() => expect(getByTestId('count').textContent).toBe('1'));
  });
});

describe('useWciView', () => {
  it('distils the rendered tree', async () => {
    function App() {
      const view = useWciView();
      return (
        <div>
          <WciLandmark id="cart" desc="Shopping cart contents">
            <Wci as="button" id="pay" role="action" desc="Place the order" action="click" />
          </WciLandmark>
          <span data-testid="count">{view?.node_count ?? -1}</span>
        </div>
      );
    }
    const { getByTestId } = render(<App />);
    await waitFor(() => expect(Number(getByTestId('count').textContent)).toBeGreaterThanOrEqual(2));
  });

  it('recomputes when an annotated attribute changes', async () => {
    function App() {
      const [value, setValue] = useState('');
      const view = useWciView();
      const node = view?.nodes.find(n => n.id === 'f');
      return (
        <div>
          <Wci as="input" id="f" role="form" desc="Field" action="fill" state={{ value }} />
          <button data-testid="set" onClick={() => setValue('typed')}>set</button>
          <span data-testid="seen">{JSON.stringify(node?.state ?? {})}</span>
        </div>
      );
    }
    const { getByTestId } = render(<App />);
    await waitFor(() => expect(getByTestId('seen').textContent).toContain('"value":""'));

    await act(async () => { getByTestId('set').click(); });
    await waitFor(() => expect(getByTestId('seen').textContent).toContain('typed'));
  });

  it('does not observe when live is false', () => {
    const { result } = renderHook(() => useWciView({ live: false }));
    expect(result.current).not.toBeNull();
  });

  it('honours distiller options', () => {
    render(
      <WciLandmark id="z" desc="A task zone here">
        <Wci as="button" id="a" role="action" desc="First action" priority={1} />
        <Wci as="button" id="b" role="action" desc="Second action" priority={5} />
      </WciLandmark>,
    );
    const { result } = renderHook(() => useWciView({ maxNodes: 1, live: false }));
    expect(result.current!.nodes).toHaveLength(1);
  });
});

describe('useWciActions', () => {
  it('reports the most recent action on any node', async () => {
    function App() {
      const { bridge, rootRef } = useWciBridge();
      const latest = useWciActions();
      return (
        <div ref={rootRef as React.RefObject<HTMLDivElement>}>
          <Wci as="button" id="go" role="action" desc="An action" action="click" />
          <button data-testid="fire" onClick={() => void bridge?.click('go')}>fire</button>
          <span data-testid="seen">{latest?.nodeId ?? 'none'}</span>
        </div>
      );
    }
    const { getByTestId } = render(<App />);
    expect(getByTestId('seen').textContent).toBe('none');

    await act(async () => { getByTestId('fire').click(); });
    await waitFor(() => expect(getByTestId('seen').textContent).toBe('go'));
  });

  it('ignores actions on other nodes when filtered', async () => {
    function App() {
      const { bridge, rootRef } = useWciBridge();
      const latest = useWciActions('watched');
      return (
        <div ref={rootRef as React.RefObject<HTMLDivElement>}>
          <Wci as="button" id="watched" role="action" desc="Watched action" action="click" />
          <Wci as="button" id="other" role="action" desc="Other action" action="click" />
          <button data-testid="other" onClick={() => void bridge?.click('other')}>o</button>
          <span data-testid="seen">{latest?.nodeId ?? 'none'}</span>
        </div>
      );
    }
    const { getByTestId } = render(<App />);
    await act(async () => { getByTestId('other').click(); });
    expect(getByTestId('seen').textContent).toBe('none');
  });
});

describe('components produce markup the rest of the toolchain accepts', () => {
  it('renders annotations the validator passes', () => {
    const { container } = render(
      <WciLandmark id="signup" desc="New user registration form">
        <Wci as="input" id="email" role="form" desc="User's email address"
             action="fill" required priority={1} state={{ value: '' }} />
        <Wci as="button" id="go" role="action" desc="Submit the registration"
             action="click" priority={1} />
      </WciLandmark>,
    );
    const report = validateMarkup(container);
    expect(report.issues).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it('renders annotations the distiller reads back faithfully', () => {
    const { container } = render(
      <WciLandmark id="cart" desc="Shopping cart contents">
        <Wci as="button" id="pay" role="action" desc="Place the order"
             action="click" priority={1} precondition="Cart must not be empty" />
      </WciLandmark>,
    );
    const view = new WciDistiller({ scope: 'cart' }).toView(container);
    const pay = view.nodes.find(n => n.id === 'pay')!;
    expect(pay).toMatchObject({
      role: 'action', action: 'click', priority: 1,
      scope: 'cart', precondition: 'Cart must not be empty',
    });
  });
});
