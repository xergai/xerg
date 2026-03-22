export interface XergRecommendation {
  id: string;
  action: 'downgrade_model' | 'reduce_retries' | 'trim_context' | 'collapse_loop' | 'review_idle';
  severity: 'high' | 'medium' | 'low';
  target: {
    workflow: string;
    model?: string;
    taskClass?: string;
  };
  currentCostUsd: number;
  estimatedSavingsUsd: number;
  suggestion: string;
  testCommand?: string;
}
