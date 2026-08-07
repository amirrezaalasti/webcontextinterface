// ─────────────────────────────────────────────────────────────────────────────
// WCI Specification — realm-safe DOM type guards
//
// `el instanceof HTMLInputElement` fails in two situations WCI cares about:
//
//   1. Server-side use (jsdom, happy-dom, a worker). The constructors live on
//      the DOM instance's own window, not on globalThis, so the bare name is a
//      ReferenceError.
//   2. Cross-realm elements. An element inside an iframe is built from that
//      frame's constructors, so it fails an instanceof against the parent's —
//      silently, as a false negative.
//
// Node type numbers and tag names are defined by the DOM standard and identical
// in every realm, which makes them the reliable basis for these checks.
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENT_NODE = 1;
const DOCUMENT_NODE = 9;

interface NodeLike {
  nodeType?: unknown;
  tagName?: unknown;
}

function nodeTypeOf(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const t = (value as NodeLike).nodeType;
  return typeof t === 'number' ? t : undefined;
}

/** True for a Document in any realm. */
export function isDocument(value: unknown): value is Document {
  return nodeTypeOf(value) === DOCUMENT_NODE;
}

/** True for an Element in any realm. */
export function isElement(value: unknown): value is Element {
  return nodeTypeOf(value) === ELEMENT_NODE;
}

/** Upper-cased tag name, or '' when the value is not an element. */
export function tagNameOf(value: unknown): string {
  if (!isElement(value)) return '';
  const tag = (value as NodeLike).tagName;
  return typeof tag === 'string' ? tag.toUpperCase() : '';
}

export function isInputElement(value: unknown): value is HTMLInputElement {
  return tagNameOf(value) === 'INPUT';
}

export function isTextAreaElement(value: unknown): value is HTMLTextAreaElement {
  return tagNameOf(value) === 'TEXTAREA';
}

export function isSelectElement(value: unknown): value is HTMLSelectElement {
  return tagNameOf(value) === 'SELECT';
}

export function isFormElement(value: unknown): value is HTMLFormElement {
  return tagNameOf(value) === 'FORM';
}

/** Any element that accepts a typed text value. */
export function isTextEntryElement(
  value: unknown,
): value is HTMLInputElement | HTMLTextAreaElement {
  return isInputElement(value) || isTextAreaElement(value);
}

/** An `<input>` whose type is checkbox or radio. */
export function isCheckableElement(value: unknown): value is HTMLInputElement {
  return isInputElement(value) && ['checkbox', 'radio'].includes(value.type);
}

/** An `<input type="file">`. */
export function isFileInputElement(value: unknown): value is HTMLInputElement {
  return isInputElement(value) && value.type === 'file';
}

/**
 * The window a node belongs to, or the global one as a fallback.
 * Used to reach constructors (Event, CustomEvent, …) in the node's own realm.
 */
export function windowOf(node: Node | null | undefined): (Window & typeof globalThis) | undefined {
  const doc = isDocument(node) ? node : node?.ownerDocument;
  const view = doc?.defaultView as (Window & typeof globalThis) | null | undefined;
  if (view) return view;
  return typeof window !== 'undefined' ? window : undefined;
}
