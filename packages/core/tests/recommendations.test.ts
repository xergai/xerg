import { describe, expect, it } from 'vitest';

import { buildRecommendations } from '../src/recommendations.js';
import type { AuditSummary, Finding } from '../src/types.js';

function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: overrides.id ?? 'finding-1',
    classification: overrides.classification ?? 'opportunity',
    confidence: overrides.confidence ?? 'medium',
    kind: overrides.kind ?? 'candidate-downgrade',
    title: overrides.title ?? 'Candidate downgrade',
    summary: overrides.summary ?? 'Workflow looks cheap enough for a model downgrade test.',
    scope: overrides.scope ?? 'workflow',
    scopeId: overrides.scopeId ?? 'workflow-a',
    scopeLabel: overrides.scopeLabel ?? 'Workflow A',
    costImpactUsd: overrides.costImpactUsd ?? 10,
    details: overrides.details ?? { workflow: overrides.scopeId ?? 'workflow-a' },
  };
}

function buildSummary(findings: Finding[], totalSpendUsd = 100): AuditSummary {
  return {
    auditId: 'audit-1',
    generatedAt: '2026-04-17T12:00:00.000Z',
    runtime: 'openclaw',
    comparisonKey: 'comparison-key',
    comparison: null,
    since: undefined,
    runCount: 2,
    callCount: 10,
    totalSpendUsd,
    observedSpendUsd: totalSpendUsd,
    estimatedSpendUsd: 0,
    wasteSpendUsd: findings
      .filter((finding) => finding.classification === 'waste')
      .reduce((sum, finding) => sum + finding.costImpactUsd, 0),
    opportunitySpendUsd: findings
      .filter((finding) => finding.classification === 'opportunity')
      .reduce((sum, finding) => sum + finding.costImpactUsd, 0),
    structuralWasteRate: 0.2,
    wasteByKind: [],
    opportunityByKind: [],
    spendByWorkflow: [],
    spendByModel: [],
    spendByDay: [],
    wasteByDay: [],
    findings,
    recommendations: [],
    notes: [],
    sourceFiles: [],
    pricingCoverage: null,
    cursorUsage: null,
    dbPath: undefined,
  };
}

describe('buildRecommendations', () => {
  it('maps findings into ordered v2 recommendations', () => {
    const summary = buildSummary([
      buildFinding({
        id: 'retry-1',
        classification: 'waste',
        confidence: 'high',
        kind: 'retry-waste',
        title: 'Retry waste is consuming measurable spend',
        summary: 'Retries are burning money.',
        scope: 'global',
        scopeId: 'all',
        scopeLabel: 'workspace',
        costImpactUsd: 15,
        details: { failedCallCount: 3 },
      }),
      buildFinding({
        id: 'workflow-1',
        confidence: 'low',
        kind: 'candidate-downgrade',
        costImpactUsd: 12,
      }),
      buildFinding({
        id: 'cursor-1',
        classification: 'waste',
        confidence: 'medium',
        kind: 'cache-carryover',
        title: 'Cache carryover waste',
        summary: 'The chat session is too long.',
        scope: 'global',
        scopeId: 'all',
        scopeLabel: 'Cursor usage',
        costImpactUsd: 5,
      }),
    ]);

    const recommendations = buildRecommendations(summary);

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0]?.priorityBucket).toBe('fix_now');
    expect(recommendations[0]?.implementationSurface).toBe('retry_policy');
    expect(recommendations[0]?.category).toBe('structural_efficiency');
    expect(recommendations[0]?.recommendedOrder).toBe(1);
    expect(recommendations[1]?.priorityBucket).toBe('test_next');
    expect(recommendations[2]?.implementationSurface).toBe('user_behavior');
  });

  it('dedups by kind and stable scope key, keeping the higher-savings recommendation', () => {
    const summary = buildSummary([
      buildFinding({
        id: 'a',
        kind: 'candidate-downgrade',
        scopeId: 'workflow-a',
        scopeLabel: 'Workflow A',
        costImpactUsd: 6,
      }),
      buildFinding({
        id: 'b',
        kind: 'candidate-downgrade',
        scopeId: 'workflow-a',
        scopeLabel: 'Workflow A',
        costImpactUsd: 11,
      }),
    ]);

    const recommendations = buildRecommendations(summary);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.estimatedSavingsUsd).toBe(11);
  });

  it('keeps recommendation IDs stable across audits for the same kind and workflow scope', () => {
    const findingA = buildFinding({
      id: 'audit-a-finding',
      kind: 'loop-waste',
      classification: 'waste',
      confidence: 'high',
      scope: 'run',
      scopeId: 'workflow-a',
      scopeLabel: 'Workflow A',
      costImpactUsd: 7,
      details: { workflow: 'Workflow A', maxIteration: 8 },
    });
    const findingB = buildFinding({
      ...findingA,
      id: 'audit-b-finding',
      costImpactUsd: 9,
      title: 'Workflow A looped again',
    });

    const recommendationsA = buildRecommendations(buildSummary([findingA]));
    const recommendationsB = buildRecommendations(buildSummary([findingB]));

    expect(recommendationsA[0]?.id).toBe(recommendationsB[0]?.id);
  });

  it('rounds estimatedSavingsPct and falls back to watch for unknown kinds', () => {
    const summary = buildSummary(
      [
        buildFinding({
          id: 'unknown-finding',
          kind: 'mystery-kind',
          title: 'Unknown finding',
          summary: 'Something odd happened.',
          confidence: 'low',
          costImpactUsd: 1,
        }),
      ],
      3,
    );

    const recommendations = buildRecommendations(summary);

    expect(recommendations[0]?.priorityBucket).toBe('watch');
    expect(recommendations[0]?.estimatedSavingsPct).toBe(0.3333);
    expect(recommendations[0]?.whereToChange).toContain('Workflow A');
  });
});
