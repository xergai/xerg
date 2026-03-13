import { hydrateAuditSummary } from '../report/comparison.js';
import type { AuditSummary } from '../types.js';
import { createDb } from './client.js';

function parseAuditSummary(summaryJson: string) {
  try {
    return hydrateAuditSummary(JSON.parse(summaryJson) as AuditSummary);
  } catch {
    return null;
  }
}

export function listStoredAuditSummaries(dbPath: string): AuditSummary[] {
  const { sqlite } = createDb(dbPath);

  try {
    const rows = sqlite
      .prepare(
        `
          SELECT summary_json AS summaryJson
          FROM audit_snapshots
          ORDER BY created_at DESC
        `,
      )
      .all() as { summaryJson: string }[];

    return rows
      .map((row) => parseAuditSummary(row.summaryJson))
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
