import type { ScenarioGroundTruth } from './ground-truth';

const NODE_ID_RE = /[a-z][a-z0-9_-]{2,}/gi;
const CSS_SELECTOR_RE = /([#.]?[a-zA-Z][\w\-\.\#\[\]="':,\s\(\)>+~*]+)/;

export function normalizeNodeId(raw: string, validIds?: string[]): string | null {
  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\.$/, '');
  if (!cleaned) return null;

  if (validIds?.length) {
    const lower = cleaned.toLowerCase();
    const exact = validIds.find((id) => id.toLowerCase() === lower);
    if (exact) return exact;

    const contains = validIds.filter(
      (id) => id.toLowerCase().includes(lower) || lower.includes(id.toLowerCase())
    );
    if (contains.length === 1) return contains[0];

    const suffixMatch = validIds.filter((id) => id.toLowerCase().endsWith(lower));
    if (suffixMatch.length === 1) return suffixMatch[0];

    const prefixMatch = validIds.filter((id) => id.toLowerCase().startsWith(lower));
    if (prefixMatch.length === 1) return prefixMatch[0];
  }

  if (/^[a-z][a-z0-9_-]+$/i.test(cleaned)) return cleaned;

  const idMatch = cleaned.match(/(?:id|node|target)[:\s]+["']?([a-z][a-z0-9_-]+)/i);
  if (idMatch) return idMatch[1];

  const tokens = cleaned.match(NODE_ID_RE);
  if (!tokens?.length) return null;

  const withHyphen = tokens.filter((t) => t.includes('-'));
  if (withHyphen.length) {
    const pick = withHyphen.sort((a, b) => b.length - a.length)[0];
    if (validIds?.length) {
      const resolved = validIds.find((id) => id.toLowerCase() === pick.toLowerCase());
      return resolved ?? pick;
    }
    return pick;
  }

  const pick = tokens.sort((a, b) => b.length - a.length)[0];
  if (validIds?.length) {
    const resolved = validIds.find((id) => id.toLowerCase() === pick.toLowerCase());
    return resolved ?? pick;
  }
  return pick;
}

export function extractCssSelector(raw: string): string | null {
  const trimmed = raw.trim().replace(/^```[\w]*\n?|```$/g, '');
  if (!trimmed) return null;

  // Single line selector
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
  validNodeIds?: string[]
): { correct: boolean; hitDecoy: boolean; parsed: string | null } {
  const parsed = normalizeNodeId(predicted, validNodeIds);
  if (!parsed) return { correct: false, hitDecoy: false, parsed: null };

  const correct =
    parsed === gt.wciNodeId || gt.acceptableNodeIds.includes(parsed);
  const hitDecoy = gt.decoyNodeIds.includes(parsed);

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
