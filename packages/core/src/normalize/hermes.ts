import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { estimateCostUsd } from '../pricing-catalog.js';
import type { DetectedSourceFile, NormalizedCall, NormalizedRun } from '../types.js';
import { sha1 } from '../utils/hash.js';
import { asBoolean, asNumber, asString, getNestedValue, pickMetadata } from '../utils/records.js';
import { parseSince, toIsoOrNow } from '../utils/time.js';

type JsonRecord = Record<string, unknown>;

const PRICING_PROVIDER_PREFIXES = new Set(['anthropic', 'openai', 'google', 'meta']);

function parseJsonLine(line: string): JsonRecord | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as JsonRecord;
  } catch {}

  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as JsonRecord;
  } catch {
    return null;
  }
}

function parseJsonLines(path: string) {
  const content = readFileSync(path, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records: JsonRecord[] = [];

  for (const line of lines) {
    const parsed = parseJsonLine(line);
    if (parsed) {
      records.push(parsed);
    }
  }

  return records;
}

function flattenSourceRecords(source: DetectedSourceFile) {
  const records = parseJsonLines(source.path);

  if (source.kind !== 'sessions') {
    return records;
  }

  return records.flatMap((record) => expandSessionRecord(record));
}

function expandSessionRecord(record: JsonRecord): JsonRecord[] {
  const messages = getNestedValue(record, [['messages']]);
  if (!Array.isArray(messages)) {
    return [record];
  }

  return messages
    .filter((message): message is JsonRecord => Boolean(message) && typeof message === 'object')
    .map((message, index) => ({
      ...record,
      message,
      timestamp:
        asString(
          getNestedValue(message, [['timestamp'], ['created_at'], ['createdAt'], ['time']]),
        ) ??
        asString(
          getNestedValue(record, [['timestamp'], ['created_at'], ['createdAt'], ['updated_at']]),
        ) ??
        `${sourceTimestampSeed(record)}:${index}`,
    }));
}

function sourceTimestampSeed(record: JsonRecord) {
  return (
    asString(getNestedValue(record, [['updated_at'], ['created_at'], ['timestamp'], ['id']])) ??
    'session'
  );
}

function normalizeProviderAndModel(record: JsonRecord) {
  const rawProvider =
    asString(
      getNestedValue(record, [
        ['provider'],
        ['provider_name'],
        ['runtime', 'provider'],
        ['usage', 'provider'],
        ['token_usage', 'provider'],
        ['message', 'provider'],
        ['message', 'usage', 'provider'],
      ]),
    ) ?? 'unknown';

  const rawModel =
    asString(
      getNestedValue(record, [
        ['model'],
        ['model_name'],
        ['runtime', 'model'],
        ['usage', 'model'],
        ['token_usage', 'model'],
        ['message', 'model'],
        ['message', 'usage', 'model'],
      ]),
    ) ?? 'unknown-model';

  if (rawModel.includes('/')) {
    const [providerPrefix, ...rest] = rawModel.split('/');
    if (PRICING_PROVIDER_PREFIXES.has(providerPrefix.toLowerCase()) && rest.length > 0) {
      return {
        provider: providerPrefix.toLowerCase(),
        model: rest.join('/'),
      };
    }
  }

  return {
    provider: rawProvider.toLowerCase(),
    model: rawModel,
  };
}

function inferWorkflow(record: JsonRecord, sourcePath: string) {
  return (
    asString(
      getNestedValue(record, [
        ['workflow'],
        ['job_name'],
        ['task_class'],
        ['taskClass'],
        ['agent_name'],
        ['agent', 'name'],
        ['source'],
        ['session', 'source'],
        ['session_key'],
        ['session_id'],
        ['sessionId'],
        ['title'],
      ]),
    ) ?? basename(sourcePath).replace(/\.(jsonl|json|log)(\.\d+)?$/i, '')
  );
}

function inferEnvironment(record: JsonRecord) {
  return (
    asString(getNestedValue(record, [['environment'], ['env'], ['metadata', 'environment']])) ??
    'local'
  );
}

function inferRunKey(record: JsonRecord, workflow: string, index: number, sourcePath: string) {
  return (
    asString(
      getNestedValue(record, [
        ['run_id'],
        ['runId'],
        ['session_id'],
        ['sessionId'],
        ['session_key'],
        ['thread_id'],
        ['threadId'],
        ['trace_id'],
        ['traceId'],
        ['conversation_id'],
        ['conversationId'],
        ['id'],
      ]),
    ) ?? `${sourcePath}:${workflow}:${index}`
  );
}

function inferTaskClass(record: JsonRecord, workflow: string) {
  return (
    asString(
      getNestedValue(record, [
        ['task_class'],
        ['taskClass'],
        ['event'],
        ['source'],
        ['message', 'source'],
      ]),
    ) ?? workflow.toLowerCase()
  );
}

function inferToolCalls(record: JsonRecord) {
  const direct =
    asNumber(
      getNestedValue(record, [
        ['tool_calls'],
        ['toolCalls'],
        ['usage', 'tool_calls'],
        ['message', 'usage', 'tool_calls'],
      ]),
    ) ?? null;

  if (direct !== null) {
    return direct;
  }

  const toolCalls = getNestedValue(record, [
    ['tool_calls'],
    ['toolCalls'],
    ['message', 'tool_calls'],
  ]);
  return Array.isArray(toolCalls) ? toolCalls.length : 0;
}

function extractUsage(record: JsonRecord) {
  const inputTokens =
    asNumber(
      getNestedValue(record, [
        ['input_tokens'],
        ['inputTokens'],
        ['usage', 'input_tokens'],
        ['usage', 'inputTokens'],
        ['usage', 'prompt_tokens'],
        ['token_usage', 'input_tokens'],
        ['token_usage', 'prompt_tokens'],
        ['token_usage', 'input'],
        ['message', 'usage', 'input_tokens'],
        ['message', 'usage', 'prompt_tokens'],
        ['message', 'token_usage', 'input_tokens'],
      ]),
    ) ?? 0;

  const outputTokens =
    asNumber(
      getNestedValue(record, [
        ['output_tokens'],
        ['outputTokens'],
        ['usage', 'output_tokens'],
        ['usage', 'outputTokens'],
        ['usage', 'completion_tokens'],
        ['token_usage', 'output_tokens'],
        ['token_usage', 'completion_tokens'],
        ['token_usage', 'output'],
        ['message', 'usage', 'output_tokens'],
        ['message', 'usage', 'completion_tokens'],
        ['message', 'token_usage', 'output_tokens'],
      ]),
    ) ?? 0;

  const observedCost =
    asNumber(
      getNestedValue(record, [
        ['cost_usd'],
        ['costUsd'],
        ['estimated_cost_usd'],
        ['estimatedCostUsd'],
        ['total_cost_usd'],
        ['usage', 'cost_usd'],
        ['usage', 'costUsd'],
        ['usage', 'estimated_cost_usd'],
        ['usage', 'total_cost_usd'],
        ['token_usage', 'cost_usd'],
        ['token_usage', 'total_cost_usd'],
        ['cost', 'usd'],
        ['cost', 'total_usd'],
        ['pricing', 'total_usd'],
        ['message', 'usage', 'cost_usd'],
        ['message', 'cost_usd'],
      ]),
    ) ?? null;

  return {
    inputTokens,
    outputTokens,
    observedCost,
  };
}

function shouldTreatAsCall(record: JsonRecord) {
  const { inputTokens, outputTokens, observedCost } = extractUsage(record);
  return inputTokens > 0 || outputTokens > 0 || observedCost !== null;
}

function buildCall(
  source: DetectedSourceFile,
  record: JsonRecord,
  runId: string,
  index: number,
): NormalizedCall {
  const { provider, model } = normalizeProviderAndModel(record);
  const workflow = inferWorkflow(record, source.path);
  const { inputTokens, outputTokens, observedCost } = extractUsage(record);
  const estimatedCost = estimateCostUsd(provider, model, inputTokens, outputTokens);
  const timestamp = toIsoOrNow(
    getNestedValue(record, [
      ['timestamp'],
      ['createdAt'],
      ['created_at'],
      ['time'],
      ['updated_at'],
    ]),
  );
  const attempt =
    asNumber(
      getNestedValue(record, [['attempt'], ['usage', 'attempt'], ['metadata', 'attempt']]),
    ) ?? null;
  const iteration =
    asNumber(
      getNestedValue(record, [['iteration'], ['loop_iteration'], ['metadata', 'iteration']]),
    ) ?? null;
  const retries =
    asNumber(getNestedValue(record, [['retries'], ['retry_count'], ['metadata', 'retries']])) ?? 0;
  const costUsd = observedCost ?? estimatedCost ?? 0;

  return {
    id: sha1(`${runId}:${source.path}:${index}:${model}:${timestamp}:${costUsd}`),
    runId,
    timestamp,
    provider,
    model,
    inputTokens,
    outputTokens,
    costUsd,
    costSource:
      observedCost !== null ? 'observed' : estimatedCost !== null ? 'estimated' : 'unpriced',
    latencyMs:
      asNumber(getNestedValue(record, [['latency_ms'], ['latencyMs'], ['usage', 'latency_ms']])) ??
      null,
    toolCalls: inferToolCalls(record),
    retries,
    attempt,
    iteration,
    status:
      asString(getNestedValue(record, [['status'], ['level'], ['result'], ['error', 'type']])) ??
      null,
    taskClass: inferTaskClass(record, workflow),
    cacheHit: asBoolean(
      getNestedValue(record, [['cache_hit'], ['cacheHit'], ['usage', 'cache_hit']]),
    ),
    cacheCostUsd:
      asNumber(
        getNestedValue(record, [['cache_cost_usd'], ['cacheCostUsd'], ['usage', 'cache_cost_usd']]),
      ) ?? null,
    metadata: pickMetadata(record, [
      'event',
      'type',
      'source',
      'session_id',
      'sessionId',
      'thread_id',
      'trace_id',
    ]),
  };
}

export function logFileHasBillableRecords(path: string) {
  return flattenSourceRecords({
    kind: 'gateway',
    runtime: 'hermes',
    path,
    sizeBytes: 0,
    mtimeMs: 0,
  }).some((record) => shouldTreatAsCall(record));
}

export function normalizeHermesSources(
  sources: DetectedSourceFile[],
  since?: string,
): NormalizedRun[] {
  const cutoff = parseSince(since);
  const runsById = new Map<string, NormalizedRun>();

  for (const source of sources) {
    const records = flattenSourceRecords(source);

    records.forEach((record, index) => {
      if (!shouldTreatAsCall(record)) {
        return;
      }

      const workflow = inferWorkflow(record, source.path);
      const timestamp = toIsoOrNow(
        getNestedValue(record, [
          ['timestamp'],
          ['createdAt'],
          ['created_at'],
          ['time'],
          ['updated_at'],
        ]),
      );
      if (cutoff && new Date(timestamp).getTime() < cutoff) {
        return;
      }

      const runKey = inferRunKey(record, workflow, index, source.path);
      const runId = sha1(`${source.path}:${runKey}`);
      const call = buildCall(source, record, runId, index);
      const existing = runsById.get(runId);

      if (!existing) {
        runsById.set(runId, {
          id: runId,
          sourceKind: source.kind,
          sourcePath: source.path,
          timestamp,
          workflow,
          environment: inferEnvironment(record),
          tags: {
            sourceKind: source.kind,
          },
          calls: [call],
          totalCostUsd: call.costUsd,
          totalTokens: call.inputTokens + call.outputTokens,
          observedCostUsd: call.costSource === 'observed' ? call.costUsd : 0,
          estimatedCostUsd: call.costSource === 'estimated' ? call.costUsd : 0,
        });
        return;
      }

      existing.calls.push(call);
      existing.totalCostUsd = Number((existing.totalCostUsd + call.costUsd).toFixed(8));
      existing.totalTokens += call.inputTokens + call.outputTokens;
      existing.observedCostUsd += call.costSource === 'observed' ? call.costUsd : 0;
      existing.estimatedCostUsd += call.costSource === 'estimated' ? call.costUsd : 0;
      if (timestamp < existing.timestamp) {
        existing.timestamp = timestamp;
      }
    });
  }

  return Array.from(runsById.values()).sort((left, right) =>
    left.timestamp < right.timestamp ? -1 : 1,
  );
}
