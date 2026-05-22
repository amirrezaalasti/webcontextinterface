/** Leaderboard shape consumed by demo/main.ts */
export interface WciLeaderboardBlock {
  successRate: number;
  avgTokens: number;
}

export interface LeaderboardAgentResult {
  /** Raw HTML + DOM outline + candidate-list approaches */
  standard: WciLeaderboardBlock;
  /** WCI actionable-only + eval decision-point state (production grounding) */
  wci: WciLeaderboardBlock;
  /** Full WCI graph, no patches — ablation */
  wciFull: WciLeaderboardBlock;
  /** @deprecated use wci */
  agentDom?: WciLeaderboardBlock;
}

export interface ScenarioRunResult {
  scenarioId: string;
  correct: boolean;
  hitDecoy: boolean;
  parsed: string | null;
  rawResponse: string;
  tokenEstimate: number;
  validationError?: string;
}

export interface ApproachAggregate {
  approach: string;
  runs: number;
  correct: number;
  decoyHits: number;
  successRate: number;
  avgTokens: number;
  byScenario: Record<string, ScenarioRunResult>;
}

export interface ModelAggregate {
  modelId: string;
  modelName: string;
  /** OpenRouter model slug */
  openRouterModel: string;
  approaches: Record<string, ApproachAggregate>;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
}

export interface EvalReport {
  generatedAt: string;
  methodology: string;
  models: ModelAggregate[];
  /** Back-compat for demo leaderboard */
  leaderboard: Record<string, LeaderboardAgentResult>;
  groundTruthVerified: boolean;
}

export function buildLeaderboard(models: ModelAggregate[]): Record<string, LeaderboardAgentResult> {
  const out: Record<string, LeaderboardAgentResult> = {};

  for (const m of models) {
    const raw = m.approaches['raw-html'];
    const wciGrounding =
      m.approaches['wci-grounding'] ?? m.approaches['wci-distilled'];
    const wciFull = m.approaches['wci-full'];
    const outline = m.approaches['dom-outline'];

    const standardApproaches = [raw, outline, m.approaches['interactive-candidates']].filter(Boolean);
    const standardCorrect = standardApproaches.reduce((s, a) => s + a.correct, 0);
    const standardRuns = standardApproaches.reduce((s, a) => s + a.runs, 0);
    const standardTokens = standardApproaches.reduce((s, a) => s + a.avgTokens * a.runs, 0);

    const wciBlock = {
      successRate: wciGrounding?.successRate ?? 0,
      avgTokens: wciGrounding?.avgTokens ?? 0,
    };
    const wciFullBlock = {
      successRate: wciFull?.successRate ?? 0,
      avgTokens: wciFull?.avgTokens ?? 0,
    };
    out[m.modelId] = {
      standard: {
        successRate: standardRuns ? Math.round((standardCorrect / standardRuns) * 100) : 0,
        avgTokens: standardRuns ? Math.round(standardTokens / standardRuns) : 0,
      },
      wci: wciBlock,
      wciFull: wciFullBlock,
      agentDom: wciBlock,
    };
  }

  return out;
}
