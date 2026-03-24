export interface XergRecommendation {
  id: string;
  findingId: string;
  kind: string;
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  confidence: 'high' | 'medium' | 'low';
  actionType: 'model-switch' | 'cache-config' | 'prompt-trim' | 'dedup' | 'other';
  suggestedChange?: Record<string, unknown>;
}
