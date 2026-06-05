#!/usr/bin/env tsx
/**
 * Export canonical eval prompts / model / inference settings to demo/public and docs/.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildEvalConfigReport } from '../evals/lib/eval-config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const report = buildEvalConfigReport();

const jsonPath = join(ROOT, 'demo/public/eval-config.json');
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

const md = renderMarkdown(report);
const mdPath = join(ROOT, 'docs/benchmark-eval-config.md');
writeFileSync(mdPath, md);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

function renderMarkdown(r: ReturnType<typeof buildEvalConfigReport>): string {
  const lines: string[] = [
    '# Benchmark evaluation configuration',
    '',
    `Generated from \`evals/lib/eval-config.ts\` at **${r.generatedAt}**.`,
    'Regenerate: `npm run eval:export-config`.',
    '',
    '## Provider',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| API | ${r.provider.name} |`,
    `| Endpoint | \`${r.provider.chatCompletionsUrl}\` |`,
    `| HTTP-Referer | \`${r.provider.httpReferer}\` |`,
    `| X-Title | \`${r.provider.xTitle}\` |`,
    '',
    '## Inference settings',
    '',
    '### Published multi-step (`eval:multistep`)',
    '',
    `| Parameter | Value |`,
    `|-----------|-------|`,
    `| temperature | **${r.inference.multistep.temperature}** |`,
    `| max_tokens | **${r.inference.multistep.maxTokens}** |`,
    `| reasoning.effort | **${r.inference.multistep.reasoning.effort}** |`,
    `| minCoverage (default) | **${r.inference.multistep.minCoverageDefault}** |`,
    `| passRule | **${r.inference.multistep.passRule}** |`,
    '',
    '### Single-shot (`eval:benchmark`, not on demo leaderboard)',
    '',
    `| Parameter | Value |`,
    `|-----------|-------|`,
    `| temperature | **${r.inference.singleShot.temperature}** |`,
    `| max_tokens | **${r.inference.singleShot.maxTokens}** |`,
    `| reasoning.effort | **${r.inference.singleShot.reasoning.effort}** |`,
    '',
    '## Models (OpenRouter slugs)',
    '',
    '| ID | Display name | OpenRouter model | Input $/1M tokens |',
    '|----|--------------|------------------|-------------------|',
  ];

  for (const m of r.models) {
    lines.push(
      `| \`${m.id}\` | ${m.displayName} | \`${m.openRouterModel}\` | ${m.inputPricePer1M ?? '—'} |`
    );
  }

  lines.push(
    '',
    '## Context limits',
    '',
    '### Multi-step',
    '',
    `- raw HTML cap: **${r.contextLimits.multistep.rawHtmlMaxChars}** chars`,
    `- DOM outline: **${r.contextLimits.multistep.domOutlineMaxLines}** lines`,
    `- interactive candidates: **${r.contextLimits.multistep.interactiveCandidatesMax}**`,
    `- WCI pipe budget (grounding): **${r.contextLimits.multistep.wciPipeBudgetCharsGrounding}** chars`,
    `- WCI pipe budget (full): **${r.contextLimits.multistep.wciPipeBudgetCharsFull}** chars`,
    '',
    '### Single-shot',
    '',
    `- raw HTML cap: **${r.contextLimits.singleShot.rawHtmlMaxChars}** chars`,
    `- DOM outline: **${r.contextLimits.singleShot.domOutlineMaxLines}** lines`,
    `- interactive candidates: **${r.contextLimits.singleShot.interactiveCandidatesMax}**`,
    '',
    '## Multi-step system prompts (published leaderboard)',
    ''
  );

  const ms = r.prompts.multistep.systemByApproach as Record<string, string>;
  for (const id of r.methodology.approaches) {
    lines.push(`### \`${id}\``, '', '```', ms[id] ?? '(see eval-config.ts)', '```', '');
  }

  lines.push(
    '## Single-shot system prompts (`eval:benchmark`)',
    ''
  );

  const ss = r.prompts.singleShot.systemByApproach as Record<string, string>;
  for (const [id, prompt] of Object.entries(ss)) {
    lines.push(`### \`${id}\``, '', '```', prompt, '```', '');
  }

  lines.push(
    '## Multi-step user block',
    '',
    'Each call sends one user message built from (in order):',
    '',
    `- \`GOAL:\` task goal`,
    `- \`FLOW:\` expected flow-type bucket sequence (sanitized)`,
    `- up to **${r.contextLimits.multistep.prerequisitesMax}** \`PREREQ:\` lines`,
    `- \`RULE:\` completion criteria (filtered) + scored final_action rule`,
    `- context block (\`WCI_NODES:\`, \`DOM_OUTLINE:\`, \`CANDIDATES:\`, or \`HTML:\`)`,
    `- reply format line`,
    '',
    'Scored final_action rule:',
    '',
    '```',
    r.prompts.multistep.userBlockFormat.scoredFinalActionRule,
    '```',
    '',
    'Reply format suffix:',
    '',
    '```',
    r.prompts.multistep.userBlockFormat.replyJson,
    '```',
    '',
    '## Related',
    '',
    '- Methodology (public summary): [Benchmark overview](./benchmark.md)',
    '- Full developer guide: [`evals/README.md`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/evals/README.md)',
    '- Machine-readable export: [`demo/public/eval-config.json`](https://github.com/amirrezaalasti/webcontextinterface/blob/main/demo/public/eval-config.json)',
    ''
  );

  return lines.join('\n');
}
