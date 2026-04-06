import type {
  AuditSummary,
  DoctorReport,
  Finding,
  FindingChange,
  FindingTaxonomyBucket,
  SpendBreakdown,
  SpendDelta,
} from '../types.js';

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatPercentDelta(value: number) {
  const points = value * 100;
  const sign = points > 0 ? '+' : '';
  return `${sign}${points.toFixed(0)} pts`;
}

function formatUsdDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatUsd(value)}`;
}

function topRows(rows: SpendBreakdown[], limit = 5) {
  return rows.slice(0, limit).map((row) => {
    return `- ${row.key}: ${formatUsd(row.spendUsd)} (${formatPercent(row.observedShare)} observed)`;
  });
}

function renderTaxonomyRows(rows: FindingTaxonomyBucket[], emptyLabel: string, suffix?: string) {
  if (rows.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return rows.map((row) => {
    const countLabel = `${row.findingCount} finding${row.findingCount === 1 ? '' : 's'}`;
    const detail = suffix ? ` ${suffix}` : '';
    return `- ${row.label}: ${formatUsd(row.spendUsd)} across ${countLabel}${detail}`;
  });
}

function renderTaxonomyBlock(summary: AuditSummary) {
  return [
    '## Waste taxonomy',
    'Structural waste',
    ...renderTaxonomyRows(summary.wasteByKind, 'No confirmed waste buckets detected.'),
    'Savings opportunities',
    ...renderTaxonomyRows(
      summary.opportunityByKind,
      'No opportunity buckets detected.',
      '(directional)',
    ),
  ];
}

function topFinding(summary: AuditSummary, classification: 'waste' | 'opportunity') {
  return summary.findings
    .filter((finding) => finding.classification === classification)
    .sort((left, right) => right.costImpactUsd - left.costImpactUsd)[0];
}

function topSavingsTest(summary: AuditSummary) {
  return (
    summary.findings
      .filter((finding) => finding.classification === 'opportunity')
      .sort((left, right) => {
        const leftPriority = left.kind === 'candidate-downgrade' ? 1 : 0;
        const rightPriority = right.kind === 'candidate-downgrade' ? 1 : 0;

        if (leftPriority !== rightPriority) {
          return rightPriority - leftPriority;
        }

        return right.costImpactUsd - left.costImpactUsd;
      })[0] ?? null
  );
}

function renderFindingList(findings: Finding[], emptyLabel: string) {
  if (findings.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return findings.slice(0, 5).map((finding) => {
    return `- ${finding.title}: ${formatUsd(finding.costImpactUsd)} (${finding.confidence})`;
  });
}

function describeSpendDelta(delta: SpendDelta) {
  return `${delta.key} (${formatUsdDelta(delta.deltaSpendUsd)})`;
}

function pickBiggestImprovement(deltas: SpendDelta[]) {
  return deltas
    .filter((delta) => delta.deltaSpendUsd < 0)
    .sort((left, right) => left.deltaSpendUsd - right.deltaSpendUsd)[0];
}

function pickBiggestRegression(deltas: SpendDelta[]) {
  return deltas
    .filter((delta) => delta.deltaSpendUsd > 0)
    .sort((left, right) => right.deltaSpendUsd - left.deltaSpendUsd)[0];
}

function renderFindingChange(change: FindingChange, state: 'new' | 'resolved' | 'worsened') {
  if (state === 'resolved') {
    return `- Resolved: ${change.title} (${formatUsd(change.baselineCostImpactUsd ?? 0)})`;
  }

  if (state === 'worsened') {
    return `- Worsened: ${change.title} (${formatUsdDelta(change.deltaCostImpactUsd)})`;
  }

  return `- New: ${change.title} (${formatUsd(change.currentCostImpactUsd ?? 0)})`;
}

function renderCompareBlock(summary: AuditSummary) {
  if (!summary.comparison) {
    return [];
  }

  const comparison = summary.comparison;
  const biggestImprovement = pickBiggestImprovement(comparison.workflowDeltas);
  const biggestRegression = pickBiggestRegression(comparison.workflowDeltas);
  const firstWorkflowToInspect = biggestRegression?.key ?? summary.spendByWorkflow[0]?.key ?? null;
  const findingChanges = [
    ...comparison.findingChanges.newHighConfidenceWaste.map((change) =>
      renderFindingChange(change, 'new'),
    ),
    ...comparison.findingChanges.resolvedHighConfidenceWaste.map((change) =>
      renderFindingChange(change, 'resolved'),
    ),
    ...comparison.findingChanges.worsenedHighConfidenceWaste.map((change) =>
      renderFindingChange(change, 'worsened'),
    ),
  ].slice(0, 5);

  return [
    '## Before / after',
    `Compared against ${comparison.baselineGeneratedAt}`,
    `- Total spend: ${formatUsd(comparison.baselineTotalSpendUsd)} -> ${formatUsd(summary.totalSpendUsd)} (${formatUsdDelta(comparison.deltaTotalSpendUsd)})`,
    `- Structural waste: ${formatUsd(comparison.baselineWasteSpendUsd)} -> ${formatUsd(summary.wasteSpendUsd)} (${formatUsdDelta(comparison.deltaWasteSpendUsd)})`,
    `- Waste rate: ${formatPercent(comparison.baselineStructuralWasteRate)} -> ${formatPercent(summary.structuralWasteRate)} (${formatPercentDelta(comparison.deltaStructuralWasteRate)})`,
    `- Runs analyzed: ${comparison.baselineRunCount} -> ${summary.runCount} (${comparison.deltaRunCount > 0 ? '+' : ''}${comparison.deltaRunCount})`,
    `- Model calls: ${comparison.baselineCallCount} -> ${summary.callCount} (${comparison.deltaCallCount > 0 ? '+' : ''}${comparison.deltaCallCount})`,
    biggestImprovement
      ? `- Biggest improvement: ${describeSpendDelta(biggestImprovement)}`
      : '- Biggest improvement: none detected',
    biggestRegression
      ? `- Biggest regression: ${describeSpendDelta(biggestRegression)}`
      : '- Biggest regression: none detected',
    firstWorkflowToInspect
      ? `- First workflow to inspect now: ${firstWorkflowToInspect}`
      : '- First workflow to inspect now: no workflow delta available',
    ...(comparison.modelDeltas.length > 0
      ? [`- Model swing to inspect: ${describeSpendDelta(comparison.modelDeltas[0])}`]
      : ['- Model swing to inspect: none']),
    ...(findingChanges.length > 0 ? findingChanges : ['- High-confidence waste changes: none']),
  ];
}

export function renderDoctorReport(report: DoctorReport, options?: { commandPrefix?: string }) {
  const commandPrefix = options?.commandPrefix ?? 'xerg';
  const nextSteps = report.canAudit
    ? []
    : [
        '',
        '## Next steps',
        `- Try explicit local paths: ${commandPrefix} doctor --log-file /path/to/openclaw.log --sessions-dir /path/to/sessions`,
        `- Inspect an SSH host: ${commandPrefix} doctor --remote user@host`,
        `- Inspect a Railway service: ${commandPrefix} doctor --railway`,
        '- Remote audits still analyze locally after Xerg pulls the source files to your machine.',
      ];

  const sections = [
    '# Xerg doctor',
    '',
    report.canAudit ? 'OpenClaw sources detected.' : 'No OpenClaw sources detected.',
    '',
    '## Defaults',
    `- gateway logs: ${report.defaults.gatewayPattern}`,
    `- session files: ${report.defaults.sessionsPattern}`,
    '',
    '## Sources',
    ...(report.sources.length > 0
      ? report.sources.map((source) => `- [${source.kind}] ${source.path}`)
      : ['- none']),
    '',
    '## Notes',
    ...report.notes.map((note) => `- ${note}`),
    ...nextSteps,
  ];

  return sections.join('\n');
}

export function renderTerminalSummary(summary: AuditSummary) {
  const wasteFindings = summary.findings.filter((finding) => finding.classification === 'waste');
  const opportunityFindings = summary.findings.filter(
    (finding) => finding.classification === 'opportunity',
  );
  const topSavings = topSavingsTest(summary);
  const topWaste = topFinding(summary, 'waste');

  return [
    '# Xerg audit',
    '',
    `Total spend: ${formatUsd(summary.totalSpendUsd)}`,
    `Observed spend: ${formatUsd(summary.observedSpendUsd)}`,
    `Estimated spend: ${formatUsd(summary.estimatedSpendUsd)}`,
    `Runs analyzed: ${summary.runCount}`,
    `Model calls: ${summary.callCount}`,
    `Structural waste identified: ${formatUsd(summary.wasteSpendUsd)} (${formatPercent(summary.structuralWasteRate)})`,
    `Potential impact surfaced: ${formatUsd(summary.opportunitySpendUsd)}`,
    '',
    ...renderTaxonomyBlock(summary),
    '',
    '## Top workflows',
    ...topRows(summary.spendByWorkflow),
    '',
    '## Top models',
    ...topRows(summary.spendByModel),
    '',
    '## High-confidence waste',
    ...renderFindingList(wasteFindings, 'none detected'),
    '',
    '## Opportunities',
    ...renderFindingList(opportunityFindings, 'none detected'),
    '',
    '## First savings test',
    ...(topSavings
      ? [
          `- Start with ${topSavings.title}: ${formatUsd(topSavings.costImpactUsd)} of potential impact`,
          `- Why this test first: ${topSavings.summary}`,
        ]
      : ['- No savings test surfaced yet']),
    ...(topWaste
      ? [`- Confirmed leak to close first: ${topWaste.title}`]
      : ['- Confirmed leak to close first: none']),
    ...(summary.spendByWorkflow[0]
      ? [`- Workflow to inspect first: ${summary.spendByWorkflow[0].key}`]
      : ['- Workflow to inspect first: none']),
    '',
    ...renderCompareBlock(summary),
    ...(summary.comparison ? [''] : []),
    '## Notes',
    ...summary.notes.map((note) => `- ${note}`),
  ].join('\n');
}

export function renderMarkdownSummary(summary: AuditSummary) {
  const lines = [
    '# Xerg Audit Report',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Total spend: ${formatUsd(summary.totalSpendUsd)}`,
    `- Observed spend: ${formatUsd(summary.observedSpendUsd)}`,
    `- Estimated spend: ${formatUsd(summary.estimatedSpendUsd)}`,
    `- Structural waste identified: ${formatUsd(summary.wasteSpendUsd)} (${formatPercent(summary.structuralWasteRate)})`,
    `- Potential impact surfaced: ${formatUsd(summary.opportunitySpendUsd)}`,
    `- Runs analyzed: ${summary.runCount}`,
    `- Model calls: ${summary.callCount}`,
    '',
    ...renderTaxonomyBlock(summary),
    '',
    '## Top workflows',
    ...topRows(summary.spendByWorkflow),
    '',
    '## Findings',
    ...summary.findings.slice(0, 10).map((finding) => {
      return `- **${finding.title}** (${finding.classification}, ${finding.confidence}) — ${finding.summary} Estimated impact: ${formatUsd(finding.costImpactUsd)}.`;
    }),
  ];

  if (summary.comparison) {
    const comparison = summary.comparison;
    lines.push(
      '',
      '## Before / after',
      `- Compared against: ${comparison.baselineGeneratedAt}`,
      `- Total spend: ${formatUsd(comparison.baselineTotalSpendUsd)} -> ${formatUsd(summary.totalSpendUsd)} (${formatUsdDelta(comparison.deltaTotalSpendUsd)})`,
      `- Structural waste: ${formatUsd(comparison.baselineWasteSpendUsd)} -> ${formatUsd(summary.wasteSpendUsd)} (${formatUsdDelta(comparison.deltaWasteSpendUsd)})`,
      `- Waste rate: ${formatPercent(comparison.baselineStructuralWasteRate)} -> ${formatPercent(summary.structuralWasteRate)} (${formatPercentDelta(comparison.deltaStructuralWasteRate)})`,
    );
  }

  return lines.join('\n');
}
