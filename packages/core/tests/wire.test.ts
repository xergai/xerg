import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { auditCursorUsageCsv, auditOpenClaw } from '../src/audit.js';
import type { WirePayloadMeta } from '../src/types.js';
import { toWirePayload } from '../src/wire.js';

const root = process.cwd();
const gatewayLog = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');
const cursorUsageCsv = join(root, 'fixtures', 'cursor', 'usage-sample.csv');

const testMeta: WirePayloadMeta = {
  cliVersion: '0.1.4',
  sourceId: 'test-host',
  sourceHost: 'test-host',
  environment: 'local',
};

describe('toWirePayload', () => {
  it('maps AuditSummary to AuditPushPayload with correct structure', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    const payload = toWirePayload(summary, testMeta);

    expect(payload.version).toBe(1);
    expect(payload.summary.auditId).toBe(summary.auditId);
    expect(payload.summary.generatedAt).toBe(summary.generatedAt);
    expect(payload.summary.comparisonKey).toBe(summary.comparisonKey);
    expect(payload.summary.runCount).toBe(summary.runCount);
    expect(payload.summary.callCount).toBe(summary.callCount);
    expect(payload.summary.totalSpendUsd).toBe(summary.totalSpendUsd);
    expect(payload.summary.observedSpendUsd).toBe(summary.observedSpendUsd);
    expect(payload.summary.estimatedSpendUsd).toBe(summary.estimatedSpendUsd);
    expect(payload.summary.wasteSpendUsd).toBe(summary.wasteSpendUsd);
    expect(payload.summary.opportunitySpendUsd).toBe(summary.opportunitySpendUsd);
    expect(payload.summary.structuralWasteRate).toBe(summary.structuralWasteRate);
    expect(payload.summary.spendByDay).toEqual(summary.spendByDay);
    expect(payload.summary.wasteByDay).toEqual(summary.wasteByDay);
    expect(payload.summary.notes).toEqual(summary.notes);
  });

  it('omits Finding.details from WireFinding', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    const payload = toWirePayload(summary, testMeta);

    expect(summary.findings.length).toBeGreaterThan(0);
    expect(payload.summary.findings.length).toBe(summary.findings.length);

    for (const wireFinding of payload.summary.findings) {
      expect(wireFinding).not.toHaveProperty('details');
      expect(wireFinding).toHaveProperty('id');
      expect(wireFinding).toHaveProperty('classification');
      expect(wireFinding).toHaveProperty('confidence');
      expect(wireFinding).toHaveProperty('kind');
      expect(wireFinding).toHaveProperty('title');
      expect(wireFinding).toHaveProperty('summary');
      expect(wireFinding).toHaveProperty('scope');
      expect(wireFinding).toHaveProperty('scopeId');
      expect(wireFinding).toHaveProperty('costImpactUsd');
    }
  });

  it('omits sourceFiles and dbPath from the payload', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    const payload = toWirePayload(summary, testMeta);

    expect(summary.sourceFiles.length).toBeGreaterThan(0);

    const summaryObj = payload.summary as Record<string, unknown>;
    expect(summaryObj).not.toHaveProperty('sourceFiles');
    expect(summaryObj).not.toHaveProperty('dbPath');
    expect(summaryObj).not.toHaveProperty('since');
  });

  it('keeps cursor-only local fields out of the push payload', async () => {
    const summary = await auditCursorUsageCsv({ cursorUsageCsv, noDb: true });
    const payload = toWirePayload(summary, testMeta);
    const summaryObj = payload.summary as Record<string, unknown>;

    expect(summary.pricingCoverage).not.toBeNull();
    expect(summary.cursorUsage).not.toBeNull();
    expect(summaryObj).not.toHaveProperty('pricingCoverage');
    expect(summaryObj).not.toHaveProperty('cursorUsage');
  });

  it('sets meta fields correctly', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    const payload = toWirePayload(summary, testMeta);

    expect(payload.meta.cliVersion).toBe('0.1.4');
    expect(payload.meta.sourceId).toBe('test-host');
    expect(payload.meta.sourceHost).toBe('test-host');
    expect(payload.meta.environment).toBe('local');
    expect(payload.meta.pushedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps comparison to WireComparison with only expected fields', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });

    summary.comparison = {
      baselineAuditId: 'baseline-123',
      baselineGeneratedAt: '2026-03-01T00:00:00.000Z',
      baselineRunCount: 5,
      baselineCallCount: 10,
      baselineTotalSpendUsd: 1.5,
      baselineObservedSpendUsd: 1.0,
      baselineEstimatedSpendUsd: 0.5,
      baselineWasteSpendUsd: 0.3,
      baselineOpportunitySpendUsd: 0.2,
      baselineStructuralWasteRate: 0.2,
      deltaTotalSpendUsd: -0.5,
      deltaObservedSpendUsd: -0.3,
      deltaEstimatedSpendUsd: -0.2,
      deltaWasteSpendUsd: -0.1,
      deltaOpportunitySpendUsd: -0.05,
      deltaStructuralWasteRate: -0.05,
      deltaRunCount: 2,
      deltaCallCount: 5,
      workflowDeltas: [
        { key: 'wf1', baselineSpendUsd: 1, currentSpendUsd: 0.5, deltaSpendUsd: -0.5 },
      ],
      modelDeltas: [{ key: 'm1', baselineSpendUsd: 1, currentSpendUsd: 0.8, deltaSpendUsd: -0.2 }],
      findingChanges: {
        newHighConfidenceWaste: [],
        resolvedHighConfidenceWaste: [],
        worsenedHighConfidenceWaste: [],
      },
    };

    const payload = toWirePayload(summary, testMeta);
    const wireComp = payload.summary.comparison;

    expect(wireComp).not.toBeNull();
    expect(wireComp?.baselineAuditId).toBe('baseline-123');
    expect(wireComp?.baselineTotalSpendUsd).toBe(1.5);
    expect(wireComp?.baselineWasteSpendUsd).toBe(0.3);
    expect(wireComp?.baselineStructuralWasteRate).toBe(0.2);
    expect(wireComp?.deltaTotalSpendUsd).toBe(-0.5);
    expect(wireComp?.deltaWasteSpendUsd).toBe(-0.1);
    expect(wireComp?.deltaStructuralWasteRate).toBe(-0.05);
    expect(wireComp?.deltaRunCount).toBe(2);
    expect(wireComp?.deltaCallCount).toBe(5);

    const compObj = wireComp as Record<string, unknown>;
    expect(compObj).not.toHaveProperty('workflowDeltas');
    expect(compObj).not.toHaveProperty('modelDeltas');
    expect(compObj).not.toHaveProperty('findingChanges');
    expect(compObj).not.toHaveProperty('baselineObservedSpendUsd');
    expect(compObj).not.toHaveProperty('baselineEstimatedSpendUsd');
    expect(compObj).not.toHaveProperty('baselineOpportunitySpendUsd');
  });

  it('handles null comparison cleanly', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    summary.comparison = null;

    const payload = toWirePayload(summary, testMeta);
    expect(payload.summary.comparison).toBeNull();
  });

  it('maps taxonomy buckets and spend breakdowns through unchanged', async () => {
    const summary = await auditOpenClaw({ logFile: gatewayLog, noDb: true });
    const payload = toWirePayload(summary, testMeta);

    expect(payload.summary.wasteByKind).toEqual(summary.wasteByKind);
    expect(payload.summary.opportunityByKind).toEqual(summary.opportunityByKind);
    expect(payload.summary.spendByWorkflow).toEqual(summary.spendByWorkflow);
    expect(payload.summary.spendByModel).toEqual(summary.spendByModel);
    expect(payload.summary.spendByDay).toEqual(summary.spendByDay);
    expect(payload.summary.wasteByDay).toEqual(summary.wasteByDay);
  });
});
