// ─────────────────────────────────────────────────────────────────────────────
// WCI Distiller — token estimation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Average characters per token for English prose plus JSON punctuation.
 *
 * Real tokenisers are model-specific and would pull a multi-megabyte
 * vocabulary into a package that advertises a ~4 KB budget, so the distiller
 * estimates instead. Treat the result as a planning figure with roughly
 * ±15% error, not an exact count.
 */
const CHARS_PER_TOKEN = 3.7;

/** Estimate the token cost of a string. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Estimate the token cost of any JSON-serialisable value. */
export function estimateJsonTokens(value: unknown): number {
  try {
    return estimateTokens(JSON.stringify(value) ?? '');
  } catch {
    return 0;
  }
}
