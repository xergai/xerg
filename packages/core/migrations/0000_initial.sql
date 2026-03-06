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

