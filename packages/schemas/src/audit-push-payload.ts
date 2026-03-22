import type { WireComparison } from './wire-comparison.js';
import type { WireFinding } from './wire-finding.js';

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

export interface AuditPushPayload {
  version: 1;
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
    findings: WireFinding[];
    notes: string[];
    comparison?: WireComparison | null;
  };
  meta: {
    cliVersion: string;
    sourceId: string;
    sourceHost: string;
    environment: string;
    pushedAt: string;
  };
}
