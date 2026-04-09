import { describe, expect, it } from 'vitest';

import {
  AUDIT_PUSH_PAYLOAD_VERSION,
  type AuditPushPayload,
  type XergRecommendation,
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
  });

  it('keeps recommendation action types constrained', () => {
    const recommendation: XergRecommendation = {
      id: 'rec-123',
      findingId: 'finding-123',
      kind: 'candidate-downgrade',
      title: 'Evaluate a cheaper model',
      description: 'Try a lower-cost model and compare quality.',
      estimatedSavingsUsd: 8.4,
      confidence: 'high',
      actionType: 'model-switch',
      suggestedChange: {
        candidate: 'gpt-4o-mini',
      },
    };

    expect(recommendation.actionType).toBe('model-switch');
  });
});
