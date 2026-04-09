import type { PushEnvironment } from '@xerg/schemas';

export type SourceKind = 'gateway' | 'sessions' | 'cursor-usage-csv';

export type CostSource = 'observed' | 'estimated' | 'unpriced';

export type FindingClassification = 'waste' | 'opportunity';

export type FindingConfidence = 'high' | 'medium' | 'low';

export interface AuditOptions {
  logFile?: string;
  sessionsDir?: string;
  cursorUsageCsv?: string;
  since?: string;
  dbPath?: string;
  noDb?: boolean;
  compare?: boolean;
  comparisonKeyOverride?: string;
  commandPrefix?: string;
  onProgress?: (message: string) => void;
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

export interface PricingCoverageModel {
  key: string;
  callCount: number;
  totalTokens: number;
}

export interface PricingCoverage {
  pricedCallCount: number;
  unpricedCallCount: number;
  pricedTokenCount: number;
  unpricedTokenCount: number;
  topUnpricedModels: PricingCoverageModel[];
}

export interface CursorUsageModeBreakdown {
  key: string;
  callCount: number;
  totalTokens: number;
  estimatedSpendUsd: number;
}

export interface CursorUsageModelBreakdown {
  key: string;
  callCount: number;
  totalTokens: number;
  estimatedSpendUsd: number;
  pricedCallCount: number;
  unpricedCallCount: number;
}

export interface CursorUsageInsights {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalInputWithCacheWriteTokens: number;
  totalInputWithoutCacheWriteTokens: number;
  modes: CursorUsageModeBreakdown[];
  models: CursorUsageModelBreakdown[];
}

export interface CursorUsageCsvDoctorReport {
  canAudit: boolean;
  filePath: string;
  source: DetectedSourceFile | null;
  rowCount: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
  pricingCoverage: PricingCoverage;
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

export interface FindingTaxonomyBucket {
  kind: string;
  label: string;
  classification: FindingClassification;
  spendUsd: number;
  findingCount: number;
}

export interface WasteAttribution {
  kind: string;
  timestamp: string;
  wasteUsd: number;
}

export interface FindingBuildResult {
  findings: Finding[];
  wasteAttributions: WasteAttribution[];
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
  spendByDay: DailySpendBreakdown[];
  wasteByDay: DailyWasteBreakdown[];
  findings: Finding[];
  notes: string[];
  sourceFiles: DetectedSourceFile[];
  pricingCoverage?: PricingCoverage | null;
  cursorUsage?: CursorUsageInsights | null;
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
  environment: PushEnvironment;
}
