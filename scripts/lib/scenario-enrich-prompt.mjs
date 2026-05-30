/**
 * Prompts for agentic scenario HTML enrichment.
 */

const DEPTH_GUIDE = {
  light:
    'Add modest realism: 2–4 extra list rows, a short sidebar blurb, footer links, and microcopy. Target ~30% more DOM nodes.',
  medium:
    'Add strong realism: multi-section layout, tables or cards with plausible data, secondary nav items, status chips, empty states. Target ~60–80% more DOM nodes.',
  heavy:
    'Make the page feel production-grade: dense but organized UI (dashboards, feeds, wizards), realistic labels and numbers, nested components, toolbars — still one primary task. Target ~2× DOM depth in main content only.',
};

/**
 * @param {object} params
 * @param {object} params.meta
 * @param {string} params.rawHtml
 * @param {string} params.depth
 * @param {string[]} [params.errors]
 */
export function buildEnrichMessages({ meta, rawHtml, depth, errors = [] }) {
  const gt = meta.groundTruth ?? {};
  const sacred = [];

  const depthGuide = DEPTH_GUIDE[depth] ?? DEPTH_GUIDE.medium;

  const constraints = `
## Sacred elements (DO NOT remove, rename, or break)
- Primary CSS selectors must keep working unchanged:
${(gt.rawSelectors ?? []).map((s) => `  - ${s}`).join('\n')}
- Decoy elements: ${(gt.decoyNodeIds ?? []).map((id) => `[data-decoy="${id}"]`).join(', ') || 'none'}
- App root: [data-page="${meta.id}"] on the main app wrapper (generated scenarios)
- Keep existing class prefix on components (e.g. hf-, np-, vc-) — do not rename BEM blocks
- Keep the entire existing <style> block verbatim (you may append new rules after it, never delete)
- Cookie banner, header chrome, and filler noise sections must remain present

## Task context (for realistic copy only — do not leak into button labels)
Goal: ${meta.task?.goal ?? meta.description}
Challenges: ${(meta.challenges ?? []).join('; ')}

## Enrichment depth
${depthGuide}

## Output
Return ONE complete HTML document only (optionally wrapped in \`\`\`html fences). No commentary outside HTML.
`;

  const repair =
    errors.length > 0
      ? `\n## FIX THESE VALIDATION ERRORS FROM LAST ATTEMPT\n${errors.map((e) => `- ${e}`).join('\n')}\n`
      : '';

  const system = `You are a senior front-end engineer improving synthetic benchmark web pages.
Your job is to make HTML feel like a real product UI while preserving evaluation anchors exactly.
Never remove nodes matched by sacred selectors. Never change data-* attributes on those nodes.
Add sibling/ancestor structure around existing content; prefer expanding lists and side panels over rewriting the primary control.`;

  const user = `${constraints}${repair}

## Current HTML
${rawHtml.length > 120_000 ? `${rawHtml.slice(0, 120_000)}\n<!-- TRUNCATED FOR CONTEXT -->` : rawHtml}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export const DEPTH_LEVELS = Object.keys(DEPTH_GUIDE);
