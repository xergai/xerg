import { hostname } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runAuditCommand } from '../src/commands/audit.js';
import { runDoctorCommand } from '../src/commands/doctor.js';

const root = process.cwd();
const cursorUsageCsv = join(root, 'fixtures', 'cursor', 'usage-sample.csv');

function captureOutput() {
  let stdout = '';
  let stderr = '';

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stdout += chunk.toString();
    return true;
  }) as typeof process.stdout.write);

  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stderr += chunk.toString();
    return true;
  }) as typeof process.stderr.write);

  return {
    getStdout: () => stdout,
    getStderr: () => stderr,
    restore: () => {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    },
  };
}

describe('cursor usage csv CLI', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints cursor doctor output and verbose progress', async () => {
    const output = captureOutput();

    try {
      await runDoctorCommand({
        cursorUsageCsv,
        verbose: true,
      });
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toContain('# Xerg doctor [cursor csv]');
    expect(output.getStdout()).toContain('Rows: 5');
    expect(output.getStderr()).toContain(
      '[verbose] Inspecting local Cursor usage CSV audit readiness.',
    );
    expect(output.getStderr()).toContain('[verbose] Inspecting Cursor usage CSV...');
  });

  it('includes pricing coverage and cursor usage details in JSON output', async () => {
    const output = captureOutput();

    try {
      await runAuditCommand({
        cursorUsageCsv,
        json: true,
        noDb: true,
      });
    } finally {
      output.restore();
    }

    const parsed = JSON.parse(output.getStdout()) as {
      pricingCoverage?: { pricedCallCount: number; unpricedCallCount: number };
      cursorUsage?: { totalTokens: number };
      recommendations?: unknown[];
    };

    expect(parsed.pricingCoverage).toMatchObject({
      pricedCallCount: 3,
      unpricedCallCount: 2,
    });
    expect(parsed.cursorUsage?.totalTokens).toBe(13850);
    expect(Array.isArray(parsed.recommendations)).toBe(true);
  });

  it('uses a descriptive source label in push dry-run payloads', async () => {
    const output = captureOutput();

    try {
      await runAuditCommand({
        cursorUsageCsv,
        push: true,
        dryRun: true,
        noDb: true,
      });
    } finally {
      output.restore();
    }

    const parsed = JSON.parse(output.getStdout()) as {
      meta?: { sourceId?: string; sourceHost?: string; environment?: string };
    };

    expect(parsed.meta).toMatchObject({
      sourceId: `Cursor - ${hostname()}`,
      sourceHost: hostname(),
      environment: 'local',
    });
    expect(output.getStderr()).toBe('');
  });

  it('keeps the markdown audit output stable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T12:00:00.000Z'));

    const output = captureOutput();

    try {
      await runAuditCommand({
        cursorUsageCsv,
        markdown: true,
        noDb: true,
      });
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toMatchSnapshot();
    expect(output.getStderr()).toBe('');
  });

  it('rejects mixing --cursor-usage-csv with local OpenClaw flags', async () => {
    await expect(
      runAuditCommand({
        cursorUsageCsv,
        logFile: '/tmp/openclaw.log',
      }),
    ).rejects.toThrow('--cursor-usage-csv flag cannot be combined with --log-file');
  });

  it('rejects mixing --cursor-usage-csv with remote doctor flags', async () => {
    await expect(
      runDoctorCommand({
        cursorUsageCsv,
        remote: 'deploy@example.com',
      }),
    ).rejects.toThrow('--cursor-usage-csv flag cannot be combined with --remote');
  });
});
