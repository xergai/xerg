export interface WireComparison {
  baselineAuditId: string;
  baselineGeneratedAt: string;
  baselineTotalSpendUsd: number;
  baselineWasteSpendUsd: number;
  baselineStructuralWasteRate: number;
  deltaTotalSpendUsd: number;
  deltaWasteSpendUsd: number;
  deltaStructuralWasteRate: number;
  deltaRunCount: number;
  deltaCallCount: number;
}
