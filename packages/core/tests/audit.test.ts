import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { auditOpenClaw, doctorOpenClaw } from '../src/index.js';

const root = process.cwd();
const gatewayLog = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');
const sessionsDir = join(root, 'fixtures', 'openclaw', 'sessions');

describe('xerg audit', () => {
  it('produces an audit summary with waste and opportunity findings', async () => {
    const summary = await auditOpenClaw({
      logFile: gatewayLog,
      noDb: true,
    });

    expect(summary.runtime).toBe('openclaw');
    expect(summary.runCount).toBeGreaterThan(4);
    expect(summary.callCount).toBe(15);
    expect(summary.totalSpendUsd).toBeGreaterThan(0.06);
    expect(summary.findings.some((finding) => finding.kind === 'retry-waste')).toBe(true);
    expect(summary.findings.some((finding) => finding.kind === 'loop-waste')).toBe(true);
    expect(summary.findings.some((finding) => finding.kind === 'candidate-downgrade')).toBe(true);
    expect(summary.findings.some((finding) => finding.kind === 'context-outlier')).toBe(true);
    expect(
      summary.findings.every((finding) => finding.scope === 'global' || finding.scopeLabel),
    ).toBe(true);
    expect(summary.findings.find((finding) => finding.kind === 'loop-waste')?.scopeId).toBe(
      summary.findings.find((finding) => finding.kind === 'loop-waste')?.scopeLabel,
    );
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.spendByDay).toEqual([
      {
        date: '2026-03-06',
        spendUsd: summary.totalSpendUsd,
        observedSpendUsd: summary.observedSpendUsd,
        estimatedSpendUsd: summary.estimatedSpendUsd,
        callCount: summary.callCount,
      },
    ]);
    expect(summary.wasteByDay).toEqual([
      {
        date: '2026-03-06',
        wasteUsd: summary.wasteSpendUsd,
      },
    ]);
  });

  it('inspects session transcript sources in doctor mode', async () => {
    const report = await doctorOpenClaw({
      sessionsDir,
    });

    expect(report.canAudit).toBe(true);
    expect(report.runtime).toBe('openclaw');
    expect(report.sources.some((source) => source.kind === 'sessions')).toBe(true);
  });
});
