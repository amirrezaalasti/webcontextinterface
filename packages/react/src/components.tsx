// ─────────────────────────────────────────────────────────────────────────────
// WCI React — components
// ─────────────────────────────────────────────────────────────────────────────

import { createElement, type ElementType, type ReactNode } from 'react';
import { WciScopeContext, useWciNode } from './hooks';
import type { WciAnnotation } from './props';

/**
 * The props these components own, before arbitrary passthrough is added.
 *
 * Kept free of an index signature: `Omit` over a type that has one collapses
 * every key to the index type, which erases the annotation's typing.
 */
interface WciOwnProps extends WciAnnotation {
  /** Element or component to render (default 'div'). */
  as?: ElementType;
  children?: ReactNode;
  className?: string;
}

/** Passthrough props forwarded verbatim to the rendered element. */
type PassthroughProps = Record<string, unknown>;

export type WciProps = WciOwnProps & PassthroughProps;

/**
 * Render any element with typed WCI annotations attached.
 *
 * `<Wci as="button" id="pay" role="action" desc="…" action="click" />` beats
 * six hand-written data attributes: the props are checked, the scope is
 * inherited, and state is serialised for you.
 */
export function Wci({
  as = 'div',
  children,
  id, role, desc, action, state, precondition, required,
  options, emits, scope, hidden, priority,
  ...rest
}: WciProps): ReactNode {
  const wci = useWciNode({
    id, role, desc, action, state, precondition, required,
    options, emits, scope, hidden, priority,
  });

  return createElement(as as ElementType, { ...rest, ...wci }, children);
}

/** Landmarks always carry role="landmark", so `role` is not accepted. */
export type WciLandmarkProps = Omit<WciOwnProps, 'role'> & PassthroughProps & {
  role?: never;
};

/**
 * A bounded task zone. Descendants inherit its id as their scope, which is
 * what scoped distillation and wci.txt policy both key off.
 */
export function WciLandmark({
  as = 'section',
  children,
  id, desc, state, precondition, emits, hidden, priority,
  ...rest
}: WciLandmarkProps): ReactNode {
  const wci = useWciNode({
    id, role: 'landmark', desc, state, precondition, emits, hidden, priority,
  });

  return createElement(
    WciScopeContext.Provider,
    { value: id },
    createElement(as as ElementType, { ...rest, ...wci }, children),
  );
}

export interface WciScopeProps {
  /** Scope id descendants inherit. */
  scope: string;
  children?: ReactNode;
}

/**
 * Set the inherited scope without rendering an element.
 *
 * Useful when the landmark element is rendered by a component you do not
 * control, such as a design-system layout primitive.
 */
export function WciScope({ scope, children }: WciScopeProps): ReactNode {
  return createElement(WciScopeContext.Provider, { value: scope }, children);
}
