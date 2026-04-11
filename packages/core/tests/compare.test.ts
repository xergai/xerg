import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { auditOpenClaw } from '../src/audit.js';
import { createDb } from '../src/db/client.js';
import { readLatestComparableAuditSummary } from '../src/db/read.js';
import { buildComparisonKey } from '../src/report/comparison.js';
import { renderMarkdownSummary, renderTerminalSummary } from '../src/report/render.js';
import type { AuditSummary, DetectedSourceFile } from '../src/types.js';

const root = process.cwd();
const gatewayLog = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');
const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'xerg-compare-'));
  tempDirs.push(dir);
  return dir;
}

function stripDerivedFields(summary: AuditSummary) {
  const {
    comparisonKey: _comparisonKey,
    comparison: _comparison,
    wasteByKind: _wasteByKind,
    opportunityByKind: _opportunityByKind,
    ...rest
  } = summary;

  return rest;
}

function makeImprovedGatewayLog() {
  return `${readFileSync(gatewayLog, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.includes('"event":"model_call.failed"'))
    .filter((line) => !line.includes('"iteration":6'))
    .filter((line) => !line.includes('"iteration":7'))
    .join('\n')}\n`;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('comparison key derivation', () => {
  it('treats the same gateway directory and since window as comparable', () => {
    const first: DetectedSourceFile = {
      kind: 'gateway',
      runtime: 'openclaw',
      path: '/tmp/openclaw/openclaw-2026-03-06.log',
      sizeBytes: 1,
      mtimeMs: 1,
    };
    const second: DetectedSourceFile = {
      kind: 'gateway',
      runtime: 'openclaw',
      path: '/tmp/openclaw/openclaw-2026-03-07.log',
      sizeBytes: 1,
      mtimeMs: 2,
    };

    expect(buildComparisonKey({ runtime: 'openclaw', sources: [first], since: '24h' })).toBe(
      buildComparisonKey({ runtime: 'openclaw', sources: [second], since: '24H' }),
    );
  });

  it('treats different gateway directories as incompatible', () => {
    const first: DetectedSourceFile = {
      kind: 'gateway',
      runtime: 'openclaw',
      path: '/tmp/openclaw-a/openclaw-2026-03-06.log',
      sizeBytes: 1,
      mtimeMs: 1,
    };
    const second: DetectedSourceFile = {
      kind: 'gateway',
      runtime: 'openclaw',
      path: '/tmp/openclaw-b/openclaw-2026-03-06.log',
      sizeBytes: 1,
      mtimeMs: 1,
    };

    expect(buildComparisonKey({ runtime: 'openclaw', sources: [first], since: '24h' })).not.toBe(
      buildComparisonKey({ runtime: 'openclaw', sources: [second], since: '24h' }),
    );
  });

  it('treats the same sessions root as comparable and different since windows as incompatible', () => {
    const first: DetectedSourceFile = {
      kind: 'sessions',
      runtime: 'openclaw',
      path: '/Users/test/.openclaw/agents/agent-a/sessions/2026-03-06-1.jsonl',
      sizeBytes: 1,
      mtimeMs: 1,
    };
    const second: DetectedSourceFile = {
      kind: 'sessions',
      runtime: 'openclaw',
      path: '/Users/test/.openclaw/agents/agent-a/sessions/2026-03-06-2.jsonl',
      sizeBytes: 1,
      mtimeMs: 2,
    };

    expect(buildComparisonKey({ runtime: 'openclaw', sources: [first], since: '7d' })).toBe(
      buildComparisonKey({ runtime: 'openclaw', sources: [second], since: '7d' }),
    );
    expect(buildComparisonKey({ runtime: 'openclaw', sources: [first], since: '7d' })).not.toBe(
      buildComparisonKey({ runtime: 'openclaw', sources: [second], since: '24h' }),
    );
  });

  it('treats different runtimes as incompatible even when the roots match', () => {
    const source: DetectedSourceFile = {
      kind: 'gateway',
      runtime: 'openclaw',
      path: '/tmp/shared/openclaw.log',
      sizeBytes: 1,
      mtimeMs: 1,
    };

    expect(buildComparisonKey({ runtime: 'openclaw', sources: [source], since: '24h' })).not.toBe(
      buildComparisonKey({
        runtime: 'hermes',
        sources: [{ ...source, runtime: 'hermes' }],
        since: '24h',
      }),
    );
  });
});

describe('xerg audit compare', () => {
  it('returns a note instead of erroring when no prior comparable snapshot exists', async () => {
    const tempDir = createTempDir();
    const tempLog = join(tempDir, 'openclaw-2026-03-06.log');
    const dbPath = join(tempDir, 'xerg.sqlite');

    writeFileSync(tempLog, readFileSync(gatewayLog, 'utf8'));

    const summary = await auditOpenClaw({
      logFile: tempLog,
      dbPath,
      compare: true,
    });

    expect(summary.comparison).toBeNull();
    expect(summary.notes.some((note) => note.includes('No prior comparable audit was found'))).toBe(
      true,
    );
  });

  it('fails cleanly when compare is used without local persistence', async () => {
    await expect(
      auditOpenClaw({
        logFile: gatewayLog,
        compare: true,
        noDb: true,
      }),
    ).rejects.toThrow('The --compare flag needs local snapshot history.');
  });

  it('compares against the newest compatible stored snapshot and backfills missing comparison keys', async () => {
    const tempDir = createTempDir();
    const tempLog = join(tempDir, 'openclaw-2026-03-06.log');
    const dbPath = join(tempDir, 'xerg.sqlite');

    writeFileSync(tempLog, readFileSync(gatewayLog, 'utf8'));
    const summary = await auditOpenClaw({
      logFile: tempLog,
      dbPath,
    });

    const { sqlite } = createDb(dbPath);
    const legacyCompatible = {
      ...stripDerivedFields(summary),
      auditId: 'legacy-compatible',
      generatedAt: '2026-03-01T00:00:00.000Z',
    };
    const newestCompatible = {
      ...stripDerivedFields(summary),
      auditId: 'newest-compatible',
      generatedAt: '2026-03-03T00:00:00.000Z',
    };
    const incompatible = {
      ...stripDerivedFields(summary),
      auditId: 'incompatible',
      generatedAt: '2026-03-04T00:00:00.000Z',
      sourceFiles: summary.sourceFiles.map((source) => ({
        ...source,
        path: source.path.replace(tempDir, join(tempDir, 'other-root')),
      })),
    };

    const insertSnapshot = sqlite.prepare(
      `
        INSERT INTO audit_snapshots (
          id,
          created_at,
          summary_json
        ) VALUES (?, ?, ?)
      `,
    );
    insertSnapshot.run(
      legacyCompatible.auditId,
      legacyCompatible.generatedAt,
      JSON.stringify(legacyCompatible),
    );
    insertSnapshot.run(
      newestCompatible.auditId,
      newestCompatible.generatedAt,
      JSON.stringify(newestCompatible),
    );
    insertSnapshot.run(
      incompatible.auditId,
      incompatible.generatedAt,
      JSON.stringify(incompatible),
    );
    sqlite.close();

    const baseline = readLatestComparableAuditSummary({
      dbPath,
      comparisonKey: summary.comparisonKey,
      currentAuditId: summary.auditId,
    });

    expect(baseline?.auditId).toBe('newest-compatible');
    expect(baseline?.comparisonKey).toBe(summary.comparisonKey);
  });

  it('produces a readable before and after report on sequential compatible audits', async () => {
    const tempDir = createTempDir();
    const tempLog = join(tempDir, 'openclaw-2026-03-06.log');
    const dbPath = join(tempDir, 'xerg.sqlite');

    writeFileSync(tempLog, readFileSync(gatewayLog, 'utf8'));

    await auditOpenClaw({
      logFile: tempLog,
      dbPath,
    });

    writeFileSync(tempLog, makeImprovedGatewayLog());

    const summary = await auditOpenClaw({
      logFile: tempLog,
      dbPath,
      compare: true,
    });

    const terminal = renderTerminalSummary(summary);
    const markdown = renderMarkdownSummary(summary);

    expect(summary.comparison).not.toBeNull();
    expect(summary.comparison?.deltaTotalSpendUsd).toBeLessThan(0);
    expect(summary.comparison?.findingChanges.resolvedHighConfidenceWaste.length).toBeGreaterThan(
      0,
    );
    expect(terminal).toContain('## Waste taxonomy');
    expect(terminal).toContain('## Before / after');
    expect(terminal).toContain('Biggest improvement');
    expect(markdown).toContain('## Before / after');
  });
});
