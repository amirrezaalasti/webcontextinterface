import fs from 'fs';
import path from 'path';

import type { EvalContext } from './contexts';
import type { ScenarioGroundTruth } from './ground-truth';
import type { ScenarioRunResult } from './report';

export interface LlmLogEntry {
  timestamp: string;
  modelId: string;
  modelName: string;
  openRouterModel: string;
  approach: string;
  scenarioId: string;
  scenarioTitle?: string;
  goal: string;
  groundTruth: {
    wciNodeId: string;
    rawSelectors: string[];
  };
  request: {
    systemPrompt: string;
    userContent: string;
    tokenEstimate: number;
  };
  response: {
    raw: string;
    promptTokens: number;
    completionTokens: number;
    finishReason?: string;
    error?: string;
  };
  evaluation: {
    parsed: string | null;
    correct: boolean;
    hitDecoy: boolean;
    validationError?: string;
  };
}

export class LlmRunLogger {
  readonly runDir: string;

  constructor(baseDir: string, runId?: string) {
    const id =
      runId ??
      new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    this.runDir = path.join(baseDir, id);
    fs.mkdirSync(this.runDir, { recursive: true });
  }

  writeManifest(meta: Record<string, unknown>): void {
    const file = path.join(this.runDir, 'manifest.json');
    fs.writeFileSync(file, JSON.stringify(meta, null, 2), 'utf8');
  }

  logExchange(entry: LlmLogEntry): string {
    const modelDir = path.join(this.runDir, entry.modelId);
    fs.mkdirSync(modelDir, { recursive: true });

    const baseName = `${entry.scenarioId}__${entry.approach}`;
    const jsonPath = path.join(modelDir, `${baseName}.json`);
    const mdPath = path.join(modelDir, `${baseName}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(entry, null, 2), 'utf8');
    fs.writeFileSync(mdPath, formatMarkdownLog(entry), 'utf8');

    return jsonPath;
  }
}

function formatMarkdownLog(e: LlmLogEntry): string {
  const status = e.evaluation.correct ? '✅ correct' : '❌ incorrect';
  return `# ${e.modelName} — ${e.scenarioId} — ${e.approach}

- **Time:** ${e.timestamp}
- **Model:** \`${e.openRouterModel}\`
- **Goal:** ${e.goal}
- **Expected WCI id:** \`${e.groundTruth.wciNodeId}\`
- **Result:** ${status}${e.evaluation.parsed ? ` → \`${e.evaluation.parsed}\`` : ''}
${e.evaluation.validationError ? `- **Validation:** ${e.evaluation.validationError}\n` : ''}
## System prompt

\`\`\`
${e.request.systemPrompt}
\`\`\`

## User message

\`\`\`
${e.request.userContent}
\`\`\`

## Model output

\`\`\`
${e.response.raw || '(empty)'}
\`\`\`

## Usage

- Prompt tokens: ${e.response.promptTokens}
- Completion tokens: ${e.response.completionTokens}
${e.response.finishReason ? `- Finish reason: ${e.response.finishReason}\n` : ''}
`;
}

export function buildLogEntry(params: {
  modelId: string;
  modelName: string;
  openRouterModel: string;
  approach: string;
  scenario: { id: string; title: string; task: { goal: string } };
  gt: ScenarioGroundTruth;
  ctx: EvalContext;
  raw: string;
  promptTokens: number;
  completionTokens: number;
  finishReason?: string;
  error?: string;
  result: ScenarioRunResult;
}): LlmLogEntry {
  return {
    timestamp: new Date().toISOString(),
    modelId: params.modelId,
    modelName: params.modelName,
    openRouterModel: params.openRouterModel,
    approach: params.approach,
    scenarioId: params.scenario.id,
    scenarioTitle: params.scenario.title,
    goal: params.scenario.task.goal,
    groundTruth: {
      wciNodeId: params.gt.wciNodeId,
      rawSelectors: params.gt.rawSelectors,
    },
    request: {
      systemPrompt: params.ctx.systemPrompt,
      userContent: params.ctx.content,
      tokenEstimate: params.ctx.tokenEstimate,
    },
    response: {
      raw: params.raw,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      finishReason: params.finishReason,
      error: params.error,
    },
    evaluation: {
      parsed: params.result.parsed,
      correct: params.result.correct,
      hitDecoy: params.result.hitDecoy,
      validationError: params.result.validationError,
    },
  };
}
