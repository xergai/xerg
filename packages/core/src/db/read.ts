import { hydrateAuditSummary } from '../report/comparison.js';
import type { AuditSummary } from '../types.js';
import { createDb } from './client.js';

function parseAuditSummary(row: { id: string; summaryJson: string }) {
  try {
    return hydrateAuditSummary(JSON.parse(row.summaryJson) as AuditSummary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`Warning: skipping unreadable audit snapshot ${row.id}: ${message}\n`);
    return null;
  }
}

export function listStoredAuditSummaries(dbPath: string): AuditSummary[] {
  const { sqlite } = createDb(dbPath);

  try {
    const rows = sqlite
      .prepare(
        `
          SELECT id, summary_json AS summaryJson
          FROM audit_snapshots
          ORDER BY created_at DESC
        `,
      )
      .all() as { id: string; summaryJson: string }[];

    return rows
      .map((row) => parseAuditSummary(row))
      .filter((summary): summary is AuditSummary => summary !== null);
  } finally {
    sqlite.close();
  }
}

export function readLatestComparableAuditSummary(input: {
  dbPath: string;
  comparisonKey: string;
  currentAuditId?: string;
}) {
  return listStoredAuditSummaries(input.dbPath).find((summary) => {
    if (input.currentAuditId && summary.auditId === input.currentAuditId) {
      return false;
    }

    return summary.comparisonKey === input.comparisonKey;
  });
}
