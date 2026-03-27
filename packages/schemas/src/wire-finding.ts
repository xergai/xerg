export type WireFindingScope = 'global' | 'workflow' | 'run';

export interface WireFinding {
  id: string;
  classification: 'waste' | 'opportunity';
  confidence: 'high' | 'medium' | 'low';
  kind: string;
  title: string;
  summary: string;
  scope: WireFindingScope;
  scopeId: string;
  costImpactUsd: number;
}
