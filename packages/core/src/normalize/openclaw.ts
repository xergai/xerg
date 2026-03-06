import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { estimateCostUsd } from '../pricing-catalog.js';
import type { DetectedSourceFile, NormalizedCall, NormalizedRun } from '../types.js';
import { sha1 } from '../utils/hash.js';
import { asBoolean, asNumber, asString, getNestedValue, pickMetadata } from '../utils/records.js';
import { parseSince, toIsoOrNow } from '../utils/time.js';

type JsonRecord = Record<string, unknown>;

function parseJsonLines(path: string) {
  const content = readFileSync(path, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records: JsonRecord[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as JsonRecord;
      records.push(parsed);
    } catch {}
  }

  return records;
}

function inferProvider(record: JsonRecord) {
  return (
    asString(
      getNestedValue(record, [['provider'], ['message', 'provider'], ['usage', 'provider']]),
    ) ?? 'unknown'
  );
}

function inferModel(record: JsonRecord) {
  return (
    asString(getNestedValue(record, [['model'], ['message', 'model'], ['usage', 'model']])) ??
    'unknown-model'
  );
}

function inferWorkflow(record: JsonRecord, sourcePath: string) {
  return (
    asString(
      getNestedValue(record, [
        ['workflow'],
        ['session', 'workflow'],
        ['metadata', 'workflow'],
        ['agent', 'name'],
        ['agentId'],
        ['sessionId'],
      ]),
    ) ?? basename(sourcePath, '.jsonl')
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
        ['trace_id'],
        ['traceId'],
        ['sessionId'],
        ['thread_id'],
      ]),
    ) ?? `${sourcePath}:${workflow}:${index}`
  );
}

function inferTaskClass(record: JsonRecord, workflow: string) {
  return (
    asString(getNestedValue(record, [['task_class'], ['taskClass'], ['metadata', 'taskClass']])) ??
    workflow.toLowerCase()
  );
}

function extractUsage(record: JsonRecord) {
  const inputTokens =
    asNumber(
      getNestedValue(record, [
        ['input_tokens'],
        ['inputTokens'],
        ['usage', 'input_tokens'],
        ['usage', 'inputTokens'],
        ['message', 'usage', 'input_tokens'],
        ['message', 'usage', 'inputTokens'],
        ['usage', 'prompt_tokens'],
        ['message', 'usage', 'prompt_tokens'],
      ]),
    ) ?? 0;

  const outputTokens =
    asNumber(
      getNestedValue(record, [
        ['output_tokens'],
        ['outputTokens'],
        ['usage', 'output_tokens'],
        ['usage', 'outputTokens'],
        ['message', 'usage', 'output_tokens'],
        ['message', 'usage', 'outputTokens'],
        ['usage', 'completion_tokens'],
        ['message', 'usage', 'completion_tokens'],
      ]),
    ) ?? 0;

  const observedCost =
    asNumber(
      getNestedValue(record, [
        ['cost_usd'],
        ['costUsd'],
        ['usage', 'cost_usd'],
        ['usage', 'costUsd'],
        ['usage', 'cost', 'total'],
        ['message', 'usage', 'cost', 'total'],
        ['message', 'usage', 'cost_usd'],
        ['pricing', 'total_usd'],
      ]),
    ) ?? null;

  return {
    inputTokens,
    outputTokens,
    observedCost,
  };
}

function buildCall(
  source: DetectedSourceFile,
  record: JsonRecord,
  runId: string,
  index: number,
): NormalizedCall {
  const provider = inferProvider(record);
  const model = inferModel(record);
  const workflow = inferWorkflow(record, source.path);
  const { inputTokens, outputTokens, observedCost } = extractUsage(record);
  const estimatedCost = estimateCostUsd(provider, model, inputTokens, outputTokens);
  const timestamp = toIsoOrNow(
    getNestedValue(record, [['timestamp'], ['createdAt'], ['created_at']]),
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
    costSource: observedCost !== null ? 'observed' : 'estimated',
    latencyMs:
      asNumber(getNestedValue(record, [['latency_ms'], ['latencyMs'], ['usage', 'latency_ms']])) ??
      null,
    toolCalls:
      asNumber(getNestedValue(record, [['tool_calls'], ['toolCalls'], ['usage', 'tool_calls']])) ??
      0,
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
    metadata: pickMetadata(record, ['event', 'type', 'sessionId', 'agentId']),
  };
}

function shouldTreatAsCall(record: JsonRecord) {
  const hasUsage =
    extractUsage(record).inputTokens > 0 ||
    extractUsage(record).outputTokens > 0 ||
    extractUsage(record).observedCost !== null;

  return hasUsage;
}

export function normalizeOpenClawSources(
  sources: DetectedSourceFile[],
  since?: string,
): NormalizedRun[] {
  const cutoff = parseSince(since);
  const runsById = new Map<string, NormalizedRun>();

  for (const source of sources) {
    const records = parseJsonLines(source.path);

    records.forEach((record, index) => {
      if (!shouldTreatAsCall(record)) {
        return;
      }

      const workflow = inferWorkflow(record, source.path);
      const timestamp = toIsoOrNow(
        getNestedValue(record, [['timestamp'], ['createdAt'], ['created_at']]),
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
    });
  }

  return Array.from(runsById.values()).sort((left, right) => {
    return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
  });
}
