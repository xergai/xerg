export interface WireFinding {
  id: string;
  classification: 'waste' | 'opportunity';
  confidence: 'high' | 'medium' | 'low';
  kind: string;
  title: string;
  summary: string;
  scope: string;
  scopeId: string;
  costImpactUsd: number;
}
