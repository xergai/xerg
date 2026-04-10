import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runDoctorCommand } from '../src/commands/doctor.js';

const root = process.cwd();
const sessionsDir = join(root, 'fixtures', 'openclaw', 'sessions');

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

describe('doctor command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints verbose progress updates to stderr', async () => {
    const output = captureOutput();

    try {
      await runDoctorCommand({
        runtime: 'openclaw',
        sessionsDir,
        verbose: true,
      });
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toContain('# Xerg doctor');
    expect(output.getStderr()).toContain('[verbose] Inspecting local OpenClaw audit readiness.');
    expect(output.getStderr()).toContain('[verbose] Checking local OpenClaw defaults...');
    expect(output.getStderr()).toContain('[verbose] Detected 1 local source file.');
  });
});
