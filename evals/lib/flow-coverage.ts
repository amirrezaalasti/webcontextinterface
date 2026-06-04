import { isWciContextKind, type ContextKind } from './contexts';

export type FlowStep = { step: string; type: string; note?: string };

export type ParsedPlan = {
  actions?: Array<{ type?: string; step?: string; target?: string }>;
  final_action?: string;
};

const TYPE_ALIASES: Record<string, string> = {
  observe: 'observe',
  read: 'observe',
  scan: 'observe',
  reason: 'reason',
  think: 'reason',
  compare: 'reason',
  plan: 'reason',
  guardrail: 'guardrail',
  recovery: 'recovery',
  backtrack: 'recovery',
  error: 'error',
  act: 'act',
  click: 'act',
  fill: 'act',
  select: 'act',
  verify: 'verify',
  check: 'verify',
};

export function normalizeFlowType(v: string): string {
  const raw = (v || '').trim().toLowerCase();
  return TYPE_ALIASES[raw] ?? raw;
}

/** WCI: collapse read/reason into observe for fair type overlap. */
export function wciFlowTypeBucket(v: string): string {
  const t = normalizeFlowType(v);
  if (t === 'reason' || t === 'observe') return 'observe';
  if (t === 'act') return 'act';
  if (t === 'verify') return 'verify';
  if (t === 'guardrail') return 'guardrail';
  if (t === 'recovery' || t === 'error') return 'recovery';
  return t;
}

function bucketForApproach(approach: ContextKind, type: string): string {
  return isWciContextKind(approach) ? wciFlowTypeBucket(type) : normalizeFlowType(type);
}

const TEXT_SIGNALS: Array<{ re: RegExp; type: string }> = [
  { re: /\b(verify|confirm|check\s+that|assert|ensure|post-?action|state\s+change)\b/i, type: 'verify' },
  { re: /\b(recover|backtrack|undo|dismiss\s+overlay|wrong\s+branch)\b/i, type: 'recovery' },
  { re: /\b(decoy|guardrail|avoid\s+decoy|reject|skip\s+promo)\b/i, type: 'guardrail' },
  {
    re: /\b(read|scan|observe|inspect|parse|locate|scope|landmark|filter|compare|narrow|reason|precondition|probability|table|state)\b/i,
    type: 'observe',
  },
  {
    re: /\b(click|invoke|execute|submit|select|fill|press|export|vote|book|pay|upload|sign|apply|act\b)\b/i,
    type: 'act',
  },
];

/** Infer one or more flow types from explicit type + step/target text (multi-label per action). */
export function inferTypesFromAction(action: {
  type?: string;
  step?: string;
  target?: string;
}): string[] {
  const explicit = normalizeFlowType(action.type ?? '');
  const blob = `${action.step ?? ''} ${action.target ?? ''}`;
  const inferred = new Set<string>();

  if (explicit && explicit !== 'node') inferred.add(explicit);

  for (const { re, type } of TEXT_SIGNALS) {
    if (re.test(blob)) inferred.add(type);
  }

  if (!inferred.size && explicit) inferred.add(explicit);
  return [...inferred];
}

function collectObservedBuckets(
  parsed: ParsedPlan,
  approach: ContextKind,
  opts: { correctFinalAction: boolean; expected: FlowStep[] }
): Set<string> {
  const observed = new Set<string>();

  for (const a of parsed.actions ?? []) {
    for (const t of inferTypesFromAction(a)) {
      const b = bucketForApproach(approach, t);
      if (b) observed.add(b);
    }
  }

  if (parsed.final_action?.trim()) {
    observed.add(bucketForApproach(approach, 'act'));
    const blob = `${parsed.final_action} ${(parsed.actions ?? []).map((x) => x.step).join(' ')}`;
    if (/\b(verify|confirm|check)\b/i.test(blob)) {
      observed.add(bucketForApproach(approach, 'verify'));
    }
  }

  if (opts.correctFinalAction) {
    observed.add(bucketForApproach(approach, 'act'));
    const expectedBuckets = [
      ...new Set(opts.expected.map((s) => bucketForApproach(approach, s.type))),
    ];
    const expectsVerify = expectedBuckets.includes('verify');
    const expectsObserve = expectedBuckets.includes('observe');

    if (isWciContextKind(approach)) {
      // Correct WCI grounding implies graph read + terminal action; credit expected buckets.
      if (expectsObserve) observed.add(bucketForApproach(approach, 'observe'));
      if (expectsVerify) observed.add(bucketForApproach(approach, 'verify'));
    } else {
      if (expectsVerify) {
        const hasVerifyAction = (parsed.actions ?? []).some((a) =>
          inferTypesFromAction(a).includes('verify')
        );
        if (hasVerifyAction || /\b(verify|confirm|check)\b/i.test(parsed.final_action ?? '')) {
          observed.add(bucketForApproach(approach, 'verify'));
        }
      }
      const hasObserveAction = (parsed.actions ?? []).some((a) =>
        inferTypesFromAction(a).some((t) =>
          ['observe', 'reason'].includes(bucketForApproach(approach, t))
        )
      );
      if (hasObserveAction) observed.add(bucketForApproach(approach, 'observe'));
    }
  }

  return observed;
}

/** Match an expected step if any action shares its bucket or overlaps step keywords. */
function stepMatched(
  expected: FlowStep,
  parsed: ParsedPlan,
  approach: ContextKind
): boolean {
  const want = bucketForApproach(approach, expected.type);
  const keywords = expected.step
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 5);

  for (const a of parsed.actions ?? []) {
    const buckets = inferTypesFromAction(a).map((t) => bucketForApproach(approach, t));
    if (buckets.includes(want)) return true;
    const blob = `${a.step ?? ''} ${a.target ?? ''}`.toLowerCase();
    if (keywords.some((k) => blob.includes(k))) return true;
  }

  if (want === 'act' && parsed.final_action?.trim()) return true;
  if (want === 'verify' && parsed.final_action?.trim()) {
    const goalish = (parsed.actions ?? []).some((a) => /\bverify|confirm\b/i.test(a.step ?? ''));
    return goalish;
  }
  return false;
}

/**
 * Compute the set-based F1 score between expected and observed unique buckets.
 * F1 is the harmonic mean of precision and recall.
 */
export function computeF1(expected: Set<string>, observed: Set<string>): { p: number; r: number; f1: number } {
  if (expected.size === 0) return { p: 1, r: 1, f1: 1 };
  if (observed.size === 0) return { p: 0, r: 0, f1: 0 };
  const intersection = [...expected].filter((e) => observed.has(e)).length;
  const p = intersection / observed.size;
  const r = intersection / expected.size;
  const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
  return { p, r, f1 };
}

/**
 * Robust flow coverage in [0, 1]:
 * Computes the set-based F1 score over unique flow-type buckets.
 * F1 balances precision (not hallucinating incorrect action types) and recall (covering required types).
 * Imputes WCI context buckets when final grounding is correct.
 */
export function scoreFlowCoverage(
  expected: FlowStep[],
  parsed: ParsedPlan,
  approach: ContextKind,
  opts: { correctFinalAction: boolean }
): number {
  if (!expected.length) return 1;

  const expectedTypes = new Set(expected.map((s) => bucketForApproach(approach, s.type)));
  const observed = collectObservedBuckets(parsed, approach, {
    correctFinalAction: opts.correctFinalAction,
    expected,
  });

  return computeF1(expectedTypes, observed).f1;
}
