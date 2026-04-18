import {
  AUDIT_PUSH_PAYLOAD_VERSION,
  type AuditPushPayload,
  type WireComparison,
  type WireFinding,
} from '@xerg/schemas';

import type { AuditComparison, AuditSummary, Finding, WirePayloadMeta } from './types.js';
import { isoNow } from './utils/time.js';

function toWireFinding(finding: Finding): WireFinding {
  return {
    id: finding.id,
    classification: finding.classification,
    confidence: finding.confidence,
    kind: finding.kind,
    title: finding.title,
    summary: finding.summary,
    scope: finding.scope,
    scopeId: finding.scopeId,
    costImpactUsd: finding.costImpactUsd,
  };
}

function toWireComparison(comparison: AuditComparison): WireComparison {
  return {
    baselineAuditId: comparison.baselineAuditId,
    baselineGeneratedAt: comparison.baselineGeneratedAt,
    baselineTotalSpendUsd: comparison.baselineTotalSpendUsd,
    baselineWasteSpendUsd: comparison.baselineWasteSpendUsd,
    baselineStructuralWasteRate: comparison.baselineStructuralWasteRate,
    deltaTotalSpendUsd: comparison.deltaTotalSpendUsd,
    deltaWasteSpendUsd: comparison.deltaWasteSpendUsd,
    deltaStructuralWasteRate: comparison.deltaStructuralWasteRate,
    deltaRunCount: comparison.deltaRunCount,
    deltaCallCount: comparison.deltaCallCount,
  };
}

export function toWirePayload(summary: AuditSummary, meta: WirePayloadMeta): AuditPushPayload {
  return {
    version: AUDIT_PUSH_PAYLOAD_VERSION,
    summary: {
      auditId: summary.auditId,
      generatedAt: summary.generatedAt,
      comparisonKey: summary.comparisonKey,
      runCount: summary.runCount,
      callCount: summary.callCount,
      totalSpendUsd: summary.totalSpendUsd,
      observedSpendUsd: summary.observedSpendUsd,
      estimatedSpendUsd: summary.estimatedSpendUsd,
      wasteSpendUsd: summary.wasteSpendUsd,
      opportunitySpendUsd: summary.opportunitySpendUsd,
      structuralWasteRate: summary.structuralWasteRate,
      wasteByKind: summary.wasteByKind,
      opportunityByKind: summary.opportunityByKind,
      spendByWorkflow: summary.spendByWorkflow,
      spendByModel: summary.spendByModel,
      spendByDay: summary.spendByDay,
      wasteByDay: summary.wasteByDay,
      findings: summary.findings.map(toWireFinding),
      recommendations: summary.recommendations,
      notes: summary.notes,
      comparison: summary.comparison ? toWireComparison(summary.comparison) : null,
    },
    meta: {
      cliVersion: meta.cliVersion,
      sourceId: meta.sourceId,
      sourceHost: meta.sourceHost,
      environment: meta.environment,
      pushedAt: isoNow(),
    },
  };
}
