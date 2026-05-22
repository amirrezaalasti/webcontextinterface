import type { BenchmarkScenario } from '../../demo/benchmark';
import generated from '../../demo/scenarios/ground-truth.generated.json';

/** Verified targets for each benchmark scenario (see evals/README.md). */
export interface ScenarioGroundTruth {
  scenarioId: string;
  /** Primary WCI / AgentDOM node id the agent should target */
  wciNodeId: string;
  /** Other node ids that also satisfy the task */
  acceptableNodeIds: string[];
  /** Known wrong targets from scenario narratives (decoy resistance) */
  decoyNodeIds: string[];
  /**
   * CSS selectors that resolve to the correct element in rawHtml.
   * First match used for Playwright validation.
   */
  rawSelectors: string[];
}

export const SCENARIO_GROUND_TRUTH: Record<string, ScenarioGroundTruth> =
  generated as Record<string, ScenarioGroundTruth>;

export function getGroundTruth(scenario: BenchmarkScenario): ScenarioGroundTruth {
  const gt = SCENARIO_GROUND_TRUTH[scenario.id];
  if (!gt) {
    throw new Error(`Missing ground truth for scenario "${scenario.id}". Add it to evals/lib/ground-truth.ts`);
  }
  return gt;
}

/** Fallback: last successful actionable step from scenario script */
export function inferWciNodeIdFromScenario(scenario: BenchmarkScenario): string {
  const actionable = scenario.task.agentdomSteps.filter((s) =>
    ['click', 'fill', 'select', 'check', 'submit'].includes(s.action)
  );
  const last = actionable[actionable.length - 1];
  return last?.target ?? scenario.task.agentdomSteps[scenario.task.agentdomSteps.length - 1].target;
}
