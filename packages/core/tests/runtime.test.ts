import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const openClawLogFile = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');
const openClawSessionsDir = join(root, 'fixtures', 'openclaw', 'sessions');
const hermesLogFile = join(root, 'fixtures', 'hermes', 'logs', 'agent.log');
const hermesSessionsDir = join(root, 'fixtures', 'hermes', 'sessions');
const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function loadCoreIndex() {
  vi.resetModules();
  return import('../src/index.js');
}

async function loadHermesDetection() {
  vi.resetModules();
  return import('../src/detect/hermes.js');
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Hermes detection and normalization', () => {
  it('detects Hermes logs and transcripts while ignoring sessions.json', async () => {
    const { detectHermesSources } = await loadHermesDetection();
    const sources = await detectHermesSources({
      logFile: hermesLogFile,
      sessionsDir: hermesSessionsDir,
    });

    expect(sources.some((source) => source.path.endsWith('sessions.json'))).toBe(false);
    expect(sources.some((source) => source.path.endsWith('agent.log'))).toBe(true);
    expect(sources.some((source) => source.kind === 'sessions')).toBe(true);
  });

  it('produces a Hermes audit summary with the shared findings pipeline', async () => {
    const { auditHermes } = await loadCoreIndex();
    const summary = await auditHermes({
      logFile: hermesLogFile,
      sessionsDir: hermesSessionsDir,
      noDb: true,
    });

    expect(summary.runtime).toBe('hermes');
    expect(summary.callCount).toBeGreaterThan(4);
    expect(summary.findings.some((finding) => finding.kind === 'retry-waste')).toBe(true);
    expect(summary.findings.some((finding) => finding.kind === 'candidate-downgrade')).toBe(true);
  });
});

describe('runtime auto-resolution', () => {
  it('auto-selects OpenClaw when only OpenClaw paths are provided', async () => {
    const { auditAgentRuntime } = await loadCoreIndex();
    const summary = await auditAgentRuntime({
      logFile: openClawLogFile,
      sessionsDir: openClawSessionsDir,
      noDb: true,
    });

    expect(summary.runtime).toBe('openclaw');
  });

  it('auto-selects Hermes when only Hermes paths are provided', async () => {
    const { auditAgentRuntime } = await loadCoreIndex();
    const summary = await auditAgentRuntime({
      logFile: hermesLogFile,
      sessionsDir: hermesSessionsDir,
      noDb: true,
    });

    expect(summary.runtime).toBe('hermes');
  });

  it('fails with a no-data error when no supported local runtime is present', async () => {
    const { auditAgentRuntime } = await loadCoreIndex();

    await expect(auditAgentRuntime({ noDb: true, commandPrefix: 'xerg' })).rejects.toThrow(
      'No supported local runtime sources were detected.',
    );
  });

  it('fails fast when explicit files are ambiguous across runtimes', async () => {
    const tempDir = createTempDir('xerg-runtime-ambiguous-');
    const logPath = join(tempDir, 'generic.log');

    writeFileSync(
      logPath,
      '{"timestamp":"2026-04-10T00:00:00.000Z","provider":"anthropic","model":"claude-haiku-4-5","usage":{"input_tokens":100,"output_tokens":20,"cost_usd":0.00038},"status":"success"}\n',
    );

    const { auditAgentRuntime } = await loadCoreIndex();
    await expect(
      auditAgentRuntime({
        logFile: logPath,
        noDb: true,
      }),
    ).rejects.toThrow(
      'Could not determine whether the provided local files belong to OpenClaw or Hermes.',
    );
  });

  it('treats a generic gateway.log file as ambiguous instead of forcing Hermes', async () => {
    const tempDir = createTempDir('xerg-runtime-gateway-ambiguous-');
    const logPath = join(tempDir, 'gateway.log');

    writeFileSync(
      logPath,
      '{"timestamp":"2026-04-10T00:00:00.000Z","provider":"anthropic","model":"claude-haiku-4-5","usage":{"input_tokens":100,"output_tokens":20,"cost_usd":0.00038},"status":"success"}\n',
    );

    const { auditAgentRuntime } = await loadCoreIndex();
    await expect(
      auditAgentRuntime({
        logFile: logPath,
        noDb: true,
      }),
    ).rejects.toThrow(
      'Could not determine whether the provided local files belong to OpenClaw or Hermes.',
    );
  });

  it('returns a no-data error when explicit local paths do not resolve to any files', async () => {
    const tempDir = createTempDir('xerg-runtime-missing-paths-');
    const missingLogPath = join(tempDir, 'missing.log');

    const { auditAgentRuntime } = await loadCoreIndex();
    await expect(
      auditAgentRuntime({
        logFile: missingLogPath,
        noDb: true,
        commandPrefix: 'xerg',
      }),
    ).rejects.toThrow('No supported local runtime sources were detected.');
  });

  it('returns an ambiguous doctor report for ambiguous explicit paths', async () => {
    const tempDir = createTempDir('xerg-runtime-doctor-ambiguous-');
    const logPath = join(tempDir, 'generic.log');

    writeFileSync(
      logPath,
      '{"timestamp":"2026-04-10T00:00:00.000Z","provider":"anthropic","model":"claude-haiku-4-5","usage":{"input_tokens":100,"output_tokens":20,"cost_usd":0.00038},"status":"success"}\n',
    );

    const { doctorAgentRuntime } = await loadCoreIndex();
    const report = await doctorAgentRuntime({
      logFile: logPath,
    });

    expect(report.mode).toBe('ambiguous');
    expect(report.canAudit).toBe(false);
    expect(report.notes.some((note) => note.includes('Could not determine whether'))).toBe(true);
  });

  it('returns a no-data doctor report when explicit local paths do not resolve to any files', async () => {
    const tempDir = createTempDir('xerg-runtime-doctor-missing-');
    const missingLogPath = join(tempDir, 'missing.log');

    const { doctorAgentRuntime } = await loadCoreIndex();
    const report = await doctorAgentRuntime({
      logFile: missingLogPath,
    });

    expect(report.mode).toBe('none');
    expect(report.canAudit).toBe(false);
    expect(
      report.notes.some((note) =>
        note.includes(
          'No supported local runtime sources were detected from the provided local paths.',
        ),
      ),
    ).toBe(true);
  });
});
