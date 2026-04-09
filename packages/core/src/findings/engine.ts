import type { Finding, FindingBuildResult, NormalizedRun, WasteAttribution } from '../types.js';
import { sha1 } from '../utils/hash.js';

function createFinding(input: Omit<Finding, 'id'>): Finding {
  return {
    ...input,
    id: sha1(
      `${input.kind}:${input.scope}:${input.scopeId}:${input.title}:${input.costImpactUsd}:${input.summary}`,
    ),
  };
}

function round(value: number) {
  return Number(value.toFixed(6));
}

export function buildFindings(runs: NormalizedRun[]): FindingBuildResult {
  const findings: Finding[] = [];
  const wasteAttributions: WasteAttribution[] = [];
  const allCalls = runs.flatMap((run) => run.calls.map((call) => ({ run, call })));

  const retryCandidates = allCalls.filter(({ call }) => {
    const status = (call.status ?? '').toLowerCase();
    return status.includes('error') || status.includes('fail');
  });

  const retryCost = retryCandidates.reduce((sum, item) => sum + item.call.costUsd, 0);
  if (retryCost > 0) {
    wasteAttributions.push(
      ...retryCandidates.map(({ call }) => ({
        kind: 'retry-waste',
        timestamp: call.timestamp,
        wasteUsd: call.costUsd,
      })),
    );
    findings.push(
      createFinding({
        classification: 'waste',
        confidence: 'high',
        kind: 'retry-waste',
        title: 'Retry waste is consuming measurable spend',
        summary: `${retryCandidates.length} failed call${retryCandidates.length === 1 ? '' : 's'} were followed by additional work, making their spend pure retry overhead.`,
        scope: 'global',
        scopeId: 'all',
        costImpactUsd: round(retryCost),
        details: {
          failedCallCount: retryCandidates.length,
        },
      }),
    );
  }

  for (const run of runs) {
    const maxIteration = Math.max(...run.calls.map((call) => call.iteration ?? 0));
    if (maxIteration >= 7) {
      const loopCalls = run.calls.filter((call) => (call.iteration ?? 0) > 5);
      const loopCost = loopCalls.reduce((sum, call) => sum + call.costUsd, 0);
      wasteAttributions.push(
        ...loopCalls.map((call) => ({
          kind: 'loop-waste',
          timestamp: call.timestamp,
          wasteUsd: call.costUsd,
        })),
      );
      findings.push(
        createFinding({
          classification: 'waste',
          confidence: 'high',
          kind: 'loop-waste',
          title: `Workflow "${run.workflow}" ran beyond efficient loop bounds`,
          summary: `This run reached ${maxIteration} iterations. Xerg treats the spend after iteration 5 as likely loop waste.`,
          scope: 'run',
          scopeId: run.id,
          costImpactUsd: round(loopCost),
          details: {
            workflow: run.workflow,
            maxIteration,
          },
        }),
      );
    }
  }

  const runsByWorkflow = new Map<string, NormalizedRun[]>();
  for (const run of runs) {
    const bucket = runsByWorkflow.get(run.workflow) ?? [];
    bucket.push(run);
    runsByWorkflow.set(run.workflow, bucket);
  }

  for (const [workflow, workflowRuns] of runsByWorkflow.entries()) {
    if (workflowRuns.length >= 3) {
      const totalInputs = workflowRuns.map((run) =>
        run.calls.reduce((sum, call) => sum + call.inputTokens, 0),
      );
      const average = totalInputs.reduce((sum, value) => sum + value, 0) / totalInputs.length;
      const outlierRuns = workflowRuns.filter((run) => {
        const tokens = run.calls.reduce((sum, call) => sum + call.inputTokens, 0);
        return tokens > average * 1.75 && tokens > 1500;
      });

      if (outlierRuns.length > 0) {
        const outlierCost = outlierRuns.reduce((sum, run) => sum + run.totalCostUsd, 0);
        findings.push(
          createFinding({
            classification: 'opportunity',
            confidence: 'medium',
            kind: 'context-outlier',
            title: `Context usage in "${workflow}" is well above its baseline`,
            summary: `Xerg found ${outlierRuns.length} run${outlierRuns.length === 1 ? '' : 's'} in this workflow with input token volume far above the workflow average.`,
            scope: 'workflow',
            scopeId: workflow,
            costImpactUsd: round(outlierCost),
            details: {
              workflow,
              averageInputTokens: round(average),
              outlierRunCount: outlierRuns.length,
            },
          }),
        );
      }
    }

    const idleRuns = workflowRuns.filter((run) =>
      /(heartbeat|cron|monitor|poll)/i.test(run.workflow),
    );
    if (idleRuns.length > 0) {
      const idleCost = idleRuns.reduce((sum, run) => sum + run.totalCostUsd, 0);
      findings.push(
        createFinding({
          classification: 'opportunity',
          confidence: 'medium',
          kind: 'idle-spend',
          title: `Idle or monitoring spend detected in "${workflow}"`,
          summary:
            'This workflow name looks like a recurring heartbeat or monitoring loop. Review whether the cadence and model tier are justified.',
          scope: 'workflow',
          scopeId: workflow,
          costImpactUsd: round(idleCost),
          details: {
            workflow,
          },
        }),
      );
    }

    const downgradeCalls = workflowRuns
      .flatMap((run) => run.calls)
      .filter((call) => {
        return (
          /(opus|gpt-4o|sonnet)/i.test(call.model) &&
          /(heartbeat|cron|monitor|summary|tag|triage)/i.test(call.taskClass ?? workflow)
        );
      });

    if (downgradeCalls.length > 0) {
      const spend = downgradeCalls.reduce((sum, call) => sum + call.costUsd, 0);
      findings.push(
        createFinding({
          classification: 'opportunity',
          confidence: 'low',
          kind: 'candidate-downgrade',
          title: `Candidate model downgrade opportunity in "${workflow}"`,
          summary:
            'An expensive model is being used on a workflow that looks operationally simple. Treat this as an A/B test candidate, not proven waste.',
          scope: 'workflow',
          scopeId: workflow,
          costImpactUsd: round(spend * 0.3),
          details: {
            workflow,
            expensiveCallCount: downgradeCalls.length,
            inspectedSpendUsd: round(spend),
          },
        }),
      );
    }
  }

  return {
    findings: findings.sort((left, right) => right.costImpactUsd - left.costImpactUsd),
    wasteAttributions,
  };
}
