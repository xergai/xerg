import { hostname } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runAuditCommand } from '../src/commands/audit.js';
import { runDoctorCommand } from '../src/commands/doctor.js';

const root = process.cwd();
const hermesLogFile = join(root, 'fixtures', 'hermes', 'logs', 'agent.log');
const hermesSessionsDir = join(root, 'fixtures', 'hermes', 'sessions');

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

describe('Hermes CLI runtime support', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a Hermes source label in push dry-run payloads', async () => {
    const output = captureOutput();

    try {
      await runAuditCommand({
        runtime: 'hermes',
        logFile: hermesLogFile,
        sessionsDir: hermesSessionsDir,
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
      sourceId: `Hermes - ${hostname()}`,
      sourceHost: hostname(),
      environment: 'local',
    });
    expect(output.getStderr()).toBe('');
  });

  it('includes full v2 recommendations in JSON output', async () => {
    const output = captureOutput();

    try {
      await runAuditCommand({
        runtime: 'hermes',
        logFile: hermesLogFile,
        sessionsDir: hermesSessionsDir,
        json: true,
        noDb: true,
      });
    } finally {
      output.restore();
    }

    const parsed = JSON.parse(output.getStdout()) as {
      recommendations?: Array<Record<string, unknown>>;
    };

    expect(parsed.recommendations?.[0]).toMatchObject({
      id: expect.any(String),
      kind: expect.any(String),
      priorityBucket: expect.any(String),
      implementationSurface: expect.any(String),
      category: expect.any(String),
      whereToChange: expect.any(String),
      validationPlan: expect.any(String),
      actions: expect.any(Array),
    });
  });

  it('rejects Hermes remote audit flags for now', async () => {
    await expect(
      runAuditCommand({
        runtime: 'hermes',
        remote: 'deploy@example.com',
      }),
    ).rejects.toThrow('Hermes remote transport is not supported yet.');
  });

  it('rejects Hermes remote doctor flags for now', async () => {
    await expect(
      runDoctorCommand({
        runtime: 'hermes',
        remote: 'deploy@example.com',
      }),
    ).rejects.toThrow('Hermes remote transport is not supported yet.');
  });

  it('renders Hermes doctor output with runtime-aware wording', async () => {
    const output = captureOutput();

    try {
      await runDoctorCommand({
        runtime: 'hermes',
        logFile: hermesLogFile,
        sessionsDir: hermesSessionsDir,
        verbose: true,
      });
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toContain('Hermes sources detected.');
    expect(output.getStdout()).toContain('[hermes/gateway]');
    expect(output.getStderr()).toContain('[verbose] Inspecting local Hermes audit readiness.');
  });
});
