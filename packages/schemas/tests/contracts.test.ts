import { describe, expect, it } from 'vitest';

import {
  AUDIT_PUSH_PAYLOAD_VERSION,
  type AuditPushPayload,
  type XergRecommendation,
  type XergRecommendationCategory,
  type XergRecommendationConfidence,
  type XergRecommendationEffort,
  type XergRecommendationPriorityBucket,
  type XergRecommendationScope,
  type XergRecommendationSeverity,
  type XergRecommendationSurface,
} from '../src/index.js';

describe('@xerg/schemas contracts', () => {
  it('exposes a versioned push payload contract', () => {
    const payload = {
      version: AUDIT_PUSH_PAYLOAD_VERSION,
      summary: {
        auditId: 'audit-123',
        generatedAt: '2026-03-01T00:00:00.000Z',
        comparisonKey: 'local:default',
        runCount: 1,
        callCount: 2,
        totalSpendUsd: 12.5,
        observedSpendUsd: 10,
        estimatedSpendUsd: 2.5,
        wasteSpendUsd: 4,
        opportunitySpendUsd: 1.2,
        structuralWasteRate: 0.32,
        wasteByKind: [],
        opportunityByKind: [],
        spendByWorkflow: [],
        spendByModel: [],
        spendByDay: [],
        wasteByDay: [],
        findings: [],
        recommendations: [],
        notes: [],
        comparison: null,
      },
      meta: {
        cliVersion: '0.1.4',
        sourceId: 'source-123',
        sourceHost: 'host-123',
        environment: 'local',
        pushedAt: '2026-03-01T00:00:00.000Z',
      },
    } satisfies AuditPushPayload;

    expect(payload.version).toBe(AUDIT_PUSH_PAYLOAD_VERSION);
    expect(payload.meta.environment).toBe('local');
    expect(payload.summary.recommendations).toEqual([]);
  });

  it('exposes the v2 recommendation contract and enum unions', () => {
    const bucket: XergRecommendationPriorityBucket = 'fix_now';
    const surface: XergRecommendationSurface = 'model_routing';
    const category: XergRecommendationCategory = 'model_fit';
    const severity: XergRecommendationSeverity = 'low';
    const confidence: XergRecommendationConfidence = 'high';
    const effort: XergRecommendationEffort = 'low';
    const scope: XergRecommendationScope = 'workflow';
    const recommendation: XergRecommendation = {
      id: 'rec-123',
      findingId: 'finding-123',
      kind: 'candidate-downgrade',
      title: 'Evaluate a cheaper model',
      summary: 'Try a lower-cost model and compare quality.',
      priorityBucket: bucket,
      recommendedOrder: 1,
      implementationSurface: surface,
      category,
      severity,
      estimatedSavingsUsd: 8.4,
      estimatedSavingsPct: 0.1234,
      confidence,
      effort,
      scope,
      scopeId: 'triage',
      scopeLabel: 'triage',
      whereToChange: 'Re-map triage to a cheaper model in the routing layer.',
      validationPlan:
        'A/B the cheaper model, then rerun `xerg audit --compare --push`. Confirm spend drops without a quality regression.',
      actions: ['Try a cheaper model on this workflow.', 'Compare quality on a labeled sample.'],
    };

    expect(recommendation.implementationSurface).toBe('model_routing');
    expect(recommendation.scope).toBe('workflow');
    expect(recommendation.actions).toHaveLength(2);
  });
});
