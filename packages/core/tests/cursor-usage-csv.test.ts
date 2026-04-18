import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { auditCursorUsageCsv } from '../src/audit.js';

const root = process.cwd();
const cursorUsageCsv = join(root, 'fixtures', 'cursor', 'usage-sample.csv');
const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'xerg-cursor-'));
  tempDirs.push(dir);
  return dir;
}

function buildObservedCostFixture() {
  const header =
    'Date,Kind,Model,Max Mode,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';
  const rows = Array.from({ length: 24 }, (_, index) => {
    return [
      `2026-04-03T18:${String(index).padStart(2, '0')}:11.107Z`,
      'On-Demand',
      'claude-4.5-sonnet-thinking',
      'Yes',
      '2000',
      '50',
      '4000000',
      '300',
      '4002350',
      '2.50',
    ].join(',');
  });

  return `${header}\n${rows.join('\n')}\n`;
}

afterEach(() => {
  vi.useRealTimers();

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('cursor usage csv audit', () => {
  it('produces a local-only summary with pricing coverage and token insights', async () => {
    const summary = await auditCursorUsageCsv({
      cursorUsageCsv,
      noDb: true,
    });

    expect(summary.runCount).toBe(5);
    expect(summary.callCount).toBe(5);
    expect(summary.totalSpendUsd).toBeCloseTo(0.04545, 6);
    expect(summary.estimatedSpendUsd).toBeCloseTo(0.04545, 6);
    expect(summary.observedSpendUsd).toBe(0);
    expect(summary.pricingCoverage).toEqual({
      pricedCallCount: 3,
      unpricedCallCount: 2,
      pricedTokenCount: 8050,
      unpricedTokenCount: 5800,
      topUnpricedModels: [
        {
          key: 'gpt-5.4-medium',
          callCount: 1,
          totalTokens: 3500,
        },
        {
          key: 'auto',
          callCount: 1,
          totalTokens: 2300,
        },
      ],
    });
    expect(summary.cursorUsage?.totalTokens).toBe(13850);
    expect(summary.cursorUsage?.models[0]?.key).toBe('anthropic/claude-opus-4');
    expect(summary.spendByDay).toEqual([
      {
        date: '2026-04-01',
        spendUsd: 0,
        observedSpendUsd: 0,
        estimatedSpendUsd: 0,
        callCount: 1,
      },
      {
        date: '2026-04-02',
        spendUsd: 0.0027,
        observedSpendUsd: 0,
        estimatedSpendUsd: 0.0027,
        callCount: 1,
      },
      {
        date: '2026-04-03',
        spendUsd: 0.04275,
        observedSpendUsd: 0,
        estimatedSpendUsd: 0.04275,
        callCount: 3,
      },
    ]);
    expect(summary.wasteByDay).toEqual([
      { date: '2026-04-01', wasteUsd: 0 },
      { date: '2026-04-02', wasteUsd: 0 },
      { date: '2026-04-03', wasteUsd: 0 },
    ]);
    expect(
      summary.notes.some((note) => note.includes('do not have full local pricing coverage')),
    ).toBe(true);
  });

  it('respects --since when normalizing Cursor usage rows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T12:00:00.000Z'));

    const summary = await auditCursorUsageCsv({
      cursorUsageCsv,
      since: '24h',
      noDb: true,
    });

    expect(summary.runCount).toBe(3);
    expect(summary.callCount).toBe(3);
    expect(summary.totalSpendUsd).toBeCloseTo(0.04275, 6);
    expect(summary.cursorUsage?.totalTokens).toBe(10200);
  });

  it('compares compatible cursor audits and warns when pricing coverage changes', async () => {
    const tempDir = createTempDir();
    const localCsv = join(tempDir, 'usage-sample.csv');
    const dbPath = join(tempDir, 'xerg.sqlite');

    writeFileSync(localCsv, readFileSync(cursorUsageCsv, 'utf8'));
    await auditCursorUsageCsv({
      cursorUsageCsv: localCsv,
      dbPath,
    });

    const improvedCsv = readFileSync(localCsv, 'utf8').replace(
      'gpt-5.4-medium',
      'claude-4.5-sonnet',
    );
    writeFileSync(localCsv, improvedCsv);

    const summary = await auditCursorUsageCsv({
      cursorUsageCsv: localCsv,
      dbPath,
      compare: true,
    });

    expect(summary.comparison).not.toBeNull();
    expect(
      summary.notes.some((note) =>
        note.includes('Pricing coverage changed versus the baseline audit'),
      ),
    ).toBe(true);
  });

  it('uses observed billing rows and surfaces cache carryover waste when the pattern is extreme', async () => {
    const tempDir = createTempDir();
    const observedCsv = join(tempDir, 'usage-observed.csv');

    writeFileSync(observedCsv, buildObservedCostFixture());

    const summary = await auditCursorUsageCsv({
      cursorUsageCsv: observedCsv,
      noDb: true,
    });

    expect(summary.runCount).toBe(24);
    expect(summary.totalSpendUsd).toBeCloseTo(60, 6);
    expect(summary.observedSpendUsd).toBeCloseTo(60, 6);
    expect(summary.estimatedSpendUsd).toBe(0);
    expect(summary.wasteSpendUsd).toBeGreaterThan(0);
    expect(summary.findings[0]?.kind).toBe('cache-carryover');
    expect(summary.findings[0]?.classification).toBe('waste');
    expect(summary.findings[0]?.confidence).toBe('medium');
    expect(summary.findings.some((finding) => finding.kind === 'max-mode-concentration')).toBe(
      true,
    );
    expect(
      summary.findings.every((finding) => finding.scope === 'global' || finding.scopeLabel),
    ).toBe(true);
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.opportunitySpendUsd).toBeGreaterThan(0);
    expect(summary.spendByWorkflow[0]?.key).toBe('on-demand / max mode');
    expect(summary.spendByModel[0]?.key).toBe('anthropic/claude-sonnet-4-5');
    expect(summary.spendByDay).toEqual([
      {
        date: '2026-04-03',
        spendUsd: 60,
        observedSpendUsd: 60,
        estimatedSpendUsd: 0,
        callCount: 24,
      },
    ]);
    expect(summary.wasteByDay).toEqual([
      {
        date: '2026-04-03',
        wasteUsd: summary.wasteSpendUsd,
      },
    ]);
  });
});
