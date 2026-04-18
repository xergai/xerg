import type {
  XergRecommendation,
  XergRecommendationCategory,
  XergRecommendationEffort,
  XergRecommendationPriorityBucket,
  XergRecommendationSeverity,
  XergRecommendationSurface,
} from '@xerg/schemas';

import type { AuditSummary, Finding } from './types.js';
import { sha1 } from './utils/hash.js';

interface RecommendationTemplate {
  priorityBucket: XergRecommendationPriorityBucket;
  implementationSurface: XergRecommendationSurface;
  category: XergRecommendationCategory;
  severity: XergRecommendationSeverity;
  effort: XergRecommendationEffort;
  titleFn: (finding: Finding) => string;
  summaryFn: (finding: Finding) => string;
  whereToChangeFn: (finding: Finding) => string;
  validationPlanFn: (finding: Finding) => string;
  actionsFn: (finding: Finding) => string[];
}

const PRIORITY_RANK: Record<XergRecommendationPriorityBucket, number> = {
  fix_now: 2,
  test_next: 1,
  watch: 0,
};

const CONFIDENCE_RANK: Record<XergRecommendation['confidence'], number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function roundCurrency(value: number) {
  return Number(value.toFixed(6));
}

function roundPct(value: number) {
  return Number(value.toFixed(4));
}

function formatScopeLabel(finding: Finding) {
  if (finding.scope === 'global') {
    return 'workspace';
  }

  return finding.scopeLabel?.trim() || finding.scopeId;
}

function normalizeRecommendationScope(finding: Finding): XergRecommendation['scope'] {
  if (finding.scope === 'global') {
    return 'workspace';
  }

  return 'workflow';
}

function stableScopeKeyForFinding(finding: Finding) {
  if (finding.scope === 'global') {
    return 'workspace';
  }

  return finding.scopeId;
}

function resolveScopeId(finding: Finding, scope: XergRecommendation['scope']) {
  return scope === 'workspace' ? 'workspace' : stableScopeKeyForFinding(finding);
}

function dedupKeyForFinding(finding: Finding) {
  const scope = normalizeRecommendationScope(finding);
  return `${finding.kind}:${scope}:${stableScopeKeyForFinding(finding)}`;
}

function recommendationIdForFinding(
  finding: Finding,
  implementationSurface: XergRecommendationSurface,
) {
  const scope = normalizeRecommendationScope(finding);
  return sha1(
    `rec:v2:${finding.kind}:${scope}:${stableScopeKeyForFinding(finding)}:${implementationSurface}`,
  );
}

function compareRecommendations(left: XergRecommendation, right: XergRecommendation) {
  const priorityDelta = PRIORITY_RANK[right.priorityBucket] - PRIORITY_RANK[left.priorityBucket];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  if (right.estimatedSavingsUsd !== left.estimatedSavingsUsd) {
    return right.estimatedSavingsUsd - left.estimatedSavingsUsd;
  }

  const confidenceDelta = CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  return left.title.localeCompare(right.title);
}

const templatesByKind: Record<string, RecommendationTemplate> = {
  'retry-waste': {
    priorityBucket: 'fix_now',
    implementationSurface: 'retry_policy',
    category: 'structural_efficiency',
    severity: 'high',
    effort: 'low',
    titleFn: (finding) => `Reduce retry waste in ${formatScopeLabel(finding)}`,
    summaryFn: (finding) =>
      `${finding.summary} This is confirmed retry overhead, so it is a fix-now issue rather than an experiment.`,
    whereToChangeFn: (finding) =>
      `Reduce retries or add exponential backoff in the retry wrapper for ${formatScopeLabel(finding)}.`,
    validationPlanFn: () =>
      'Ship the change, then rerun `xerg audit --compare --push` against the same source. Retry waste should drop materially on the next audit.',
    actionsFn: () => [
      'Lower max retry count.',
      'Add exponential backoff if none exists.',
      'Log or alert when retries hit the cap.',
    ],
  },
  'loop-waste': {
    priorityBucket: 'fix_now',
    implementationSurface: 'loop_guard',
    category: 'structural_efficiency',
    severity: 'high',
    effort: 'medium',
    titleFn: (finding) => `Cap loop depth in ${formatScopeLabel(finding)}`,
    summaryFn: (finding) =>
      `${finding.summary} This is confirmed loop waste and should be fixed before chasing lower-confidence opportunities.`,
    whereToChangeFn: (finding) =>
      `Cap iteration depth or add an early-exit guard in the loop controller for ${formatScopeLabel(finding)}.`,
    validationPlanFn: () =>
      'Ship the change, then rerun `xerg audit --compare --push`. Loop waste and call volume should fall on the next audit.',
    actionsFn: () => [
      'Add a hard iteration cap.',
      'Add a no-progress exit.',
      'Emit a warning when the cap is hit.',
    ],
  },
  'context-outlier': {
    priorityBucket: 'test_next',
    implementationSurface: 'prompt_builder',
    category: 'context_hygiene',
    severity: 'medium',
    effort: 'medium',
    titleFn: (finding) => `Trim context in ${formatScopeLabel(finding)}`,
    summaryFn: (finding) =>
      `${finding.summary} Treat this as a reversible optimization test rather than proven waste.`,
    whereToChangeFn: (finding) =>
      `Trim input context in the prompt builder for ${formatScopeLabel(finding)}.`,
    validationPlanFn: () =>
      'Ship the change, then rerun `xerg audit --compare --push`. Input tokens and context-related spend should fall.',
    actionsFn: () => [
      'Drop stale context blocks.',
      'Summarize long histories.',
      'Cap prompt size for this workflow.',
    ],
  },
  'idle-spend': {
    priorityBucket: 'test_next',
    implementationSurface: 'scheduler',
    category: 'cadence_activity',
    severity: 'medium',
    effort: 'low',
    titleFn: (finding) => `Review cadence for ${formatScopeLabel(finding)}`,
    summaryFn: (finding) =>
      `${finding.summary} This is usually a scheduling decision, so validate it by lowering or gating activity instead of rewriting the workflow.`,
    whereToChangeFn: (finding) =>
      `Lower cadence or move to event-driven triggers for ${formatScopeLabel(finding)}.`,
    validationPlanFn: () =>
      'Ship the change, then rerun `xerg audit --compare --push`. Idle spend per day should drop.',
    actionsFn: () => [
      'Reduce poll frequency.',
      'Gate runs behind a real trigger.',
      'Disable runs during dead windows.',
    ],
  },
  'candidate-downgrade': {
    priorityBucket: 'test_next',
    implementationSurface: 'model_routing',
    category: 'model_fit',
    severity: 'low',
    effort: 'low',
    titleFn: (finding) => `Evaluate a cheaper model for ${formatScopeLabel(finding)}`,
    summaryFn: (finding) =>
      `${finding.summary} This is an A/B candidate: spend may fall, but quality needs to be checked before rollout.`,
    whereToChangeFn: (finding) =>
      `Re-map ${formatScopeLabel(finding)} to a cheaper model in the routing layer.`,
    validationPlanFn: () =>
      'A/B the cheaper model, then rerun `xerg audit --compare --push`. Confirm spend drops without a quality regression.',
    actionsFn: () => [
      'Try a cheaper model on this workflow.',
      'Compare quality on a labeled sample.',
      'Roll out if acceptable.',
    ],
  },
  'cache-carryover': {
    priorityBucket: 'test_next',
    implementationSurface: 'user_behavior',
    category: 'context_hygiene',
    severity: 'medium',
    effort: 'low',
    titleFn: () => 'Reset or summarize long Cursor chats',
    summaryFn: (finding) =>
      `${finding.summary} This is about session behavior rather than code structure, so the intervention is to reset context more aggressively.`,
    whereToChangeFn: () =>
      'Reset or summarize long Cursor chats instead of continuing the same session.',
    validationPlanFn: () =>
      'Change session behavior, then push a new Cursor usage audit with `--compare --push`. Cache-read share should fall.',
    actionsFn: () => [
      'Summarize context into a short recall note.',
      'Start a fresh chat.',
      'Carry forward only the recall note and necessary facts.',
    ],
  },
  'max-mode-concentration': {
    priorityBucket: 'test_next',
    implementationSurface: 'user_behavior',
    category: 'model_fit',
    severity: 'medium',
    effort: 'low',
    titleFn: () => 'Reserve max mode for the hardest Cursor turns',
    summaryFn: (finding) =>
      `${finding.summary} The likely fix is changing mode habits or escalation rules, not modifying a prompt builder.`,
    whereToChangeFn: () =>
      'Reserve max mode for the hardest Cursor turns; default to standard mode.',
    validationPlanFn: () =>
      'Change your mode defaults, then push a new Cursor usage audit with `--compare --push`. Max-mode spend share should fall.',
    actionsFn: () => [
      'Start in standard mode.',
      'Escalate only when standard fails.',
      'Review any auto-escalation habit.',
    ],
  },
};

const unknownTemplate: RecommendationTemplate = {
  priorityBucket: 'watch',
  implementationSurface: 'other',
  category: 'other',
  severity: 'low',
  effort: 'medium',
  titleFn: (finding) => `Review ${finding.title}`,
  summaryFn: (finding) => finding.summary,
  whereToChangeFn: (finding) => `Review ${formatScopeLabel(finding)} with your operator.`,
  validationPlanFn: () =>
    'Ship any change, then rerun `xerg audit --compare --push` to confirm impact.',
  actionsFn: () => [
    'Investigate the finding details.',
    'Decide whether to act.',
    'Re-audit after the change.',
  ],
};

function buildSingleRecommendation(summary: AuditSummary, finding: Finding): XergRecommendation {
  const template = templatesByKind[finding.kind] ?? unknownTemplate;
  const scope = normalizeRecommendationScope(finding);
  const scopeId = resolveScopeId(finding, scope);
  const scopeLabel = formatScopeLabel(finding);
  const estimatedSavingsPct =
    summary.totalSpendUsd === 0
      ? 0
      : roundPct(Math.min(Math.max(finding.costImpactUsd / summary.totalSpendUsd, 0), 1));

  return {
    id: recommendationIdForFinding(finding, template.implementationSurface),
    findingId: finding.id,
    kind: finding.kind,
    title: template.titleFn(finding),
    summary: template.summaryFn(finding),
    priorityBucket: template.priorityBucket,
    recommendedOrder: 0,
    implementationSurface: template.implementationSurface,
    category: template.category,
    severity: template.severity,
    estimatedSavingsUsd: roundCurrency(finding.costImpactUsd),
    estimatedSavingsPct,
    confidence: finding.confidence,
    effort: template.effort,
    scope,
    scopeId,
    scopeLabel,
    whereToChange: template.whereToChangeFn(finding),
    validationPlan: template.validationPlanFn(finding),
    actions: template.actionsFn(finding),
  };
}

export function buildRecommendations(summary: AuditSummary): XergRecommendation[] {
  const deduped = new Map<string, XergRecommendation>();

  for (const finding of summary.findings) {
    const recommendation = buildSingleRecommendation(summary, finding);
    const key = dedupKeyForFinding(finding);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, recommendation);
      continue;
    }

    if (
      recommendation.estimatedSavingsUsd > existing.estimatedSavingsUsd ||
      (recommendation.estimatedSavingsUsd === existing.estimatedSavingsUsd &&
        CONFIDENCE_RANK[recommendation.confidence] > CONFIDENCE_RANK[existing.confidence])
    ) {
      deduped.set(key, recommendation);
    }
  }

  return [...deduped.values()].sort(compareRecommendations).map((recommendation, index) => ({
    ...recommendation,
    recommendedOrder: index + 1,
  }));
}
