export type XergRecommendationPriorityBucket = 'fix_now' | 'test_next' | 'watch';

export type XergRecommendationSurface =
  | 'retry_policy'
  | 'loop_guard'
  | 'model_routing'
  | 'scheduler'
  | 'prompt_builder'
  | 'user_behavior'
  | 'other';

export type XergRecommendationCategory =
  | 'structural_efficiency'
  | 'model_fit'
  | 'context_hygiene'
  | 'cadence_activity'
  | 'other';

export type XergRecommendationSeverity = 'high' | 'medium' | 'low';
export type XergRecommendationConfidence = 'high' | 'medium' | 'low';
export type XergRecommendationEffort = 'low' | 'medium' | 'high';
export type XergRecommendationScope = 'workspace' | 'source' | 'workflow';

export interface XergRecommendation {
  id: string;
  findingId: string;
  kind: string;
  title: string;
  summary: string;
  priorityBucket: XergRecommendationPriorityBucket;
  recommendedOrder: number;
  implementationSurface: XergRecommendationSurface;
  category: XergRecommendationCategory;
  severity: XergRecommendationSeverity;
  estimatedSavingsUsd: number;
  estimatedSavingsPct: number;
  confidence: XergRecommendationConfidence;
  effort: XergRecommendationEffort;
  scope: XergRecommendationScope;
  scopeId: string;
  scopeLabel: string;
  whereToChange: string;
  validationPlan: string;
  actions: string[];
}
