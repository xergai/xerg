import { describe, expect, it } from 'vitest';

import {
  buildObservedUtcDayRange,
  buildSpendByDay,
  buildWasteByDay,
} from '../src/report/timeseries.js';
import type { NormalizedCall, NormalizedRun, WasteAttribution } from '../src/types.js';

function buildCall(input: Partial<NormalizedCall> & Pick<NormalizedCall, 'id' | 'timestamp'>) {
  return {
    id: input.id,
    runId: input.runId ?? 'run-1',
    timestamp: input.timestamp,
    provider: input.provider ?? 'anthropic',
    model: input.model ?? 'claude-sonnet-4-5',
    inputTokens: input.inputTokens ?? 100,
    outputTokens: input.outputTokens ?? 50,
    costUsd: input.costUsd ?? 0,
    costSource: input.costSource ?? 'estimated',
    latencyMs: input.latencyMs ?? null,
    toolCalls: input.toolCalls ?? 0,
    retries: input.retries ?? 0,
    attempt: input.attempt ?? 1,
    iteration: input.iteration ?? 1,
    status: input.status ?? 'success',
    taskClass: input.taskClass ?? null,
    cacheHit: input.cacheHit ?? false,
    cacheCostUsd: input.cacheCostUsd ?? null,
    metadata: input.metadata ?? {},
  } satisfies NormalizedCall;
}

function buildRun(calls: NormalizedCall[]): NormalizedRun {
  return {
    id: 'run-1',
    sourceKind: 'gateway',
    sourcePath: '/tmp/openclaw/openclaw.log',
    timestamp: calls[0]?.timestamp ?? '2026-04-01T00:00:00.000Z',
    workflow: 'daily-summary',
    environment: 'local',
    tags: {},
    calls,
    totalCostUsd: calls.reduce((sum, call) => sum + call.costUsd, 0),
    totalTokens: calls.reduce((sum, call) => sum + call.inputTokens + call.outputTokens, 0),
    observedCostUsd: calls
      .filter((call) => call.costSource === 'observed')
      .reduce((sum, call) => sum + call.costUsd, 0),
    estimatedCostUsd: calls
      .filter((call) => call.costSource === 'estimated')
      .reduce((sum, call) => sum + call.costUsd, 0),
  };
}

describe('daily timeseries builders', () => {
  it('returns empty day and spend series when there are no valid call timestamps', () => {
    const run = buildRun([
      buildCall({
        id: 'call-1',
        timestamp: 'not-a-real-date',
        costUsd: 1.5,
        costSource: 'observed',
      }),
    ]);

    expect(buildObservedUtcDayRange([run])).toEqual([]);
    expect(buildSpendByDay([run])).toEqual([]);
  });

  it('builds dense UTC date ranges from normalized call timestamps', () => {
    const run = buildRun([
      buildCall({
        id: 'call-1',
        timestamp: '2026-04-01T23:30:00.000-05:00',
        costUsd: 1.5,
        costSource: 'observed',
      }),
      buildCall({
        id: 'call-2',
        timestamp: '2026-04-03T01:00:00.000Z',
        costUsd: 0.5,
        costSource: 'estimated',
      }),
    ]);

    expect(buildObservedUtcDayRange([run])).toEqual(['2026-04-02', '2026-04-03']);
  });

  it('fills zero-spend days inside the observed range', () => {
    const run = buildRun([
      buildCall({
        id: 'call-1',
        timestamp: '2026-04-01T12:00:00.000Z',
        costUsd: 1.25,
        costSource: 'observed',
      }),
      buildCall({
        id: 'call-2',
        timestamp: '2026-04-03T12:00:00.000Z',
        costUsd: 2.5,
        costSource: 'estimated',
      }),
    ]);

    expect(buildSpendByDay([run])).toEqual([
      {
        date: '2026-04-01',
        spendUsd: 1.25,
        observedSpendUsd: 1.25,
        estimatedSpendUsd: 0,
        callCount: 1,
      },
      {
        date: '2026-04-02',
        spendUsd: 0,
        observedSpendUsd: 0,
        estimatedSpendUsd: 0,
        callCount: 0,
      },
      {
        date: '2026-04-03',
        spendUsd: 2.5,
        observedSpendUsd: 0,
        estimatedSpendUsd: 2.5,
        callCount: 1,
      },
    ]);
  });

  it('counts unpriced calls without adding them to daily spend totals', () => {
    const run = buildRun([
      buildCall({
        id: 'call-1',
        timestamp: '2026-04-01T12:00:00.000Z',
        costUsd: 1.25,
        costSource: 'observed',
      }),
      buildCall({
        id: 'call-2',
        timestamp: '2026-04-01T13:00:00.000Z',
        costUsd: 9.99,
        costSource: 'unpriced',
      }),
    ]);

    expect(buildSpendByDay([run])).toEqual([
      {
        date: '2026-04-01',
        spendUsd: 1.25,
        observedSpendUsd: 1.25,
        estimatedSpendUsd: 0,
        callCount: 2,
      },
    ]);
  });

  it('reconciles rounded daily waste back to the expected total', () => {
    const days = ['2026-04-01', '2026-04-02'];
    const attributions: WasteAttribution[] = [
      {
        kind: 'retry-waste',
        timestamp: '2026-04-01T10:00:00.000Z',
        wasteUsd: 0.0000004,
      },
      {
        kind: 'retry-waste',
        timestamp: '2026-04-02T10:00:00.000Z',
        wasteUsd: 0.0000004,
      },
    ];

    expect(buildWasteByDay(attributions, days, 0.000001)).toEqual([
      { date: '2026-04-01', wasteUsd: 0 },
      { date: '2026-04-02', wasteUsd: 0.000001 },
    ]);
  });

  it('returns an empty waste series for empty day ranges and ignores out-of-range attributions', () => {
    expect(buildWasteByDay([], [], 0)).toEqual([]);

    const days = ['2026-04-01'];
    const attributions: WasteAttribution[] = [
      {
        kind: 'retry-waste',
        timestamp: 'not-a-real-date',
        wasteUsd: 1.5,
      },
      {
        kind: 'retry-waste',
        timestamp: '2026-04-02T10:00:00.000Z',
        wasteUsd: 2.5,
      },
    ];

    expect(buildWasteByDay(attributions, days, 0)).toEqual([{ date: '2026-04-01', wasteUsd: 0 }]);
  });
});
