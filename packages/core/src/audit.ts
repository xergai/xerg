import { persistAudit } from './db/persist.js';
import { detectOpenClawSources, inspectOpenClawSources } from './detect/openclaw.js';
import { buildFindings } from './findings/engine.js';
import { normalizeOpenClawSources } from './normalize/openclaw.js';
import { PRICING_CATALOG } from './pricing-catalog.js';
import { buildAuditSummary } from './report/summary.js';
import type { AuditOptions } from './types.js';
import { getDefaultDbPath } from './utils/paths.js';

export async function doctorOpenClaw(options: AuditOptions) {
  return inspectOpenClawSources(options);
}

export async function auditOpenClaw(options: AuditOptions) {
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
