import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function buildPayload(auditId = 'audit_test_123') {
  return {
    version: 1,
    summary: {
      auditId,
      generatedAt: '2026-03-25T00:00:00.000Z',
    },
    meta: {
      cliVersion: '0.1.4',
      sourceId: 'local-test',
      sourceHost: 'localhost',
      environment: 'local',
    },
  };
}

function captureOutput() {
  let stdout = '';
  let stderr = '';

  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    }) as typeof process.stdout.write);

  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation(((chunk: string | Uint8Array) => {
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

describe('Phase 2b CLI commands', () => {
  const originalEnv = {
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XERG_API_KEY: process.env.XERG_API_KEY,
    XERG_API_URL: process.env.XERG_API_URL,
  };

  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.XERG_API_KEY;
    delete process.env.XERG_API_URL;
  });

  afterEach(() => {
    vi.doUnmock('@xergai/core');
    vi.doUnmock('node:child_process');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();

    if (originalEnv.XDG_CONFIG_HOME !== undefined) {
      process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }

    if (originalEnv.XERG_API_KEY !== undefined) {
      process.env.XERG_API_KEY = originalEnv.XERG_API_KEY;
    } else {
      delete process.env.XERG_API_KEY;
    }

    if (originalEnv.XERG_API_URL !== undefined) {
      process.env.XERG_API_URL = originalEnv.XERG_API_URL;
    } else {
      delete process.env.XERG_API_URL;
    }

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stores credentials after a successful login flow', async () => {
    const configHome = createTempDir('xerg-login-');
    tempDirs.push(configHome);
    process.env.XDG_CONFIG_HOME = configHome;

    vi.useFakeTimers();

    const execMock = vi.fn((_cmd: string, cb?: (error: Error | null) => void) => cb?.(null));
    vi.doMock('node:child_process', () => ({
      exec: execMock,
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceCode: 'device_123',
          userCode: 'USER-123',
          verificationUrl: 'https://xerg.ai/verify',
          interval: 0,
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          token: 'sk_test_login',
          teamName: 'Acme',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { runLoginCommand } = await import('../src/commands/login.js');
    const { getCredentialsPath } = await import('../src/auth/credentials.js');

    const output = captureOutput();
    const loginPromise = runLoginCommand();
    await vi.advanceTimersByTimeAsync(2_000);
    await loginPromise;
    output.restore();

    const credentialsPath = getCredentialsPath();
    expect(existsSync(credentialsPath)).toBe(true);
    expect(JSON.parse(readFileSync(credentialsPath, 'utf8'))).toMatchObject({
      token: 'sk_test_login',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.xerg.ai/v1/auth/device-code',
      { method: 'POST' },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.xerg.ai/v1/auth/device-token',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(execMock).toHaveBeenCalled();
  });

  it('clears stored credentials on logout', async () => {
    const configHome = createTempDir('xerg-logout-');
    tempDirs.push(configHome);
    process.env.XDG_CONFIG_HOME = configHome;

    const { getCredentialsPath, storeCredentials } = await import('../src/auth/credentials.js');
    const { runLogoutCommand } = await import('../src/commands/logout.js');

    storeCredentials('sk_test_logout');
    const output = captureOutput();
    runLogoutCommand();
    output.restore();

    expect(existsSync(getCredentialsPath())).toBe(false);
    expect(output.getStderr()).toContain('Credentials removed');
  });

  it('prints a file payload in dry-run mode', async () => {
    const workDir = createTempDir('xerg-push-file-');
    tempDirs.push(workDir);

    const payloadPath = join(workDir, 'payload.json');
    writeFileSync(payloadPath, JSON.stringify(buildPayload(), null, 2));

    const { runPushCommand } = await import('../src/commands/push.js');
    const output = captureOutput();
    await runPushCommand({ file: payloadPath, dryRun: true });
    output.restore();

    expect(output.getStdout()).toContain('"auditId": "audit_test_123"');
  });

  it('pushes a file payload to the configured API', async () => {
    const workDir = createTempDir('xerg-push-live-');
    tempDirs.push(workDir);

    process.env.XERG_API_KEY = 'sk_test_push';
    process.env.XERG_API_URL = 'https://api-staging.xerg.ai';

    const payloadPath = join(workDir, 'payload.json');
    writeFileSync(payloadPath, JSON.stringify(buildPayload('audit_live_123'), null, 2));

    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 'audit_live_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { runPushCommand } = await import('../src/commands/push.js');
    const output = captureOutput();
    await runPushCommand({ file: payloadPath });
    output.restore();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-staging.xerg.ai/v1/audits',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_push',
        }),
      }),
    );
    expect(output.getStderr()).toContain('Pushed successfully');
  });

  it('pushes the most recent cached audit when no file is provided', async () => {
    process.env.XERG_API_KEY = 'sk_test_cached';

    vi.doMock('@xergai/core', () => ({
      getDefaultDbPath: () => '/tmp/xerg-test.db',
      listStoredAuditSummaries: () => [
        {
          auditId: 'audit_cached_123',
          generatedAt: '2026-03-25T12:00:00.000Z',
        },
      ],
      toWirePayload: (summary: { auditId: string }, meta: Record<string, unknown>) => ({
        version: 1,
        summary: {
          auditId: summary.auditId,
          generatedAt: '2026-03-25T12:00:00.000Z',
        },
        meta,
      }),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ id: 'audit_cached_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { runPushCommand } = await import('../src/commands/push.js');
    const output = captureOutput();
    await runPushCommand({});
    output.restore();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(output.getStderr()).toContain('Using most recent cached audit: audit_cached_123');
  });
});
