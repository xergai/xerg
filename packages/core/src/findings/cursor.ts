import type {
  Finding,
  FindingBuildResult,
  FindingClassification,
  FindingConfidence,
  NormalizedRun,
} from '../types.js';
import { sha1 } from '../utils/hash.js';

function round(value: number) {
  return Number(value.toFixed(6));
}

function createFinding(input: Omit<Finding, 'id'>): Finding {
  return {
    ...input,
    id: sha1(
      `${input.kind}:${input.scope}:${input.scopeId}:${input.title}:${input.costImpactUsd}:${input.summary}`,
    ),
  };
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asBoolean(value: unknown) {
  return value === true;
}

export function buildCursorUsageFindings(runs: NormalizedRun[]): FindingBuildResult {
  const calls = runs.flatMap((run) => run.calls);
  const billableCalls = calls.filter((call) => call.costUsd > 0);
  if (billableCalls.length === 0) {
    return { findings: [], wasteAttributions: [] };
  }

  const cacheAwareCalls = billableCalls.filter((call) => {
    return asNumber(call.metadata.cacheReadTokens) > 0;
  });
  if (cacheAwareCalls.length === 0) {
    return { findings: [], wasteAttributions: [] };
  }

  const totalSpendUsd = billableCalls.reduce((sum, call) => sum + call.costUsd, 0);
  const totalInputTokens = billableCalls.reduce((sum, call) => sum + call.inputTokens, 0);
  const totalCacheReadTokens = cacheAwareCalls.reduce(
    (sum, call) => sum + asNumber(call.metadata.cacheReadTokens),
    0,
  );
  const totalCacheWriteTokens = billableCalls.reduce(
    (sum, call) => sum + asNumber(call.metadata.inputWithCacheWriteTokens),
    0,
  );
  const cacheSpendUsd = cacheAwareCalls.reduce((sum, call) => sum + (call.cacheCostUsd ?? 0), 0);
  const cacheWriteSpendUsd = billableCalls.reduce(
    (sum, call) => sum + asNumber(call.metadata.cacheWriteCostUsd),
    0,
  );
  const coveredSpendUsd = billableCalls
    .filter((call) => call.cacheCostUsd !== null)
    .reduce((sum, call) => sum + call.costUsd, 0);
  const maxModeSpendUsd = billableCalls
    .filter((call) => asBoolean(call.metadata.maxMode))
    .reduce((sum, call) => sum + call.costUsd, 0);
  const cacheReadShare = totalInputTokens === 0 ? 0 : totalCacheReadTokens / totalInputTokens;
  const cacheCoverageShare = totalSpendUsd === 0 ? 0 : coveredSpendUsd / totalSpendUsd;
  const maxModeSpendShare = totalSpendUsd === 0 ? 0 : maxModeSpendUsd / totalSpendUsd;
  const cacheImpactUsd = round(cacheSpendUsd + cacheWriteSpendUsd);

  const meetsWasteBar =
    cacheImpactUsd >= 25 &&
    cacheReadShare >= 0.6 &&
    cacheAwareCalls.length >= 20 &&
    cacheCoverageShare >= 0.4;
  const meetsOpportunityBar =
    cacheImpactUsd >= 5 &&
    cacheReadShare >= 0.35 &&
    cacheAwareCalls.length >= 10 &&
    cacheCoverageShare >= 0.25;

  if (!meetsWasteBar && !meetsOpportunityBar) {
    return { findings: [], wasteAttributions: [] };
  }

  const classification: FindingClassification = meetsWasteBar ? 'waste' : 'opportunity';

  const confidence: FindingConfidence =
    cacheReadShare >= 0.8 && cacheAwareCalls.length >= 50 && cacheCoverageShare >= 0.5
      ? 'high'
      : cacheReadShare >= 0.5 && cacheAwareCalls.length >= 20
        ? 'medium'
        : 'low';

  const summary =
    classification === 'waste'
      ? `Xerg estimated ${cacheImpactUsd.toFixed(2)} USD of billed spend was driven by repeatedly replaying cached context across ${cacheAwareCalls.length} paid row${cacheAwareCalls.length === 1 ? '' : 's'}. This pattern is consistent with long chats carrying more history than needed.`
      : `Xerg estimated ${cacheImpactUsd.toFixed(2)} USD of billed spend was tied to cached context replay across ${cacheAwareCalls.length} paid row${cacheAwareCalls.length === 1 ? '' : 's'}. Summarizing and resetting long chats could reduce this carryover cost.`;

  const findings: Finding[] = [
    createFinding({
      classification,
      confidence,
      kind: 'cache-carryover',
      title:
        classification === 'waste'
          ? 'Cached context carryover is driving avoidable spend'
          : 'Cached context carryover looks like a strong cost-reduction opportunity',
      summary,
      scope: 'global',
      scopeId: 'all',
      costImpactUsd: cacheImpactUsd,
      details: {
        cacheReadShare: round(cacheReadShare),
        cacheCoverageShare: round(cacheCoverageShare),
        totalCacheReadTokens,
        totalCacheWriteTokens,
        billableCallCount: billableCalls.length,
        cacheAwareCallCount: cacheAwareCalls.length,
        maxModeSpendShare: round(maxModeSpendShare),
        estimatedCacheReadSpendUsd: round(cacheSpendUsd),
        estimatedCacheWriteSpendUsd: round(cacheWriteSpendUsd),
      },
    }),
  ];

  const maxModeCalls = billableCalls.filter((call) => asBoolean(call.metadata.maxMode));
  const maxModeCallShare =
    billableCalls.length === 0 ? 0 : maxModeCalls.length / billableCalls.length;

  if (maxModeSpendShare >= 0.6 && maxModeSpendUsd >= 25 && maxModeCalls.length >= 10) {
    const maxModeConfidence: FindingConfidence =
      maxModeSpendShare >= 0.85 && maxModeCalls.length >= 50
        ? 'high'
        : maxModeSpendShare >= 0.7 && maxModeCalls.length >= 20
          ? 'medium'
          : 'low';

    findings.push(
      createFinding({
        classification: 'opportunity',
        confidence: maxModeConfidence,
        kind: 'max-mode-concentration',
        title: 'Max mode is concentrated in the billed spend mix',
        summary: `Max mode accounts for ${(maxModeSpendShare * 100).toFixed(0)}% of billed spend across ${maxModeCalls.length} paid row${maxModeCalls.length === 1 ? '' : 's'}. This is a strong candidate for splitting work between premium and standard passes.`,
        scope: 'global',
        scopeId: 'all',
        costImpactUsd: round(maxModeSpendUsd * 0.2),
        details: {
          maxModeSpendUsd: round(maxModeSpendUsd),
          maxModeSpendShare: round(maxModeSpendShare),
          maxModeCallCount: maxModeCalls.length,
          maxModeCallShare: round(maxModeCallShare),
        },
      }),
    );
  }

  const wasteAttributions =
    classification === 'waste'
      ? billableCalls
          .map((call) => ({
            kind: 'cache-carryover',
            timestamp: call.timestamp,
            wasteUsd: round((call.cacheCostUsd ?? 0) + asNumber(call.metadata.cacheWriteCostUsd)),
          }))
          .filter((attribution) => attribution.wasteUsd > 0)
      : [];

  return {
    findings: findings.sort((left, right) => right.costImpactUsd - left.costImpactUsd),
    wasteAttributions,
  };
}
