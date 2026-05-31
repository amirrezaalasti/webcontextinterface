/**
 * Generate richer multi-step tasks on top of existing single-shot goals.
 * This keeps backward compatibility (`meta.task`) while adding `meta.tasks`.
 */

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function defaultPrereqs(meta) {
  const out = ['Dismiss overlays if present', 'Stay on current app flow (avoid external navigation)'];
  if ((meta.groundTruth?.decoyNodeIds ?? []).length > 0) {
    out.push('Avoid decoy controls (promo/nav/extra)');
  }
  if ((meta.challenges ?? []).some((c) => /form|validation|disabled|precondition/i.test(c))) {
    out.push('Satisfy form preconditions before final submit');
  }
  return out;
}

function verifyChecks(meta, primarySel) {
  const checks = [
    `Final action uses ground-truth selector: ${primarySel}`,
    `Primary WCI action id: ${meta.groundTruth?.wciNodeId}`,
  ];
  if ((meta.groundTruth?.decoyNodeIds ?? []).length > 0) {
    checks.push(`No decoy ids triggered: ${meta.groundTruth.decoyNodeIds.join(', ')}`);
  }
  return checks;
}

function generatedStandardFlow() {
  return [
    { step: 'Observe page state and locate task-relevant section', type: 'observe' },
    { step: 'Narrow candidate controls using constraints in goal text', type: 'reason' },
    { step: 'Reject promotional/nav decoys and unrelated duplicate CTAs', type: 'guardrail' },
    { step: 'Execute the scored final control for the goal', type: 'act' },
    { step: 'Confirm expected transition or state change', type: 'verify' },
  ];
}

function generatedWciFlow() {
  return [
    { step: 'Read page landmark node and scope context', type: 'read' },
    { step: 'Filter actionable nodes by preconditions/state', type: 'reason' },
    { step: 'Invoke the primary actionable control for the goal', type: 'act' },
    { step: 'Verify ActionResult confirms state transition', type: 'verify' },
  ];
}

function legacyFlowFromTask(meta, key) {
  return (meta.task?.[key] ?? []).map((s) => ({
    step: `${s.action}: ${s.target}`,
    type: s.outcome === 'fail' ? 'error' : s.outcome === 'backtrack' ? 'recovery' : 'act',
    note: s.note,
  }));
}

function buildTaskObject(meta, id, title, goal, standardFlow, wciFlow, opts = {}) {
  const primarySel = meta.groundTruth?.rawSelectors?.[0] ?? 'unknown';
  return {
    id,
    title,
    goal,
    difficulty: opts.difficulty ?? meta.difficulty ?? 'Hard',
    prerequisites: opts.prerequisites ?? defaultPrereqs(meta),
    completionCriteria: verifyChecks(meta, primarySel),
    standardFlow,
    wciFlow,
  };
}

/**
 * @param {object} meta
 * @param {{ legacy?: boolean }} [opts]
 */
export function addMultiStepTasks(meta, opts = {}) {
  const legacy = Boolean(opts.legacy);
  const primarySel = meta.groundTruth?.rawSelectors?.[0] ?? 'unknown';
  const baseGoal = meta.task?.goal ?? meta.description ?? 'Complete the scenario objective.';
  const challenges = uniq(meta.challenges ?? []);
  const topChallenge = challenges[0] ?? 'UI ambiguity';

  let taskA;
  let taskB;

  if (legacy) {
    const standardFromMeta = legacyFlowFromTask(meta, 'standardSteps');
    const wciFromMeta = legacyFlowFromTask(meta, 'agentdomSteps');
    taskA = buildTaskObject(
      meta,
      `${meta.id}.multi-step.primary`,
      'Primary Multi-step Completion',
      `${baseGoal} Complete the flow end-to-end and verify final state without leaving the page.`,
      standardFromMeta.length ? standardFromMeta : generatedStandardFlow(),
      wciFromMeta.length ? wciFromMeta : generatedWciFlow(),
      { difficulty: meta.difficulty ?? 'Very Hard' }
    );
    taskB = buildTaskObject(
      meta,
      `${meta.id}.multi-step.recovery`,
      'Recovery Under Distraction',
      `${baseGoal} Deliberately recover after one decoy interaction and still finish correctly.`,
      [
        { step: 'Trigger one likely decoy or wrong branch', type: 'error' },
        { step: 'Backtrack to correct context', type: 'recovery' },
        { step: 'Execute the scored final control for the goal', type: 'act' },
        { step: 'Verify goal is complete', type: 'verify' },
      ],
      [
        { step: 'Use WCI scope to identify decoy ids up-front', type: 'read' },
        { step: 'Execute the primary actionable control for the goal', type: 'act' },
        { step: 'Confirm action result and terminal state', type: 'verify' },
      ],
      { difficulty: 'Extreme' }
    );
  } else {
    taskA = buildTaskObject(
      meta,
      `${meta.id}.multi-step.primary`,
      'Constraint-driven Completion',
      `${baseGoal} Complete with explicit verification and no decoy interactions.`,
      generatedStandardFlow(),
      generatedWciFlow(),
      { difficulty: meta.difficulty ?? 'Hard' }
    );
    taskB = buildTaskObject(
      meta,
      `${meta.id}.multi-step.validation`,
      'Validation + Final Action',
      `${baseGoal} First validate key constraints (${topChallenge.toLowerCase()}) then execute and verify.`,
      [
        { step: 'Inspect candidate entities/rows/cards relevant to the goal', type: 'observe' },
        { step: 'Validate entity constraints (id/price/time/tier) before acting', type: 'reason' },
        { step: 'Execute the scored final control for the goal', type: 'act' },
        { step: 'Check post-action confirmation state', type: 'verify' },
      ],
      [
        { step: 'Read scoped context and typed state from WCI nodes', type: 'read' },
        { step: 'Validate node preconditions', type: 'reason' },
        { step: 'Invoke the primary actionable control for the goal', type: 'act' },
        { step: 'Verify ActionResult metadata', type: 'verify' },
      ]
    );
  }

  const next = {
    ...meta,
    tasks: {
      singleShot: {
        goal: baseGoal,
        groundTruthSelector: primarySel,
        groundTruthNodeId: meta.groundTruth?.wciNodeId ?? null,
      },
      multiStep: [taskA, taskB],
    },
  };

  return next;
}

