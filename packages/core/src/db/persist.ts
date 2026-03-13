import { readFileSync } from 'node:fs';

import type { PersistedAudit } from '../types.js';
import { sha1 } from '../utils/hash.js';
import { isoNow } from '../utils/time.js';
import { createDb } from './client.js';

export function persistAudit(audit: PersistedAudit, dbPath: string) {
  const { sqlite } = createDb(dbPath);
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
  const persistTransaction = sqlite.transaction(() => {
    insertMany(
      sqlite,
      `
        INSERT OR IGNORE INTO pricing_catalog (
          id,
          provider,
          model,
          effective_date,
          input_per_1m,
          output_per_1m,
          cached_input_per_1m
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      pricingRows.map((row) => [
        row.id,
        row.provider,
        row.model,
        row.effectiveDate,
        row.inputPer1m,
        row.outputPer1m,
        row.cachedInputPer1m,
      ]),
    );

    insertMany(
      sqlite,
      `
        INSERT OR IGNORE INTO source_files (
          id,
          path,
          kind,
          file_hash,
          mtime_ms,
          size_bytes,
          imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      sourceFileRows.map((row) => [
        row.id,
        row.path,
        row.kind,
        row.fileHash,
        row.mtimeMs,
        row.sizeBytes,
        row.importedAt,
      ]),
    );

    insertMany(
      sqlite,
      `
        INSERT OR IGNORE INTO runs (
          id,
          source_path,
          source_kind,
          timestamp,
          workflow,
          environment,
          tags_json,
          total_cost_usd,
          total_tokens,
          observed_cost_usd,
          estimated_cost_usd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      runRows.map((row) => [
        row.id,
        row.sourcePath,
        row.sourceKind,
        row.timestamp,
        row.workflow,
        row.environment,
        row.tagsJson,
        row.totalCostUsd,
        row.totalTokens,
        row.observedCostUsd,
        row.estimatedCostUsd,
      ]),
    );

    insertMany(
      sqlite,
      `
        INSERT OR IGNORE INTO calls (
          id,
          run_id,
          timestamp,
          provider,
          model,
          input_tokens,
          output_tokens,
          cost_usd,
          cost_source,
          latency_ms,
          tool_calls,
          retries,
          attempt,
          iteration,
          status,
          task_class,
          cache_hit,
          cache_cost_usd,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      callRows.map((row) => [
        row.id,
        row.runId,
        row.timestamp,
        row.provider,
        row.model,
        row.inputTokens,
        row.outputTokens,
        row.costUsd,
        row.costSource,
        row.latencyMs ?? null,
        row.toolCalls,
        row.retries,
        row.attempt ?? null,
        row.iteration ?? null,
        row.status ?? null,
        row.taskClass ?? null,
        row.cacheHit ? 1 : 0,
        row.cacheCostUsd ?? null,
        row.metadataJson,
      ]),
    );

    insertMany(
      sqlite,
      `
        INSERT OR IGNORE INTO findings (
          id,
          audit_id,
          classification,
          confidence,
          kind,
          title,
          summary,
          scope,
          scope_id,
          cost_impact_usd,
          details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      findingRows.map((row) => [
        row.id,
        row.auditId,
        row.classification,
        row.confidence,
        row.kind,
        row.title,
        row.summary,
        row.scope,
        row.scopeId,
        row.costImpactUsd,
        row.detailsJson,
      ]),
    );

    sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO audit_snapshots (
            id,
            created_at,
            summary_json
          ) VALUES (?, ?, ?)
        `,
      )
      .run(audit.summary.auditId, audit.summary.generatedAt, JSON.stringify(audit.summary));
  });

  try {
    persistTransaction();
  } finally {
    sqlite.close();
  }
}

function insertMany(sqlite: ReturnType<typeof createDb>['sqlite'], sql: string, rows: unknown[][]) {
  if (rows.length === 0) {
    return;
  }

  const statement = sqlite.prepare(sql);

  for (const row of rows) {
    statement.run(...row);
  }
}
