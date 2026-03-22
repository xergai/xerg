export type SourceKind = 'gateway' | 'sessions';

export type CostSource = 'observed' | 'estimated';

export type FindingClassification = 'waste' | 'opportunity';

export type FindingConfidence = 'high' | 'medium' | 'low';

export interface AuditOptions {
  logFile?: string;
  sessionsDir?: string;
  since?: string;
  dbPath?: string;
  noDb?: boolean;
  compare?: boolean;
  comparisonKeyOverride?: string;
}

export interface DetectedSourceFile {
  kind: SourceKind;
  path: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface DoctorReport {
  canAudit: boolean;
  sources: DetectedSourceFile[];
  defaults: {
    gatewayPattern: string;
    sessionsPattern: string;
  };
  notes: string[];
}

export interface PricingEntry {
  id: string;
  provider: string;
  model: string;
  effectiveDate: string;
  inputPer1m: number;
  outputPer1m: number;
  cachedInputPer1m?: number;
}

export interface NormalizedCall {
  id: string;
  runId: string;
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costSource: CostSource;
  latencyMs: number | null;
  toolCalls: number;
  retries: number;
  attempt: number | null;
  iteration: number | null;
  status: string | null;
  taskClass: string | null;
  cacheHit: boolean;
  cacheCostUsd: number | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface NormalizedRun {
  id: string;
  sourceKind: SourceKind;
  sourcePath: string;
  timestamp: string;
  workflow: string;
  environment: string;
  tags: Record<string, string | number | boolean>;
  calls: NormalizedCall[];
  totalCostUsd: number;
  totalTokens: number;
  observedCostUsd: number;
  estimatedCostUsd: number;
}

export interface Finding {
  id: string;
  classification: FindingClassification;
  confidence: FindingConfidence;
  kind: string;
  title: string;
  summary: string;
  scope: 'global' | 'workflow' | 'run';
  scopeId: string;
  costImpactUsd: number;
  details: Record<string, unknown>;
}

export interface SpendBreakdown {
  key: string;
  spendUsd: number;
  callCount: number;
  observedShare: number;
}

export interface FindingTaxonomyBucket {
  kind: string;
  label: string;
  classification: FindingClassification;
  spendUsd: number;
  findingCount: number;
}

export interface SpendDelta {
  key: string;
  baselineSpendUsd: number;
  currentSpendUsd: number;
  deltaSpendUsd: number;
}

export interface FindingChange {
  kind: string;
  title: string;
  scope: Finding['scope'];
  scopeId: string;
  baselineCostImpactUsd?: number;
  currentCostImpactUsd?: number;
  deltaCostImpactUsd: number;
}

export interface FindingChanges {
  newHighConfidenceWaste: FindingChange[];
  resolvedHighConfidenceWaste: FindingChange[];
  worsenedHighConfidenceWaste: FindingChange[];
}

export interface AuditComparison {
  baselineAuditId: string;
  baselineGeneratedAt: string;
  baselineRunCount: number;
  baselineCallCount: number;
  baselineTotalSpendUsd: number;
  baselineObservedSpendUsd: number;
  baselineEstimatedSpendUsd: number;
  baselineWasteSpendUsd: number;
  baselineOpportunitySpendUsd: number;
  baselineStructuralWasteRate: number;
  deltaTotalSpendUsd: number;
  deltaObservedSpendUsd: number;
  deltaEstimatedSpendUsd: number;
  deltaWasteSpendUsd: number;
  deltaOpportunitySpendUsd: number;
  deltaStructuralWasteRate: number;
  deltaRunCount: number;
  deltaCallCount: number;
  workflowDeltas: SpendDelta[];
  modelDeltas: SpendDelta[];
  findingChanges: FindingChanges;
}

export interface AuditSummary {
  auditId: string;
  generatedAt: string;
  comparisonKey: string;
  comparison?: AuditComparison | null;
  since?: string;
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
  findings: Finding[];
  notes: string[];
  sourceFiles: DetectedSourceFile[];
  dbPath?: string;
}

export interface PersistedAudit {
  summary: AuditSummary;
  runs: NormalizedRun[];
  pricingCatalog: PricingEntry[];
}

export interface WirePayloadMeta {
  cliVersion: string;
  sourceId: string;
  sourceHost: string;
  environment: string;
}
