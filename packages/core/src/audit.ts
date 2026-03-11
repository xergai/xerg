import { persistAudit } from './db/persist.js';
import { readLatestComparableAuditSummary } from './db/read.js';
import { detectOpenClawSources, inspectOpenClawSources } from './detect/openclaw.js';
import { buildFindings } from './findings/engine.js';
import { normalizeOpenClawSources } from './normalize/openclaw.js';
import { PRICING_CATALOG } from './pricing-catalog.js';
import { buildAuditComparison } from './report/comparison.js';
import { buildAuditSummary } from './report/summary.js';
import type { AuditOptions } from './types.js';
import { getDefaultDbPath } from './utils/paths.js';

export async function doctorOpenClaw(options: AuditOptions) {
  return inspectOpenClawSources(options);
}

export async function auditOpenClaw(options: AuditOptions) {
  if (options.compare && options.noDb) {
    throw new Error(
      'The --compare flag needs local snapshot history. Remove --no-db or provide --db <path>.',
    );
  }

  const sources = await detectOpenClawSources(options);
  if (sources.length === 0) {
    throw new Error(
      'No OpenClaw sources were detected. Run `xerg doctor` or provide --log-file / --sessions-dir.',
    );
  }

  const runs = normalizeOpenClawSources(sources, options.since);
  const findings = buildFindings(runs);
  const dbPath = options.noDb ? undefined : (options.dbPath ?? getDefaultDbPath());
  const summary = buildAuditSummary({
    runs,
    findings,
    sources,
    since: options.since,
    dbPath,
  });

  if (options.compare && dbPath) {
    const baseline = readLatestComparableAuditSummary({
      dbPath,
      comparisonKey: summary.comparisonKey,
      currentAuditId: summary.auditId,
    });

    if (baseline) {
      summary.comparison = buildAuditComparison(summary, baseline);
    } else {
      summary.notes = [
        ...summary.notes,
        'No prior comparable audit was found. Run the same audit again after a fix to unlock before/after deltas.',
      ];
    }
  }

  if (dbPath) {
    persistAudit(
      {
        summary,
        runs,
        pricingCatalog: PRICING_CATALOG,
      },
      dbPath,
    );
  }

  return summary;
}
