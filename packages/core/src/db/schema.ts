import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sourceFiles = sqliteTable('source_files', {
  id: text('id').primaryKey(),
  path: text('path').notNull(),
  kind: text('kind').notNull(),
  fileHash: text('file_hash').notNull(),
  mtimeMs: integer('mtime_ms').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  importedAt: text('imported_at').notNull(),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  sourcePath: text('source_path').notNull(),
  sourceKind: text('source_kind').notNull(),
  timestamp: text('timestamp').notNull(),
  workflow: text('workflow').notNull(),
  environment: text('environment').notNull(),
  tagsJson: text('tags_json').notNull(),
  totalCostUsd: real('total_cost_usd').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  observedCostUsd: real('observed_cost_usd').notNull(),
  estimatedCostUsd: real('estimated_cost_usd').notNull(),
});

export const calls = sqliteTable('calls', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  timestamp: text('timestamp').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  costSource: text('cost_source').notNull(),
  latencyMs: integer('latency_ms'),
  toolCalls: integer('tool_calls').notNull(),
  retries: integer('retries').notNull(),
  attempt: integer('attempt'),
  iteration: integer('iteration'),
  status: text('status'),
  taskClass: text('task_class'),
  cacheHit: integer('cache_hit', { mode: 'boolean' }).notNull(),
  cacheCostUsd: real('cache_cost_usd'),
  metadataJson: text('metadata_json').notNull(),
});

export const findings = sqliteTable('findings', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').notNull(),
  classification: text('classification').notNull(),
  confidence: text('confidence').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  scope: text('scope').notNull(),
  scopeId: text('scope_id').notNull(),
  costImpactUsd: real('cost_impact_usd').notNull(),
  detailsJson: text('details_json').notNull(),
});

export const pricingCatalog = sqliteTable('pricing_catalog', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  effectiveDate: text('effective_date').notNull(),
  inputPer1m: real('input_per_1m').notNull(),
  outputPer1m: real('output_per_1m').notNull(),
  cachedInputPer1m: real('cached_input_per_1m'),
});

export const auditSnapshots = sqliteTable('audit_snapshots', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  summaryJson: text('summary_json').notNull(),
});

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS source_files (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  workflow TEXT NOT NULL,
  environment TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  total_cost_usd REAL NOT NULL,
  total_tokens INTEGER NOT NULL,
  observed_cost_usd REAL NOT NULL,
  estimated_cost_usd REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  cost_source TEXT NOT NULL,
  latency_ms INTEGER,
  tool_calls INTEGER NOT NULL,
  retries INTEGER NOT NULL,
  attempt INTEGER,
  iteration INTEGER,
  status TEXT,
  task_class TEXT,
  cache_hit INTEGER NOT NULL,
  cache_cost_usd REAL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  scope TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  cost_impact_usd REAL NOT NULL,
  details_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_catalog (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  input_per_1m REAL NOT NULL,
  output_per_1m REAL NOT NULL,
  cached_input_per_1m REAL
);

CREATE TABLE IF NOT EXISTS audit_snapshots (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  summary_json TEXT NOT NULL
);
`;
