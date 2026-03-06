import type { AuditSummary, DoctorReport } from '../types.js';

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

function topRows(rows: { key: string; spendUsd: number; observedShare: number }[], limit = 5) {
  return rows.slice(0, limit).map((row) => {
    return `- ${row.key}: ${formatUsd(row.spendUsd)} (${formatPercent(row.observedShare)} observed)`;
  });
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

export function renderDoctorReport(report: DoctorReport) {
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
  ];

  return sections.join('\n');
}

export function renderTerminalSummary(summary: AuditSummary) {
  const wasteFindings = summary.findings.filter((finding) => finding.classification === 'waste');
  const opportunityFindings = summary.findings.filter(
    (finding) => finding.classification === 'opportunity',
  );
  const topWaste = topFinding(summary, 'waste');
  const topOpportunity = topSavingsTest(summary);

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
    'Cost per outcome: N/A (enable outcome tracking in a future release)',
    '',
    '## Top workflows',
    ...topRows(summary.spendByWorkflow),
    '',
    '## Top models',
    ...topRows(summary.spendByModel),
    '',
    '## High-confidence waste',
    ...(wasteFindings.length > 0
      ? wasteFindings.slice(0, 5).map((finding) => {
          return `- ${finding.title}: ${formatUsd(finding.costImpactUsd)} (${finding.confidence})`;
        })
      : ['- none detected']),
    '',
    '## Opportunities',
    ...(opportunityFindings.length > 0
      ? opportunityFindings.slice(0, 5).map((finding) => {
          return `- ${finding.title}: ${formatUsd(finding.costImpactUsd)} (${finding.confidence})`;
        })
      : ['- none detected']),
    '',
    '## What Xerg adds beyond spend visibility',
    ...(topWaste
      ? [`- Biggest confirmed leak: ${topWaste.title}`]
      : ['- No confirmed leak detected']),
    ...(topOpportunity
      ? [`- First savings test: ${topOpportunity.title}`]
      : ['- No optimization tests surfaced']),
    ...(summary.spendByWorkflow[0]
      ? [`- Workflow to inspect first: ${summary.spendByWorkflow[0].key}`]
      : ['- No workflow breakdown available']),
    '',
    '## Notes',
    ...summary.notes.map((note) => `- ${note}`),
  ].join('\n');
}

export function renderMarkdownSummary(summary: AuditSummary) {
  return [
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
    '## Top workflows',
    ...topRows(summary.spendByWorkflow),
    '',
    '## Findings',
    ...summary.findings.slice(0, 10).map((finding) => {
      return `- **${finding.title}** (${finding.classification}, ${finding.confidence}) — ${finding.summary} Estimated impact: ${formatUsd(finding.costImpactUsd)}.`;
    }),
  ].join('\n');
}
