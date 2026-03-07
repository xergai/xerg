import type {
  AuditComparison,
  AuditSummary,
  DetectedSourceFile,
  Finding,
  FindingChange,
  FindingClassification,
  FindingTaxonomyBucket,
  SpendBreakdown,
  SpendDelta,
} from '../types.js';
import { sha1 } from '../utils/hash.js';

const FINDING_KIND_LABELS: Record<string, string> = {
  'retry-waste': 'Retry waste',
  'context-outlier': 'Context bloat',
  'loop-waste': 'Loop waste',
  'candidate-downgrade': 'Downgrade candidates',
  'idle-spend': 'Idle waste',
};

function round(value: number) {
  return Number(value.toFixed(6));
}

function normalizeSinceValue(since?: string) {
  if (!since) {
    return 'all';
  }

  const match = since
    .trim()
    .toLowerCase()
    .match(/^(\d+)([mhdw])$/);
  if (!match) {
    return since.trim().toLowerCase();
  }

  return `${Number(match[1])}${match[2]}`;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/');
}

function findSessionsRoot(path: string) {
  const normalized = normalizePath(path);
  const marker = '/sessions/';
  const index = normalized.lastIndexOf(marker);

  if (index >= 0) {
    return normalized.slice(0, index + marker.length - 1);
  }

  return normalized.slice(0, normalized.lastIndexOf('/')) || normalized;
}

function findGatewayRoot(path: string) {
  const normalized = normalizePath(path);
  return normalized.slice(0, normalized.lastIndexOf('/')) || normalized;
}

export function getFindingKindLabel(kind: string) {
  return FINDING_KIND_LABELS[kind] ?? kind;
}

export function getComparisonSourceRoot(source: DetectedSourceFile) {
  if (source.kind === 'sessions') {
    return findSessionsRoot(source.path);
  }

  return findGatewayRoot(source.path);
}

export function buildComparisonKey(input: {
  sources: DetectedSourceFile[];
  since?: string;
}) {
  const kinds = Array.from(new Set(input.sources.map((source) => source.kind))).sort();
  const roots = Array.from(
    new Set(input.sources.map((source) => `${source.kind}:${getComparisonSourceRoot(source)}`)),
  ).sort();

  return sha1(
    JSON.stringify({
      kinds,
      roots,
      since: normalizeSinceValue(input.since),
    }),
  );
}

export function buildTaxonomyBuckets(
  findings: Finding[],
  classification: FindingClassification,
): FindingTaxonomyBucket[] {
  const buckets = new Map<string, FindingTaxonomyBucket>();

  for (const finding of findings) {
    if (finding.classification !== classification) {
      continue;
    }

    const current = buckets.get(finding.kind) ?? {
      kind: finding.kind,
      label: getFindingKindLabel(finding.kind),
      classification,
      spendUsd: 0,
      findingCount: 0,
    };

    current.spendUsd = round(current.spendUsd + finding.costImpactUsd);
    current.findingCount += 1;
    buckets.set(finding.kind, current);
  }

  return Array.from(buckets.values()).sort((left, right) => right.spendUsd - left.spendUsd);
}

function toSpendMap(rows: SpendBreakdown[]) {
  return new Map(rows.map((row) => [row.key, row.spendUsd]));
}

function buildTopSpendDeltas(currentRows: SpendBreakdown[], baselineRows: SpendBreakdown[]) {
  const currentMap = toSpendMap(currentRows);
  const baselineMap = toSpendMap(baselineRows);
  const keys = Array.from(new Set([...currentMap.keys(), ...baselineMap.keys()]));

  return keys
    .map((key) => {
      const baselineSpendUsd = baselineMap.get(key) ?? 0;
      const currentSpendUsd = currentMap.get(key) ?? 0;

      return {
        key,
        baselineSpendUsd: round(baselineSpendUsd),
        currentSpendUsd: round(currentSpendUsd),
        deltaSpendUsd: round(currentSpendUsd - baselineSpendUsd),
      } satisfies SpendDelta;
    })
    .filter((row) => row.deltaSpendUsd !== 0)
    .sort((left, right) => Math.abs(right.deltaSpendUsd) - Math.abs(left.deltaSpendUsd))
    .slice(0, 3);
}

function getFindingIdentity(finding: Finding) {
  return `${finding.kind}:${finding.scope}:${finding.scopeId}`;
}

function sortFindingChanges(changes: FindingChange[]) {
  return changes.sort(
    (left, right) => Math.abs(right.deltaCostImpactUsd) - Math.abs(left.deltaCostImpactUsd),
  );
}

function buildFindingChanges(currentFindings: Finding[], baselineFindings: Finding[]) {
  const currentWaste = currentFindings.filter(
    (finding) => finding.classification === 'waste' && finding.confidence === 'high',
  );
  const baselineWaste = baselineFindings.filter(
    (finding) => finding.classification === 'waste' && finding.confidence === 'high',
  );
  const currentMap = new Map(currentWaste.map((finding) => [getFindingIdentity(finding), finding]));
  const baselineMap = new Map(
    baselineWaste.map((finding) => [getFindingIdentity(finding), finding]),
  );

  const newHighConfidenceWaste: FindingChange[] = [];
  const resolvedHighConfidenceWaste: FindingChange[] = [];
  const worsenedHighConfidenceWaste: FindingChange[] = [];

  for (const [identity, current] of currentMap.entries()) {
    const baseline = baselineMap.get(identity);

    if (!baseline) {
      newHighConfidenceWaste.push({
        kind: current.kind,
        title: current.title,
        scope: current.scope,
        scopeId: current.scopeId,
        currentCostImpactUsd: current.costImpactUsd,
        deltaCostImpactUsd: round(current.costImpactUsd),
      });
      continue;
    }

    const deltaCostImpactUsd = round(current.costImpactUsd - baseline.costImpactUsd);
    if (deltaCostImpactUsd > 0) {
      worsenedHighConfidenceWaste.push({
        kind: current.kind,
        title: current.title,
        scope: current.scope,
        scopeId: current.scopeId,
        baselineCostImpactUsd: baseline.costImpactUsd,
        currentCostImpactUsd: current.costImpactUsd,
        deltaCostImpactUsd,
      });
    }
  }

  for (const [identity, baseline] of baselineMap.entries()) {
    if (currentMap.has(identity)) {
      continue;
    }

    resolvedHighConfidenceWaste.push({
      kind: baseline.kind,
      title: baseline.title,
      scope: baseline.scope,
      scopeId: baseline.scopeId,
      baselineCostImpactUsd: baseline.costImpactUsd,
      deltaCostImpactUsd: round(-baseline.costImpactUsd),
    });
  }

  return {
    newHighConfidenceWaste: sortFindingChanges(newHighConfidenceWaste),
    resolvedHighConfidenceWaste: sortFindingChanges(resolvedHighConfidenceWaste),
    worsenedHighConfidenceWaste: sortFindingChanges(worsenedHighConfidenceWaste),
  };
}

export function hydrateAuditSummary(summary: AuditSummary): AuditSummary {
  return {
    ...summary,
    comparisonKey:
      summary.comparisonKey ??
      buildComparisonKey({
        sources: summary.sourceFiles,
        since: summary.since,
      }),
    comparison: summary.comparison ?? null,
    wasteByKind:
      summary.wasteByKind?.length > 0
        ? summary.wasteByKind
        : buildTaxonomyBuckets(summary.findings, 'waste'),
    opportunityByKind:
      summary.opportunityByKind?.length > 0
        ? summary.opportunityByKind
        : buildTaxonomyBuckets(summary.findings, 'opportunity'),
    notes: summary.notes ?? [],
  };
}

export function buildAuditComparison(
  current: AuditSummary,
  baseline: AuditSummary,
): AuditComparison {
  const workflowDeltas = buildTopSpendDeltas(current.spendByWorkflow, baseline.spendByWorkflow);
  const modelDeltas = buildTopSpendDeltas(current.spendByModel, baseline.spendByModel);

  return {
    baselineAuditId: baseline.auditId,
    baselineGeneratedAt: baseline.generatedAt,
    baselineRunCount: baseline.runCount,
    baselineCallCount: baseline.callCount,
    baselineTotalSpendUsd: baseline.totalSpendUsd,
    baselineObservedSpendUsd: baseline.observedSpendUsd,
    baselineEstimatedSpendUsd: baseline.estimatedSpendUsd,
    baselineWasteSpendUsd: baseline.wasteSpendUsd,
    baselineOpportunitySpendUsd: baseline.opportunitySpendUsd,
    baselineStructuralWasteRate: baseline.structuralWasteRate,
    deltaTotalSpendUsd: round(current.totalSpendUsd - baseline.totalSpendUsd),
    deltaObservedSpendUsd: round(current.observedSpendUsd - baseline.observedSpendUsd),
    deltaEstimatedSpendUsd: round(current.estimatedSpendUsd - baseline.estimatedSpendUsd),
    deltaWasteSpendUsd: round(current.wasteSpendUsd - baseline.wasteSpendUsd),
    deltaOpportunitySpendUsd: round(current.opportunitySpendUsd - baseline.opportunitySpendUsd),
    deltaStructuralWasteRate: round(current.structuralWasteRate - baseline.structuralWasteRate),
    deltaRunCount: current.runCount - baseline.runCount,
    deltaCallCount: current.callCount - baseline.callCount,
    workflowDeltas,
    modelDeltas,
    findingChanges: buildFindingChanges(current.findings, baseline.findings),
  };
}
