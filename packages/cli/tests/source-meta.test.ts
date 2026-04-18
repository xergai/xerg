import type { AuditSummary } from '@xergai/core';
import { describe, expect, it } from 'vitest';

import {
  buildCachedPushSourceMeta,
  buildLocalPushSourceMeta,
  buildRemotePushSourceMeta,
} from '../src/source-meta.js';
import type { RemoteSource } from '../src/transport/index.js';

function buildSummary(overrides: Partial<AuditSummary> = {}): AuditSummary {
  return {
    auditId: 'audit_test_123',
    generatedAt: '2026-04-08T12:00:00.000Z',
    runtime: 'openclaw',
    comparisonKey: 'local-default',
    comparison: null,
    since: undefined,
    runCount: 1,
    callCount: 1,
    totalSpendUsd: 1,
    observedSpendUsd: 1,
    estimatedSpendUsd: 0,
    wasteSpendUsd: 0,
    opportunitySpendUsd: 0,
    structuralWasteRate: 0,
    wasteByKind: [],
    opportunityByKind: [],
    spendByWorkflow: [],
    spendByModel: [],
    spendByDay: [],
    wasteByDay: [],
    findings: [],
    recommendations: [],
    notes: [],
    sourceFiles: [],
    pricingCoverage: null,
    cursorUsage: null,
    dbPath: undefined,
    ...overrides,
  };
}

describe('source push metadata', () => {
  it('labels local cursor audits with the Cursor product name', () => {
    expect(buildLocalPushSourceMeta('cursor', 'JackBook-Pro.local')).toEqual({
      environment: 'local',
      sourceId: 'Cursor - JackBook-Pro.local',
      sourceHost: 'JackBook-Pro.local',
    });
  });

  it('labels local OpenClaw audits with the OpenClaw product name', () => {
    expect(buildLocalPushSourceMeta('openclaw', 'workstation.local')).toEqual({
      environment: 'local',
      sourceId: 'OpenClaw - workstation.local',
      sourceHost: 'workstation.local',
    });
  });

  it('labels local Hermes audits with the Hermes product name', () => {
    expect(buildLocalPushSourceMeta('hermes', 'workstation.local')).toEqual({
      environment: 'local',
      sourceId: 'Hermes - workstation.local',
      sourceHost: 'workstation.local',
    });
  });

  it('normalizes railway sources to a clearer product label', () => {
    const source: RemoteSource = {
      name: 'railway-linked',
      transport: 'railway',
      host: 'railway-linked',
    };

    expect(buildRemotePushSourceMeta(source)).toEqual({
      environment: 'railway',
      sourceId: 'OpenClaw - Railway',
      sourceHost: 'Railway',
    });
  });

  it('keeps ssh labels descriptive while preserving the remote host', () => {
    const source: RemoteSource = {
      name: 'prod-api',
      transport: 'ssh',
      host: 'deploy@example.com:2222',
    };

    expect(buildRemotePushSourceMeta(source)).toEqual({
      environment: 'remote',
      sourceId: 'OpenClaw - prod-api',
      sourceHost: 'example.com',
    });
  });

  it('infers cached Cursor audits from the stored source files', () => {
    const summary = buildSummary({
      sourceFiles: [
        {
          kind: 'cursor-usage-csv',
          runtime: 'cursor',
          path: '/tmp/usage.csv',
          sizeBytes: 123,
          mtimeMs: 456,
        },
      ],
    });

    expect(buildCachedPushSourceMeta(summary, 'JackBook-Pro.local')).toEqual({
      environment: 'local',
      sourceId: 'Cursor - JackBook-Pro.local',
      sourceHost: 'JackBook-Pro.local',
    });
  });

  it('infers cached railway audits from the comparison key', () => {
    const summary = buildSummary({
      comparisonKey: 'railway-linked:/tmp/openclaw:~/.openclaw/agents',
    });

    expect(buildCachedPushSourceMeta(summary, 'JackBook-Pro.local')).toEqual({
      environment: 'railway',
      sourceId: 'OpenClaw - Railway',
      sourceHost: 'Railway',
    });
  });

  it('prefers the cached Hermes runtime label when the summary records it', () => {
    const summary = buildSummary({
      runtime: 'hermes',
    });

    expect(buildCachedPushSourceMeta(summary, 'JackBook-Pro.local')).toEqual({
      environment: 'local',
      sourceId: 'Hermes - JackBook-Pro.local',
      sourceHost: 'JackBook-Pro.local',
    });
  });
});
