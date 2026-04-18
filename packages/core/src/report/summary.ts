import { buildRecommendations } from '../recommendations.js';
import type {
  AuditRuntime,
  AuditSummary,
  DetectedSourceFile,
  Finding,
  NormalizedRun,
  SpendBreakdown,
  WasteAttribution,
} from '../types.js';
import { sha1 } from '../utils/hash.js';
import { isoNow } from '../utils/time.js';
import { buildComparisonKey, buildTaxonomyBuckets } from './comparison.js';
import { buildObservedUtcDayRange, buildSpendByDay, buildWasteByDay } from './timeseries.js';

function buildBreakdown(
  items: { key: string; spendUsd: number; observedSpendUsd: number }[],
): SpendBreakdown[] {
  const buckets = new Map<
    string,
    { spendUsd: number; observedSpendUsd: number; callCount: number }
  >();

  for (const item of items) {
    const current = buckets.get(item.key) ?? { spendUsd: 0, observedSpendUsd: 0, callCount: 0 };
    current.spendUsd += item.spendUsd;
    current.observedSpendUsd += item.observedSpendUsd;
    current.callCount += 1;
    buckets.set(item.key, current);
  }

  return Array.from(buckets.entries())
    .map(([key, value]) => {
      const observedShare = value.spendUsd === 0 ? 0 : value.observedSpendUsd / value.spendUsd;
      return {
        key,
        spendUsd: Number(value.spendUsd.toFixed(6)),
        callCount: value.callCount,
        observedShare: Number(observedShare.toFixed(4)),
      };
    })
    .sort((left, right) => right.spendUsd - left.spendUsd);
}

export function buildAuditSummary(input: {
  runtime: AuditRuntime;
  runs: NormalizedRun[];
  findings: Finding[];
  wasteAttributions: WasteAttribution[];
  sources: DetectedSourceFile[];
  since?: string;
  dbPath?: string;
  comparisonKeyOverride?: string;
}): AuditSummary {
  const callCount = input.runs.reduce((sum, run) => sum + run.calls.length, 0);
  const totalSpendUsd = input.runs.reduce((sum, run) => sum + run.totalCostUsd, 0);
  const observedSpendUsd = input.runs.reduce((sum, run) => sum + run.observedCostUsd, 0);
  const estimatedSpendUsd = input.runs.reduce((sum, run) => sum + run.estimatedCostUsd, 0);
  const wasteSpendUsd = input.findings
    .filter((finding) => finding.classification === 'waste')
    .reduce((sum, finding) => sum + finding.costImpactUsd, 0);
  const opportunitySpendUsd = input.findings
    .filter((finding) => finding.classification === 'opportunity')
    .reduce((sum, finding) => sum + finding.costImpactUsd, 0);
  const generatedAt = isoNow();
  const spendByDay = buildSpendByDay(input.runs);
  const observedDays = buildObservedUtcDayRange(input.runs);
  const summary: AuditSummary = {
    auditId: sha1(
      `${generatedAt}:${input.runs.length}:${input.sources.map((source) => source.path).join('|')}`,
    ),
    generatedAt,
    runtime: input.runtime,
    comparisonKey:
      input.comparisonKeyOverride ??
      buildComparisonKey({
        runtime: input.runtime,
        sources: input.sources,
        since: input.since,
      }),
    comparison: null,
    since: input.since,
    runCount: input.runs.length,
    callCount,
    totalSpendUsd: Number(totalSpendUsd.toFixed(6)),
    observedSpendUsd: Number(observedSpendUsd.toFixed(6)),
    estimatedSpendUsd: Number(estimatedSpendUsd.toFixed(6)),
    wasteSpendUsd: Number(wasteSpendUsd.toFixed(6)),
    opportunitySpendUsd: Number(opportunitySpendUsd.toFixed(6)),
    structuralWasteRate: Number(
      (totalSpendUsd === 0 ? 0 : wasteSpendUsd / totalSpendUsd).toFixed(4),
    ),
    wasteByKind: buildTaxonomyBuckets(input.findings, 'waste'),
    opportunityByKind: buildTaxonomyBuckets(input.findings, 'opportunity'),
    spendByWorkflow: buildBreakdown(
      input.runs.map((run) => ({
        key: run.workflow,
        spendUsd: run.totalCostUsd,
        observedSpendUsd: run.observedCostUsd,
      })),
    ),
    spendByModel: buildBreakdown(
      input.runs.flatMap((run) =>
        run.calls.map((call) => ({
          key: `${call.provider}/${call.model}`,
          spendUsd: call.costUsd,
          observedSpendUsd: call.costSource === 'observed' ? call.costUsd : 0,
        })),
      ),
    ),
    spendByDay,
    wasteByDay: buildWasteByDay(input.wasteAttributions, observedDays, wasteSpendUsd),
    findings: input.findings,
    recommendations: [],
    notes: [
      'Cost per outcome is intentionally unavailable in v0. Xerg is measuring waste intelligence only.',
      'Opportunity findings are directional recommendations, not proven waste.',
    ],
    sourceFiles: input.sources,
    dbPath: input.dbPath,
  };

  summary.recommendations = buildRecommendations(summary);

  return summary;
}
