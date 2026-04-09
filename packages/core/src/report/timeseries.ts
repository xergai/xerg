import type {
  DailySpendBreakdown,
  DailyWasteBreakdown,
  NormalizedRun,
  WasteAttribution,
} from '../types.js';

function round(value: number) {
  return Number(value.toFixed(6));
}

function toUtcDay(timestamp: string): string | null {
  const candidate = new Date(timestamp);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  return candidate.toISOString().slice(0, 10);
}

function incrementUtcDay(date: string) {
  const candidate = new Date(`${date}T00:00:00.000Z`);
  candidate.setUTCDate(candidate.getUTCDate() + 1);
  return candidate.toISOString().slice(0, 10);
}

export function buildObservedUtcDayRange(runs: NormalizedRun[]): string[] {
  const days = runs
    .flatMap((run) => run.calls)
    .map((call) => toUtcDay(call.timestamp))
    .filter((day): day is string => day !== null)
    .sort();

  if (days.length === 0) {
    return [];
  }

  const range: string[] = [];
  let current = days[0];
  const last = days[days.length - 1];

  while (current <= last) {
    range.push(current);
    current = incrementUtcDay(current);
  }

  return range;
}

function reconcileDailyTotal<T extends Record<string, number | string>>(
  rows: T[],
  key: keyof T,
  expected: number,
) {
  if (rows.length === 0) {
    return;
  }

  const actual = round(
    rows.reduce((sum, row) => sum + (typeof row[key] === 'number' ? (row[key] as number) : 0), 0),
  );
  const delta = round(expected - actual);

  if (delta === 0) {
    return;
  }

  const last = rows[rows.length - 1];
  const current = last[key];
  if (typeof current === 'number') {
    last[key] = round(current + delta) as T[keyof T];
  }
}

export function buildSpendByDay(runs: NormalizedRun[]): DailySpendBreakdown[] {
  const days = buildObservedUtcDayRange(runs);
  if (days.length === 0) {
    return [];
  }

  const byDay = new Map(
    days.map((day) => [
      day,
      { date: day, observedSpendUsd: 0, estimatedSpendUsd: 0, callCount: 0 },
    ]),
  );

  for (const run of runs) {
    for (const call of run.calls) {
      const day = toUtcDay(call.timestamp);
      if (!day) {
        continue;
      }

      const bucket = byDay.get(day);
      if (!bucket) {
        continue;
      }

      bucket.callCount += 1;
      if (call.costSource === 'observed') {
        bucket.observedSpendUsd += call.costUsd;
      } else if (call.costSource === 'estimated') {
        bucket.estimatedSpendUsd += call.costUsd;
      }
    }
  }

  const rows = days.map((day) => {
    const bucket = byDay.get(day);
    const observedSpendUsd = round(bucket?.observedSpendUsd ?? 0);
    const estimatedSpendUsd = round(bucket?.estimatedSpendUsd ?? 0);

    return {
      date: day,
      observedSpendUsd,
      estimatedSpendUsd,
      spendUsd: round(observedSpendUsd + estimatedSpendUsd),
      callCount: bucket?.callCount ?? 0,
    };
  });

  reconcileDailyTotal(
    rows,
    'observedSpendUsd',
    round(runs.reduce((sum, run) => sum + run.observedCostUsd, 0)),
  );
  reconcileDailyTotal(
    rows,
    'estimatedSpendUsd',
    round(runs.reduce((sum, run) => sum + run.estimatedCostUsd, 0)),
  );

  for (const row of rows) {
    row.spendUsd = round(row.observedSpendUsd + row.estimatedSpendUsd);
  }

  return rows;
}

export function buildWasteByDay(
  wasteAttributions: WasteAttribution[],
  days: string[],
  expectedWasteUsd: number,
): DailyWasteBreakdown[] {
  if (days.length === 0) {
    return [];
  }

  const byDay = new Map(days.map((day) => [day, 0]));

  for (const attribution of wasteAttributions) {
    const day = toUtcDay(attribution.timestamp);
    if (!day || !byDay.has(day)) {
      continue;
    }

    byDay.set(day, (byDay.get(day) ?? 0) + attribution.wasteUsd);
  }

  const rows = days.map((day) => ({
    date: day,
    wasteUsd: round(byDay.get(day) ?? 0),
  }));

  reconcileDailyTotal(rows, 'wasteUsd', round(expectedWasteUsd));

  return rows;
}
