import {
  inspectCursorUsageCsv,
  normalizeCursorUsageCsv,
  readCursorUsageCsv,
} from './cursor/usage-csv.js';
import { persistAudit } from './db/persist.js';
import { readLatestComparableAuditSummary } from './db/read.js';
import { buildCursorUsageFindings } from './findings/cursor.js';
import { buildFindings } from './findings/engine.js';
import { PRICING_CATALOG } from './pricing-catalog.js';
import { buildAuditComparison } from './report/comparison.js';
import { buildAuditSummary } from './report/summary.js';
import { doctorAgentRuntime, getRuntimeAdapter, resolveLocalAgentRuntime } from './runtime.js';
import type { AgentRuntime, AuditOptions, AuditSummary, PricingCoverage } from './types.js';
import { getDefaultDbPath } from './utils/paths.js';

export async function doctorOpenClaw(options: AuditOptions) {
  return doctorAgentRuntime({
    ...options,
    runtime: 'openclaw',
  });
}

export async function doctorHermes(options: AuditOptions) {
  return doctorAgentRuntime({
    ...options,
    runtime: 'hermes',
  });
}

export { doctorAgentRuntime };

export async function auditOpenClaw(options: AuditOptions) {
  return auditAgentRuntime({
    ...options,
    runtime: 'openclaw',
  });
}

export async function auditHermes(options: AuditOptions) {
  return auditAgentRuntime({
    ...options,
    runtime: 'hermes',
  });
}

export async function doctorCursorUsageCsv(options: AuditOptions) {
  return inspectCursorUsageCsv(options);
}

function validateCompareOptions(options: AuditOptions) {
  if (options.compare && options.noDb) {
    throw new Error(
      'The --compare flag needs local snapshot history. Remove --no-db or provide --db <path>.',
    );
  }
}

function maybeAttachComparison(
  options: AuditOptions,
  dbPath: string | undefined,
  summary: AuditSummary,
) {
  if (!options.compare || !dbPath) {
    return;
  }

  options.onProgress?.('Looking for a comparable baseline audit...');
  const baseline = readLatestComparableAuditSummary({
    dbPath,
    comparisonKey: summary.comparisonKey,
    currentAuditId: summary.auditId,
  });

  if (!baseline) {
    summary.notes = [
      ...summary.notes,
      'No prior comparable audit was found. Run the same audit again after a fix to unlock before/after deltas.',
    ];
    return;
  }

  summary.comparison = buildAuditComparison(summary, baseline);

  if (hasPricingCoverageChange(summary.pricingCoverage, baseline.pricingCoverage)) {
    summary.notes = [
      ...summary.notes,
      'Pricing coverage changed versus the baseline audit. Spend deltas are directional because different Cursor aliases were priced in each run.',
    ];
  }
}

function persistLocalSnapshot(
  summary: AuditSummary,
  runs: Parameters<typeof persistAudit>[0]['runs'],
  dbPath: string | undefined,
  onProgress?: (message: string) => void,
) {
  if (!dbPath) {
    onProgress?.('Skipping local snapshot persistence (--no-db).');
    return;
  }

  onProgress?.(`Persisting local snapshot to ${dbPath}...`);
  persistAudit(
    {
      summary,
      runs,
      pricingCatalog: PRICING_CATALOG,
    },
    dbPath,
  );
  onProgress?.('Local snapshot stored.');
}

function hasPricingCoverageChange(
  current?: PricingCoverage | null,
  baseline?: PricingCoverage | null,
) {
  if (!current && !baseline) {
    return false;
  }

  return (
    (current?.pricedCallCount ?? 0) !== (baseline?.pricedCallCount ?? 0) ||
    (current?.unpricedCallCount ?? 0) !== (baseline?.unpricedCallCount ?? 0) ||
    (current?.pricedTokenCount ?? 0) !== (baseline?.pricedTokenCount ?? 0) ||
    (current?.unpricedTokenCount ?? 0) !== (baseline?.unpricedTokenCount ?? 0)
  );
}

async function auditResolvedRuntime(
  runtime: AgentRuntime,
  options: AuditOptions,
  detectedSources?: Awaited<ReturnType<typeof resolveLocalAgentRuntime>>['sources'],
) {
  const adapter = getRuntimeAdapter(runtime);
  options.onProgress?.(`Scanning for ${adapter.productName} source files...`);
  validateCompareOptions(options);

  const sources = detectedSources ?? (await adapter.detectSources(options));
  if (sources.length === 0) {
    options.onProgress?.(`No ${adapter.productName} source files were detected.`);
    throw new Error(adapter.noDataError(options.commandPrefix ?? 'xerg'));
  }
  options.onProgress?.(`Detected ${sources.length} source file${sources.length === 1 ? '' : 's'}.`);

  options.onProgress?.(`Normalizing ${adapter.productName} source files...`);
  const runs = adapter.normalizeSources(sources, options.since);
  options.onProgress?.(`Normalized ${runs.length} run${runs.length === 1 ? '' : 's'}.`);
  options.onProgress?.('Computing waste and savings findings...');
  const { findings, wasteAttributions } = buildFindings(runs);
  const dbPath = options.noDb ? undefined : (options.dbPath ?? getDefaultDbPath());
  options.onProgress?.('Building audit summary...');
  const summary = buildAuditSummary({
    runtime,
    runs,
    findings,
    wasteAttributions,
    sources,
    since: options.since,
    dbPath,
    comparisonKeyOverride: options.comparisonKeyOverride,
  });

  maybeAttachComparison(options, dbPath, summary);
  persistLocalSnapshot(summary, runs, dbPath, options.onProgress);

  return summary;
}

export async function auditAgentRuntime(options: AuditOptions) {
  const runtime = options.runtime ?? 'auto';

  if (runtime !== 'auto') {
    return auditResolvedRuntime(runtime, options);
  }

  const resolved = await resolveLocalAgentRuntime(options);
  return auditResolvedRuntime(resolved.adapter.runtime, options, resolved.sources);
}

export async function auditCursorUsageCsv(options: AuditOptions) {
  options.onProgress?.('Reading Cursor usage CSV...');
  validateCompareOptions(options);

  if (!options.cursorUsageCsv) {
    throw new Error('No Cursor usage CSV was provided. Use --cursor-usage-csv <path>.');
  }

  const parsed = readCursorUsageCsv(options.cursorUsageCsv);
  options.onProgress?.(`Loaded Cursor usage CSV: ${parsed.source.path}`);
  options.onProgress?.('Normalizing Cursor usage rows...');
  const normalized = normalizeCursorUsageCsv({
    source: parsed.source,
    rows: parsed.rows,
    hasObservedCostRows: parsed.hasObservedCostRows,
    since: options.since,
  });
  options.onProgress?.(
    `Normalized ${normalized.runs.length} usage row${normalized.runs.length === 1 ? '' : 's'}.`,
  );
  options.onProgress?.('Computing Cursor-specific findings...');
  const { findings, wasteAttributions } = buildCursorUsageFindings(normalized.runs);
  const dbPath = options.noDb ? undefined : (options.dbPath ?? getDefaultDbPath());
  options.onProgress?.('Building audit summary...');
  const summary = buildAuditSummary({
    runtime: 'cursor',
    runs: normalized.runs,
    findings,
    wasteAttributions,
    sources: [parsed.source],
    since: options.since,
    dbPath,
    comparisonKeyOverride: options.comparisonKeyOverride,
  });

  summary.pricingCoverage = normalized.pricingCoverage;
  summary.cursorUsage = normalized.cursorUsage;
  summary.notes = [
    'Cursor CSV audits analyze exported usage rows rather than raw session transcripts.',
    'OpenClaw-specific retry, loop, and session-level workflow findings are still unavailable for Cursor CSV inputs because the export does not include retries, iterations, or real workflow IDs.',
    parsed.hasObservedCostRows
      ? 'Numeric Cost values were used as observed spend. Included rows are treated as zero billed spend in this export mode.'
      : 'This CSV did not include numeric Cost values, so spend was estimated from local model pricing where possible.',
  ];

  if (parsed.rows.length > 0 && normalized.runs.length === 0 && options.since) {
    summary.notes = [
      ...summary.notes,
      `No Cursor usage rows matched the --since window (${options.since}).`,
    ];
  }

  if (normalized.pricingCoverage.unpricedCallCount > 0) {
    const aliases = normalized.pricingCoverage.topUnpricedModels
      .map((model) => model.key)
      .join(', ');
    summary.notes = [
      ...summary.notes,
      `Some Cursor aliases do not have full local pricing coverage: ${aliases || 'unknown aliases'}.`,
    ];
  }

  maybeAttachComparison(options, dbPath, summary);
  persistLocalSnapshot(summary, normalized.runs, dbPath, options.onProgress);

  return summary;
}
