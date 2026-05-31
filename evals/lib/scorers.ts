import type { ScenarioGroundTruth } from './ground-truth';

const NODE_ID_RE = /\b[a-z][a-z0-9_-]+\b/gi;
const CSS_SELECTOR_RE = /([#.]?[a-zA-Z][\w\-\.\#\[\]="':,\s\(\)>+~*]+)/;
const CSS_MARKERS = /[.#\[\]="':>+~*,]|\\|\s/;

function looksLikeCssSelector(s: string): boolean {
  const t = s.trim();
  return (
    CSS_MARKERS.test(t) ||
    /^(?:click|act|target|invoke|select|fill|read|verify):\s*/i.test(t)
  );
}

function stripActionPrefix(s: string): string {
  return s.replace(/^(?:click|act|target|invoke|select|fill|read|verify):\s*/i, '').trim();
}

/** Pick the longest valid id embedded in text with token boundaries. */
function findEmbeddedValidId(text: string, validIds: string[]): string | null {
  const ordered = [...validIds].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  for (const id of ordered) {
    const idx = lower.indexOf(id.toLowerCase());
    if (idx < 0) continue;
    const before = idx === 0 ? '' : text[idx - 1];
    const after = text[idx + id.length] ?? '';
    const boundary = (c: string) => !c || !/[a-z0-9_-]/i.test(c);
    if (boundary(before) && boundary(after)) return id;
  }
  return null;
}

export function normalizeNodeId(raw: string, validIds?: string[]): string | null {
  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\.$/, '');
  if (!cleaned) return null;

  const stripped = stripActionPrefix(cleaned).replace(/^["'`]+|["'`]+$/g, '');

  if (validIds?.length) {
    for (const s of [cleaned, stripped]) {
      const exact = validIds.find((id) => id.toLowerCase() === s.toLowerCase());
      if (exact) return exact;
    }

    const idMatch = cleaned.match(/(?:id|node|target|wci)[:\s]+["']?([a-z][a-z0-9_-]+)/i);
    if (idMatch) {
      const exact = validIds.find((id) => id.toLowerCase() === idMatch[1].toLowerCase());
      if (exact) return exact;
    }

    if (looksLikeCssSelector(cleaned)) {
      return findEmbeddedValidId(cleaned, validIds);
    }

    if (/^[a-z][a-z0-9_-]+$/i.test(stripped)) {
      return validIds.find((id) => id.toLowerCase() === stripped.toLowerCase()) ?? null;
    }

    const embedded = findEmbeddedValidId(cleaned, validIds);
    if (embedded) return embedded;

    return null;
  }

  if (/^[a-z][a-z0-9_-]+$/i.test(stripped)) return stripped;

  const idMatch = cleaned.match(/(?:id|node|target)[:\s]+["']?([a-z][a-z0-9_-]+)/i);
  if (idMatch) return idMatch[1];

  const tokens = cleaned.match(NODE_ID_RE);
  if (!tokens?.length) return null;

  const withHyphen = tokens.filter((t) => t.includes('-'));
  if (withHyphen.length) {
    return withHyphen.sort((a, b) => b.length - a.length)[0];
  }

  return tokens.sort((a, b) => b.length - a.length)[0];
}

/** Resolve WCI node id from final_action and action targets (multistep plans). */
export function resolveWciNodeId(
  candidates: string[],
  validIds: string[]
): string | null {
  for (const raw of candidates) {
    const id = normalizeNodeId(raw, validIds);
    if (id && validIds.includes(id)) return id;
  }
  return null;
}

export function extractCssSelector(raw: string): string | null {
  const trimmed = raw.trim().replace(/^```[\w]*\n?|```$/g, '');
  if (!trimmed) return null;

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('.') || line.startsWith('[') || /^[a-z]/i.test(line)) {
      const sel = line.replace(/^selector:\s*/i, '').trim();
      if (sel.length > 2 && sel.length < 500) return sel;
    }
  }

  const m = trimmed.match(CSS_SELECTOR_RE);
  return m ? m[1].trim() : null;
}

export function scoreWciPrediction(
  predicted: string,
  gt: ScenarioGroundTruth,
  validNodeIds?: string[],
  competitorNodeIds?: string[]
): { correct: boolean; hitDecoy: boolean; parsed: string | null } {
  const parsed = normalizeNodeId(predicted, validNodeIds);
  if (!parsed) return { correct: false, hitDecoy: false, parsed: null };

  if (validNodeIds?.length && !validNodeIds.includes(parsed)) {
    return { correct: false, hitDecoy: false, parsed: null };
  }

  const correct =
    parsed === gt.wciNodeId || gt.acceptableNodeIds.includes(parsed);
  const hitDecoy =
    gt.decoyNodeIds.includes(parsed) ||
    (competitorNodeIds?.includes(parsed) ?? false);

  return { correct, hitDecoy, parsed };
}

/** Candidate index from Mind2Web-style numbered list */
export function parseCandidateIndex(raw: string): number | null {
  const m = raw.trim().match(/^\[?(\d+)\]?/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export interface SelectorValidation {
  valid: boolean;
  matchesGroundTruth: boolean;
  matchesCount: number;
  error?: string;
}
