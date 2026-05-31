import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isWciContextKind, type ContextKind } from './contexts';
import { scoreFlowCoverage, type FlowStep, type ParsedPlan } from './flow-coverage';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const scenariosDir = join(root, 'demo/scenarios');

type TaskFlow = {
  wciFlow: FlowStep[];
  standardFlow: FlowStep[];
};

type ResultRow = {
  scenarioId: string;
  taskId: string;
  approach: ContextKind;
  correctFinalAction: boolean;
  hitDecoy: boolean;
  flowCoverage: number;
  passed: boolean;
  rawResponse?: string;
  tokenEstimate?: number;
  [key: string]: unknown;
};

const taskFlowCache = new Map<string, TaskFlow>();

function parseAgentPlan(raw: string): ParsedPlan {
  const cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? cleaned;
  const start = fence.indexOf('{');
  const end = fence.lastIndexOf('}');
  const jsonCandidate = start >= 0 && end > start ? fence.slice(start, end + 1) : fence;
  try {
    return JSON.parse(jsonCandidate) as ParsedPlan;
  } catch {
    return { actions: [], final_action: cleaned.split('\n')[0]?.trim() };
  }
}

function getTaskFlow(scenarioId: string, taskId: string): TaskFlow {
  const key = `${scenarioId}:${taskId}`;
  const cached = taskFlowCache.get(key);
  if (cached) return cached;

  const metaPath = join(scenariosDir, scenarioId, 'meta.json');
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as {
    tasks?: { multiStep?: Array<{ id: string; wciFlow?: FlowStep[]; standardFlow?: FlowStep[] }> };
  };
  const task = meta.tasks?.multiStep?.find((t) => t.id === taskId);
  const flow: TaskFlow = {
    wciFlow: task?.wciFlow ?? [],
    standardFlow: task?.standardFlow ?? [],
  };
  taskFlowCache.set(key, flow);
  return flow;
}

export function rescoreResultRow(row: ResultRow, minCoverage: number): ResultRow {
  const taskFlow = getTaskFlow(row.scenarioId, row.taskId);
  const flow = isWciContextKind(row.approach) ? taskFlow.wciFlow : taskFlow.standardFlow;
  const parsed = parseAgentPlan(row.rawResponse ?? '');
  const flowCoverage = scoreFlowCoverage(flow, parsed, row.approach, {
    correctFinalAction: row.correctFinalAction,
  });
  const passed =
    row.correctFinalAction && !row.hitDecoy && flowCoverage >= minCoverage;

  return {
    ...row,
    flowCoverage: Number(flowCoverage.toFixed(3)),
    passed,
  };
}

export function rescoreApproachResults(
  results: ResultRow[],
  minCoverage: number
): ResultRow[] {
  return results.map((row) => rescoreResultRow(row, minCoverage));
}
