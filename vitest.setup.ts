/**
 * jsdom emits "Not implemented" errors for navigation and form submission —
 * both are genuinely absent from a headless DOM and both are handled by the
 * dispatcher's fallbacks. Filtering the known set keeps real failures visible
 * in CI output; anything unrecognised still prints.
 */
const KNOWN_JSDOM_GAPS = [
  'Not implemented: navigation',
  'Not implemented: HTMLFormElement.prototype.submit',
  'Not implemented: HTMLFormElement.prototype.requestSubmit',
];

const originalError = console.error;
console.error = (...args: unknown[]) => {
  const text = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
  if (KNOWN_JSDOM_GAPS.some(gap => text.includes(gap))) return;
  originalError(...args);
};
