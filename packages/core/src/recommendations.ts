import type { XergRecommendation } from '@xerg/schemas';

import type { AuditSummary, Finding } from './types.js';
import { sha1 } from './utils/hash.js';

interface RecommendationTemplate {
  actionType: XergRecommendation['actionType'];
  titleFn: (finding: Finding) => string;
  descriptionFn: (finding: Finding) => string;
  suggestedChangeFn?: (finding: Finding) => Record<string, unknown> | undefined;
}

const templatesByKind: Record<string, RecommendationTemplate> = {
  'retry-waste': {
    actionType: 'other',
    titleFn: () => 'Add retry backoff or reduce retry attempts',
    descriptionFn: (f) =>
      `${f.summary} Consider adding exponential backoff or reducing the maximum retry count to eliminate this overhead.`,
    suggestedChangeFn: (f) => ({
      strategy: 'exponential-backoff',
      maxRetries: 3,
      failedCallCount: (f.details as Record<string, unknown>).failedCallCount,
    }),
  },
  'loop-waste': {
    actionType: 'other',
    titleFn: (f) => `Cap iteration depth for ${extractWorkflow(f)}`,
    descriptionFn: (f) =>
      `${f.summary} Adding an iteration limit or early-exit condition would prevent runaway loops from burning spend.`,
    suggestedChangeFn: (f) => ({
      strategy: 'iteration-cap',
      suggestedMaxIterations: 5,
      observedMaxIteration: (f.details as Record<string, unknown>).maxIteration,
    }),
  },
  'context-outlier': {
    actionType: 'prompt-trim',
    titleFn: (f) => `Trim context for ${extractWorkflow(f)}`,
    descriptionFn: (f) =>
      `${f.summary} Reducing input token volume to near the workflow baseline would lower cost proportionally.`,
    suggestedChangeFn: (f) => ({
      strategy: 'context-reduction',
      averageInputTokens: (f.details as Record<string, unknown>).averageInputTokens,
    }),
  },
  'candidate-downgrade': {
    actionType: 'model-switch',
    titleFn: (f) => `Evaluate cheaper model for ${extractWorkflow(f)}`,
    descriptionFn: (f) =>
      `${f.summary} This is an A/B test candidate — try a cheaper model on this workflow and compare quality.`,
    suggestedChangeFn: () => ({
      strategy: 'model-downgrade',
      candidates: ['claude-3-haiku', 'gpt-4o-mini'],
    }),
  },
  'idle-spend': {
    actionType: 'other',
    titleFn: (f) => `Review cadence for ${extractWorkflow(f)}`,
    descriptionFn: (f) =>
      `${f.summary} Consider reducing polling frequency or switching to an event-driven approach.`,
    suggestedChangeFn: () => ({
      strategy: 'cadence-review',
    }),
  },
};

function extractWorkflow(finding: Finding): string {
  const details = finding.details as Record<string, unknown>;
  return (details.workflow as string) || finding.scopeId || 'this workflow';
}

function buildSingleRecommendation(finding: Finding): XergRecommendation {
  const template = templatesByKind[finding.kind];

  if (template) {
    return {
      id: sha1(`rec:${finding.id}:${template.actionType}`),
      findingId: finding.id,
      kind: finding.kind,
      title: template.titleFn(finding),
      description: template.descriptionFn(finding),
      estimatedSavingsUsd: finding.costImpactUsd,
      confidence: finding.confidence,
      actionType: template.actionType,
      suggestedChange: template.suggestedChangeFn?.(finding),
    };
  }

  return {
    id: sha1(`rec:${finding.id}:other`),
    findingId: finding.id,
    kind: finding.kind,
    title: `Review: ${finding.title}`,
    description: finding.summary,
    estimatedSavingsUsd: finding.costImpactUsd,
    confidence: finding.confidence,
    actionType: 'other',
  };
}

export function buildRecommendations(summary: AuditSummary): XergRecommendation[] {
  return summary.findings.map(buildSingleRecommendation);
}
