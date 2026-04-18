import type { WireComparison } from './wire-comparison.js';
import type { WireFinding } from './wire-finding.js';
import type { XergRecommendation } from './xerg-recommendation.js';

export const AUDIT_PUSH_PAYLOAD_VERSION = 2 as const;

export type AuditPushPayloadVersion = typeof AUDIT_PUSH_PAYLOAD_VERSION;
export type PushEnvironment = 'local' | 'remote' | 'railway';

export interface FindingTaxonomyBucket {
  kind: string;
  label: string;
  classification: 'waste' | 'opportunity';
  spendUsd: number;
  findingCount: number;
}

export interface SpendBreakdown {
  key: string;
  spendUsd: number;
  callCount: number;
  observedShare: number;
}

export interface DailySpendBreakdown {
  date: string;
  spendUsd: number;
  observedSpendUsd: number;
  estimatedSpendUsd: number;
  callCount: number;
}

export interface DailyWasteBreakdown {
  date: string;
  wasteUsd: number;
}

export interface AuditPushPayload {
  version: AuditPushPayloadVersion;
  summary: {
    auditId: string;
    generatedAt: string;
    comparisonKey: string;
    runCount: number;
    callCount: number;
    totalSpendUsd: number;
    observedSpendUsd: number;
    estimatedSpendUsd: number;
    wasteSpendUsd: number;
    opportunitySpendUsd: number;
    structuralWasteRate: number;
    wasteByKind: FindingTaxonomyBucket[];
    opportunityByKind: FindingTaxonomyBucket[];
    spendByWorkflow: SpendBreakdown[];
    spendByModel: SpendBreakdown[];
    spendByDay: DailySpendBreakdown[];
    wasteByDay: DailyWasteBreakdown[];
    findings: WireFinding[];
    recommendations: XergRecommendation[];
    notes: string[];
    comparison?: WireComparison | null;
  };
  meta: {
    cliVersion: string;
    sourceId: string;
    sourceHost: string;
    environment: PushEnvironment;
    pushedAt: string;
  };
}
