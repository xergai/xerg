import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  AuditOptions,
  CostSource,
  CursorUsageCsvDoctorReport,
  CursorUsageInsights,
  DetectedSourceFile,
  NormalizedCall,
  NormalizedRun,
  PricingCoverage,
} from '../types.js';
import { sha1 } from '../utils/hash.js';
import { parseSince } from '../utils/time.js';

const REQUIRED_HEADERS = [
  'Date',
  'Kind',
  'Model',
  'Max Mode',
  'Input (w/ Cache Write)',
  'Input (w/o Cache Write)',
  'Cache Read',
  'Output Tokens',
  'Total Tokens',
  'Cost',
] as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

interface CursorAliasPricing {
  provider: string;
  canonicalModel: string;
  inputPer1m: number;
  outputPer1m: number;
  cacheWritePer1m?: number;
  cachedInputPer1m?: number;
}

interface CursorUsageCsvRow {
  timestamp: string;
  kind: string;
  modelAlias: string;
  maxMode: boolean;
  inputWithCacheWriteTokens: number;
  inputWithoutCacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  totalTokens: number;
  costLabel: string;
  observedCostUsd: number | null;
}

interface CursorUsageCsvFile {
  source: DetectedSourceFile;
  rows: CursorUsageCsvRow[];
  headers: string[];
  hasObservedCostRows: boolean;
}

interface CursorRowCostEstimate {
  costUsd: number;
  costSource: CostSource;
  cacheCostUsd: number | null;
  cacheWriteCostUsd: number | null;
  pricing: CursorAliasPricing | null;
  canonicalModelKey: string;
}

const CURSOR_ALIAS_PRICING: Record<string, CursorAliasPricing> = {
  'claude-4.6-opus-high-thinking': {
    provider: 'anthropic',
    canonicalModel: 'claude-opus-4',
    inputPer1m: 15,
    outputPer1m: 75,
    cacheWritePer1m: 18.75,
    cachedInputPer1m: 1.5,
  },
  'claude-4.5-sonnet': {
    provider: 'anthropic',
    canonicalModel: 'claude-sonnet-4-5',
    inputPer1m: 3,
    outputPer1m: 15,
    cacheWritePer1m: 3.75,
    cachedInputPer1m: 0.3,
  },
  'claude-4.5-sonnet-thinking': {
    provider: 'anthropic',
    canonicalModel: 'claude-sonnet-4-5',
    inputPer1m: 3,
    outputPer1m: 15,
    cacheWritePer1m: 3.75,
    cachedInputPer1m: 0.3,
  },
  'claude-4.5-opus-high-thinking': {
    provider: 'anthropic',
    canonicalModel: 'claude-opus-4-5',
    inputPer1m: 5,
    outputPer1m: 25,
    cacheWritePer1m: 6.25,
    cachedInputPer1m: 0.5,
  },
  'gpt-5.1-codex': {
    provider: 'openai',
    canonicalModel: 'gpt-5.1-codex',
    inputPer1m: 1.25,
    outputPer1m: 10,
    cacheWritePer1m: 1.25,
    cachedInputPer1m: 0.125,
  },
  'gpt-5-high-fast': {
    provider: 'openai',
    canonicalModel: 'gpt-5-high-fast',
    inputPer1m: 1.25,
    outputPer1m: 10,
    cacheWritePer1m: 1.25,
    cachedInputPer1m: 0.125,
  },
  'gpt-5': {
    provider: 'openai',
    canonicalModel: 'gpt-5',
    inputPer1m: 1.25,
    outputPer1m: 10,
    cacheWritePer1m: 1.25,
    cachedInputPer1m: 0.125,
  },
};

function round(value: number) {
  return Number(value.toFixed(6));
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseInteger(raw: string, column: RequiredHeader, rowNumber: number) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${column} value "${raw}" on row ${rowNumber}.`);
  }

  return parsed;
}

function parseTimestamp(raw: string, rowNumber: number) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Date value "${raw}" on row ${rowNumber}.`);
  }

  return parsed.toISOString();
}

function parseMaxMode(raw: string) {
  return raw.trim().toLowerCase() === 'yes';
}

function parseObservedCost(raw: string) {
  const value = raw.trim();
  if (value.length === 0 || value === '-' || value.toLowerCase() === 'included') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createDetectedSource(path: string): DetectedSourceFile {
  const resolvedPath = resolve(path);

  try {
    const stats = statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Cursor usage CSV path is not a file: ${resolvedPath}`);
    }

    return {
      kind: 'cursor-usage-csv',
      path: resolvedPath,
      sizeBytes: stats.size,
      mtimeMs: stats.mtimeMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Cursor usage CSV not found: ${path}`;
    throw new Error(message);
  }
}

function validateHeaders(headers: string[]) {
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Cursor usage CSV is missing required headers: ${missing.join(', ')}.`);
  }
}

function parseRow(values: string[], headers: string[], rowNumber: number): CursorUsageCsvRow {
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const costLabel = record.Cost ?? '';

  return {
    timestamp: parseTimestamp(record.Date ?? '', rowNumber),
    kind: record.Kind ?? '',
    modelAlias: record.Model ?? '',
    maxMode: parseMaxMode(record['Max Mode'] ?? ''),
    inputWithCacheWriteTokens: parseInteger(
      record['Input (w/ Cache Write)'] ?? '',
      'Input (w/ Cache Write)',
      rowNumber,
    ),
    inputWithoutCacheWriteTokens: parseInteger(
      record['Input (w/o Cache Write)'] ?? '',
      'Input (w/o Cache Write)',
      rowNumber,
    ),
    cacheReadTokens: parseInteger(record['Cache Read'] ?? '', 'Cache Read', rowNumber),
    outputTokens: parseInteger(record['Output Tokens'] ?? '', 'Output Tokens', rowNumber),
    totalTokens: parseInteger(record['Total Tokens'] ?? '', 'Total Tokens', rowNumber),
    costLabel,
    observedCostUsd: parseObservedCost(costLabel),
  };
}

function parseRows(lines: string[], headers: string[]) {
  const rows: CursorUsageCsvRow[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    rows.push(parseRow(parseCsvLine(line), headers, index + 2));
  }

  return rows;
}

export function readCursorUsageCsv(path: string): CursorUsageCsvFile {
  const source = createDetectedSource(path);
  const content = readFileSync(source.path, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`Cursor usage CSV is empty: ${source.path}`);
  }

  const headers = parseCsvLine(lines[0]);
  validateHeaders(headers);

  const rows = parseRows(lines.slice(1), headers);

  return {
    source,
    rows,
    headers,
    hasObservedCostRows: rows.some((row) => row.observedCostUsd !== null),
  };
}

function isErroredNoCharge(kind: string) {
  const normalized = kind.trim().toLowerCase();
  return (
    (normalized.includes('errored') && normalized.includes('no charge')) ||
    normalized.includes('not charged')
  );
}

function inferProvider(modelAlias: string) {
  const normalized = modelAlias.trim().toLowerCase();

  if (normalized.startsWith('claude-')) {
    return 'anthropic';
  }

  if (normalized.startsWith('gpt-')) {
    return 'openai';
  }

  return 'cursor';
}

function buildModelKey(modelAlias: string, pricing: CursorAliasPricing | null) {
  if (pricing) {
    return `${pricing.provider}/${pricing.canonicalModel}`;
  }

  return `${inferProvider(modelAlias)}/${modelAlias}`;
}

function getWorkflowKey(row: CursorUsageCsvRow) {
  const kind = row.kind.trim().toLowerCase();

  if (kind.includes('on-demand')) {
    return row.maxMode ? 'on-demand / max mode' : 'on-demand / standard mode';
  }

  if (kind.includes('included')) {
    return row.maxMode ? 'included / max mode' : 'included / standard mode';
  }

  if (kind.includes('error') || kind.includes('not charged')) {
    return 'not charged / failed or aborted';
  }

  return row.maxMode ? 'other / max mode' : 'other / standard mode';
}

function estimateCursorRowCost(
  row: CursorUsageCsvRow,
  options: {
    preferObservedCost: boolean;
  },
): CursorRowCostEstimate {
  const pricing = CURSOR_ALIAS_PRICING[row.modelAlias.trim().toLowerCase()] ?? null;

  if (isErroredNoCharge(row.kind)) {
    return {
      costUsd: 0,
      costSource: 'observed',
      cacheCostUsd: 0,
      cacheWriteCostUsd: 0,
      pricing,
      canonicalModelKey: buildModelKey(row.modelAlias, pricing),
    };
  }

  if (options.preferObservedCost) {
    if (row.observedCostUsd !== null) {
      const cacheCost =
        row.cacheReadTokens > 0 && pricing?.cachedInputPer1m !== undefined
          ? round((row.cacheReadTokens / 1_000_000) * pricing.cachedInputPer1m)
          : null;
      const cacheWriteCost =
        row.inputWithCacheWriteTokens > 0 && pricing
          ? round(
              (row.inputWithCacheWriteTokens / 1_000_000) *
                (pricing.cacheWritePer1m ?? pricing.inputPer1m),
            )
          : null;

      return {
        costUsd: row.observedCostUsd,
        costSource: 'observed',
        cacheCostUsd: cacheCost,
        cacheWriteCostUsd: cacheWriteCost,
        pricing,
        canonicalModelKey: buildModelKey(row.modelAlias, pricing),
      };
    }

    return {
      costUsd: 0,
      costSource: 'observed',
      cacheCostUsd: 0,
      cacheWriteCostUsd: 0,
      pricing,
      canonicalModelKey: buildModelKey(row.modelAlias, pricing),
    };
  }

  if (!pricing) {
    return {
      costUsd: 0,
      costSource: 'unpriced',
      cacheCostUsd: null,
      cacheWriteCostUsd: null,
      pricing: null,
      canonicalModelKey: buildModelKey(row.modelAlias, pricing),
    };
  }

  if (row.cacheReadTokens > 0 && pricing.cachedInputPer1m === undefined) {
    return {
      costUsd: 0,
      costSource: 'unpriced',
      cacheCostUsd: null,
      cacheWriteCostUsd: null,
      pricing: null,
      canonicalModelKey: buildModelKey(row.modelAlias, pricing),
    };
  }

  const inputCost = (row.inputWithoutCacheWriteTokens / 1_000_000) * pricing.inputPer1m;
  const cacheWriteCost =
    (row.inputWithCacheWriteTokens / 1_000_000) * (pricing.cacheWritePer1m ?? pricing.inputPer1m);
  const outputCost = (row.outputTokens / 1_000_000) * pricing.outputPer1m;
  const cacheCost =
    row.cacheReadTokens > 0 && pricing.cachedInputPer1m !== undefined
      ? (row.cacheReadTokens / 1_000_000) * pricing.cachedInputPer1m
      : 0;

  return {
    costUsd: round(inputCost + cacheWriteCost + outputCost + cacheCost),
    costSource: 'estimated',
    cacheCostUsd: round(cacheCost),
    cacheWriteCostUsd: round(cacheWriteCost),
    pricing,
    canonicalModelKey: buildModelKey(row.modelAlias, pricing),
  };
}

function buildCall(
  row: CursorUsageCsvRow,
  source: DetectedSourceFile,
  runId: string,
  index: number,
  options: {
    preferObservedCost: boolean;
  },
): { call: NormalizedCall; cost: CursorRowCostEstimate } {
  const cost = estimateCursorRowCost(row, options);
  const totalInputTokens = Math.max(row.totalTokens - row.outputTokens, 0);

  return {
    cost,
    call: {
      id: sha1(`${runId}:${source.path}:${index}:${row.modelAlias}:${row.timestamp}`),
      runId,
      timestamp: row.timestamp,
      provider: cost.pricing?.provider ?? inferProvider(row.modelAlias),
      model: cost.pricing?.canonicalModel ?? row.modelAlias,
      inputTokens: totalInputTokens,
      outputTokens: row.outputTokens,
      costUsd: cost.costUsd,
      costSource: cost.costSource,
      latencyMs: null,
      toolCalls: 0,
      retries: 0,
      attempt: null,
      iteration: null,
      status: isErroredNoCharge(row.kind) ? 'error' : null,
      taskClass: null,
      cacheHit: row.cacheReadTokens > 0,
      cacheCostUsd: cost.cacheCostUsd,
      metadata: {
        source: 'cursor-usage-csv',
        kind: row.kind,
        maxMode: row.maxMode,
        modelAlias: row.modelAlias,
        costLabel: row.costLabel,
        totalTokens: row.totalTokens,
        inputWithCacheWriteTokens: row.inputWithCacheWriteTokens,
        inputWithoutCacheWriteTokens: row.inputWithoutCacheWriteTokens,
        cacheReadTokens: row.cacheReadTokens,
        pricingProvider: cost.pricing?.provider ?? null,
        pricingModel: cost.pricing?.canonicalModel ?? null,
        canonicalModelKey: cost.canonicalModelKey,
        observedCostUsd: row.observedCostUsd,
        cacheWriteCostUsd: cost.cacheWriteCostUsd,
      },
    },
  };
}

export function normalizeCursorUsageCsv(input: {
  source: DetectedSourceFile;
  rows: CursorUsageCsvRow[];
  hasObservedCostRows?: boolean;
  since?: string;
}): {
  runs: NormalizedRun[];
  pricingCoverage: PricingCoverage;
  cursorUsage: CursorUsageInsights;
} {
  const cutoff = parseSince(input.since);
  const runs: NormalizedRun[] = [];
  const modelCoverage = new Map<string, { callCount: number; totalTokens: number }>();
  const modes = new Map<
    string,
    { callCount: number; totalTokens: number; estimatedSpendUsd: number }
  >();
  const models = new Map<
    string,
    {
      callCount: number;
      totalTokens: number;
      estimatedSpendUsd: number;
      pricedCallCount: number;
      unpricedCallCount: number;
    }
  >();

  let pricedCallCount = 0;
  let unpricedCallCount = 0;
  let pricedTokenCount = 0;
  let unpricedTokenCount = 0;
  let totalTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalInputWithCacheWriteTokens = 0;
  let totalInputWithoutCacheWriteTokens = 0;

  input.rows.forEach((row, index) => {
    const timestampMs = new Date(row.timestamp).getTime();
    if (cutoff && timestampMs < cutoff) {
      return;
    }

    const workflow = getWorkflowKey(row);
    const runId = sha1(`${input.source.path}:${row.timestamp}:${row.modelAlias}:${index}`);
    const { call, cost } = buildCall(row, input.source, runId, index, {
      preferObservedCost: input.hasObservedCostRows ?? false,
    });
    const run: NormalizedRun = {
      id: runId,
      sourceKind: input.source.kind,
      sourcePath: input.source.path,
      timestamp: row.timestamp,
      workflow,
      environment: 'local',
      tags: {
        sourceKind: input.source.kind,
        maxMode: row.maxMode,
        kind: row.kind,
      },
      calls: [call],
      totalCostUsd: call.costUsd,
      totalTokens: row.totalTokens,
      observedCostUsd: call.costSource === 'observed' ? call.costUsd : 0,
      estimatedCostUsd: call.costSource === 'estimated' ? call.costUsd : 0,
    };
    runs.push(run);

    totalTokens += row.totalTokens;
    totalOutputTokens += row.outputTokens;
    totalCacheReadTokens += row.cacheReadTokens;
    totalInputWithCacheWriteTokens += row.inputWithCacheWriteTokens;
    totalInputWithoutCacheWriteTokens += row.inputWithoutCacheWriteTokens;

    const totalRowTokens = row.totalTokens;
    if (cost.costSource === 'unpriced') {
      unpricedCallCount += 1;
      unpricedTokenCount += totalRowTokens;
      const current = modelCoverage.get(row.modelAlias) ?? { callCount: 0, totalTokens: 0 };
      current.callCount += 1;
      current.totalTokens += totalRowTokens;
      modelCoverage.set(row.modelAlias, current);
    } else {
      pricedCallCount += 1;
      pricedTokenCount += totalRowTokens;
    }

    const modeBucket = modes.get(workflow) ?? {
      callCount: 0,
      totalTokens: 0,
      estimatedSpendUsd: 0,
    };
    modeBucket.callCount += 1;
    modeBucket.totalTokens += totalRowTokens;
    modeBucket.estimatedSpendUsd = round(modeBucket.estimatedSpendUsd + call.costUsd);
    modes.set(workflow, modeBucket);

    const modelBucket = models.get(cost.canonicalModelKey) ?? {
      callCount: 0,
      totalTokens: 0,
      estimatedSpendUsd: 0,
      pricedCallCount: 0,
      unpricedCallCount: 0,
    };
    modelBucket.callCount += 1;
    modelBucket.totalTokens += totalRowTokens;
    modelBucket.estimatedSpendUsd = round(modelBucket.estimatedSpendUsd + call.costUsd);
    if (cost.costSource === 'unpriced') {
      modelBucket.unpricedCallCount += 1;
    } else {
      modelBucket.pricedCallCount += 1;
    }
    models.set(cost.canonicalModelKey, modelBucket);
  });

  runs.sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return {
    runs,
    pricingCoverage: {
      pricedCallCount,
      unpricedCallCount,
      pricedTokenCount,
      unpricedTokenCount,
      topUnpricedModels: Array.from(modelCoverage.entries())
        .map(([key, value]) => ({
          key,
          callCount: value.callCount,
          totalTokens: value.totalTokens,
        }))
        .sort((left, right) => right.totalTokens - left.totalTokens)
        .slice(0, 5),
    },
    cursorUsage: {
      totalTokens,
      totalInputTokens: Math.max(totalTokens - totalOutputTokens, 0),
      totalOutputTokens,
      totalCacheReadTokens,
      totalInputWithCacheWriteTokens,
      totalInputWithoutCacheWriteTokens,
      modes: Array.from(modes.entries())
        .map(([key, value]) => ({
          key,
          callCount: value.callCount,
          totalTokens: value.totalTokens,
          estimatedSpendUsd: value.estimatedSpendUsd,
        }))
        .sort((left, right) => right.totalTokens - left.totalTokens),
      models: Array.from(models.entries())
        .map(([key, value]) => ({
          key,
          callCount: value.callCount,
          totalTokens: value.totalTokens,
          estimatedSpendUsd: value.estimatedSpendUsd,
          pricedCallCount: value.pricedCallCount,
          unpricedCallCount: value.unpricedCallCount,
        }))
        .sort((left, right) => right.totalTokens - left.totalTokens),
    },
  };
}

function buildDoctorNotes(report: CursorUsageCsvDoctorReport) {
  const notes = ['Cursor usage CSV headers validated.'];

  if (report.rowCount === 0) {
    notes.push('The CSV contains no usage rows.');
  }

  if (report.pricingCoverage.unpricedCallCount > 0) {
    const aliases = report.pricingCoverage.topUnpricedModels.map((model) => model.key).join(', ');
    notes.push(
      `Some Cursor aliases do not have full local pricing coverage: ${aliases || 'unknown aliases'}.`,
    );
  } else {
    notes.push('All rows in this CSV have local pricing coverage.');
  }

  notes.push('Cursor CSV audits use exported usage rows rather than raw session transcripts.');

  return notes;
}

export async function inspectCursorUsageCsv(
  options: AuditOptions,
): Promise<CursorUsageCsvDoctorReport> {
  const filePath = options.cursorUsageCsv ? resolve(options.cursorUsageCsv) : '';
  options.onProgress?.('Inspecting Cursor usage CSV...');

  if (!filePath) {
    return {
      canAudit: false,
      filePath,
      source: null,
      rowCount: 0,
      dateRange: null,
      pricingCoverage: {
        pricedCallCount: 0,
        unpricedCallCount: 0,
        pricedTokenCount: 0,
        unpricedTokenCount: 0,
        topUnpricedModels: [],
      },
      notes: ['No Cursor usage CSV path was provided.'],
    };
  }

  try {
    const parsed = readCursorUsageCsv(filePath);
    const normalized = normalizeCursorUsageCsv({
      source: parsed.source,
      rows: parsed.rows,
      hasObservedCostRows: parsed.hasObservedCostRows,
    });
    const dateRange =
      parsed.rows.length === 0
        ? null
        : {
            start: parsed.rows
              .map((row) => row.timestamp)
              .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0],
            end: parsed.rows
              .map((row) => row.timestamp)
              .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())
              .at(-1) as string,
          };

    const report: CursorUsageCsvDoctorReport = {
      canAudit: true,
      filePath: parsed.source.path,
      source: parsed.source,
      rowCount: parsed.rows.length,
      dateRange,
      pricingCoverage: normalized.pricingCoverage,
      notes: [],
    };
    report.notes = buildDoctorNotes(report);
    options.onProgress?.(
      `Cursor usage CSV is ready (${report.rowCount} row${report.rowCount === 1 ? '' : 's'}).`,
    );
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    options.onProgress?.(`Cursor usage CSV is not ready: ${message}`);
    return {
      canAudit: false,
      filePath,
      source: null,
      rowCount: 0,
      dateRange: null,
      pricingCoverage: {
        pricedCallCount: 0,
        unpricedCallCount: 0,
        pricedTokenCount: 0,
        unpricedTokenCount: 0,
        topUnpricedModels: [],
      },
      notes: [message],
    };
  }
}
