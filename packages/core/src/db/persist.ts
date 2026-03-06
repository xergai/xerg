import { readFileSync } from 'node:fs';

import type { PersistedAudit } from '../types.js';
import { sha1 } from '../utils/hash.js';
import { isoNow } from '../utils/time.js';
import { createDb } from './client.js';
import { auditSnapshots, calls, findings, pricingCatalog, runs, sourceFiles } from './schema.js';

export function persistAudit(audit: PersistedAudit, dbPath: string) {
  const { db, sqlite } = createDb(dbPath);
  const importedAt = isoNow();
  const pricingRows = audit.pricingCatalog.map((entry) => ({
    ...entry,
    cachedInputPer1m: entry.cachedInputPer1m ?? null,
  }));
  const sourceFileRows = audit.summary.sourceFiles.map((file) => ({
    id: sha1(`${file.path}:${file.mtimeMs}:${file.sizeBytes}`),
    path: file.path,
    kind: file.kind,
    fileHash: sha1(readFileSync(file.path, 'utf8')),
    mtimeMs: Math.trunc(file.mtimeMs),
    sizeBytes: file.sizeBytes,
    importedAt,
  }));
  const runRows = audit.runs.map((run) => ({
    id: run.id,
    sourcePath: run.sourcePath,
    sourceKind: run.sourceKind,
    timestamp: run.timestamp,
    workflow: run.workflow,
    environment: run.environment,
    tagsJson: JSON.stringify(run.tags),
    totalCostUsd: run.totalCostUsd,
    totalTokens: run.totalTokens,
    observedCostUsd: run.observedCostUsd,
    estimatedCostUsd: run.estimatedCostUsd,
  }));
  const callRows = audit.runs.flatMap((run) =>
    run.calls.map((call) => ({
      id: call.id,
      runId: call.runId,
      timestamp: call.timestamp,
      provider: call.provider,
      model: call.model,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      costUsd: call.costUsd,
      costSource: call.costSource,
      latencyMs: call.latencyMs,
      toolCalls: call.toolCalls,
      retries: call.retries,
      attempt: call.attempt,
      iteration: call.iteration,
      status: call.status,
      taskClass: call.taskClass,
      cacheHit: call.cacheHit,
      cacheCostUsd: call.cacheCostUsd,
      metadataJson: JSON.stringify(call.metadata),
    })),
  );
  const findingRows = audit.summary.findings.map((finding) => ({
    id: finding.id,
    auditId: audit.summary.auditId,
    classification: finding.classification,
    confidence: finding.confidence,
    kind: finding.kind,
    title: finding.title,
    summary: finding.summary,
    scope: finding.scope,
    scopeId: finding.scopeId,
    costImpactUsd: finding.costImpactUsd,
    detailsJson: JSON.stringify(finding.details),
  }));

  if (pricingRows.length > 0) {
    db.insert(pricingCatalog).values(pricingRows).onConflictDoNothing().run();
  }

  if (sourceFileRows.length > 0) {
    db.insert(sourceFiles).values(sourceFileRows).onConflictDoNothing().run();
  }

  if (runRows.length > 0) {
    db.insert(runs).values(runRows).onConflictDoNothing().run();
  }

  if (callRows.length > 0) {
    db.insert(calls).values(callRows).onConflictDoNothing().run();
  }

  if (findingRows.length > 0) {
    db.insert(findings).values(findingRows).onConflictDoNothing().run();
  }

  db.insert(auditSnapshots)
    .values({
      id: audit.summary.auditId,
      createdAt: audit.summary.generatedAt,
      summaryJson: JSON.stringify(audit.summary),
    })
    .onConflictDoNothing()
    .run();

  sqlite.close();
}
