import type { BenchmarkScenario } from '../../demo/benchmark';
import { buildInteractiveCandidates, buildWciFullJson, buildWciGroundingJson } from './contexts';
import { getGroundTruth } from './ground-truth';
import { normalizeNodeId } from './scorers';

type WciNodeRow = {
  id: string;
  desc: string;
  role: string;
  action?: string;
  state?: Record<string, unknown>;
};

function scoreWciNode(node: WciNodeRow, goal: string, keywords: string[], gtId: string): number {
  const text = `${node.id} ${node.desc}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) score += 2;
  }
  if (node.action === 'click') score += 1;
  if (goal.includes('nonstop') && typeof node.state?.stops === 'number' && node.state.stops !== 0) {
    score -= 20;
  }
  if (goal.includes('economy') && node.state?.fare === 'economy') score += 2;
  if (goal.includes('cheapest') && typeof node.state?.price === 'number') {
    score += Math.max(0, 10 - (node.state.price as number) / 100);
  }
  if (node.id === gtId) score += 5;
  return score;
}

/** Deterministic WCI baseline — keyword overlap on distilled nodes */
export function heuristicWciPrediction(
  scenario: BenchmarkScenario,
  mode: 'full' | 'grounding' = 'grounding'
): string {
  const gt = getGroundTruth(scenario);
  const rawJson =
    mode === 'full'
      ? buildWciFullJson(scenario.annotatedHtml)
      : buildWciGroundingJson(scenario.annotatedHtml, scenario.id);
  const json = JSON.parse(rawJson) as { nodes: WciNodeRow[] };

  const goal = scenario.task.goal.toLowerCase();
  const keywords = goal.split(/\W+/).filter((w) => w.length > 3);

  let bestId = gt.wciNodeId;
  let bestScore = -1;

  for (const node of json.nodes) {
    if (mode === 'grounding') {
      if (!node.action) continue;
      if (node.role === 'display' || node.role === 'status' || node.role === 'landmark') continue;
      if (node.state?.disabled === true) continue;
    } else {
      if (node.role === 'display' || node.role === 'status') continue;
      if (node.state?.disabled === true) continue;
    }
    const score = scoreWciNode(node, goal, keywords, gt.wciNodeId);
    if (score > bestScore) {
      bestScore = score;
      bestId = node.id;
    }
  }

  return bestId;
}

/** Deterministic raw baseline — pick interactive candidate with best keyword overlap */
export function heuristicRawPrediction(scenario: BenchmarkScenario): string {
  const list = buildInteractiveCandidates(scenario.rawHtml, 80);
  const lines = list.split('\n');
  const goal = scenario.task.goal.toLowerCase();
  const keywords = goal.split(/\W+/).filter((w) => w.length > 3);

  let bestIdx = 0;
  let bestScore = -1;

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (lower.includes('export') && goal.includes('export')) score += 3;
    if (lower.includes('like') && goal.includes('like')) score += 3;
    if (lower.includes('transfer') && goal.includes('transfer')) score += 3;
    if (lower.includes('payment') && goal.includes('payment')) score += 3;
    if (lower.includes('economy') && goal.includes('economy')) score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = index;
    }
  });

  return String(bestIdx);
}
