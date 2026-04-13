import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NoDataError } from '../src/errors.js';

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

describe('connect flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it.each([
    { source: 'env' as const, label: 'environment variable' },
    { source: 'config' as const, label: 'config file' },
    { source: 'stored' as const, label: 'stored credentials' },
  ])('accepts existing auth from $label in non-interactive mode', async ({ source }) => {
    vi.doMock('@xergai/core', () => ({
      toWirePayload: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      authenticateAndLoadPushConfig: vi.fn(),
      loadPushConfigOrNull: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source,
      }),
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => false,
      promptConfirm: vi.fn(),
    }));
    vi.doMock('../src/commands/push.js', () => ({
      loadLatestCachedAuditPayload: vi.fn(),
    }));
    vi.doMock('../src/push/index.js', () => ({
      loadPushConfig: vi.fn(),
      pushAudit: vi.fn(),
    }));
    vi.doMock('../src/source-meta.js', () => ({
      buildLocalPushSourceMeta: vi.fn(),
    }));

    const { runConnectFlow } = await import('../src/commands/connect.js');
    const output = captureOutput();

    try {
      await expect(runConnectFlow()).resolves.toBe(true);
    } finally {
      output.restore();
    }

    expect(output.getStderr()).toContain('Xerg authentication detected.');
    expect(output.getStderr()).toContain('Non-interactive mode skips the push prompt');
  });

  it('fails in non-interactive mode when login confirmation would be required', async () => {
    vi.doMock('@xergai/core', () => ({
      toWirePayload: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      authenticateAndLoadPushConfig: vi.fn(),
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => false,
      promptConfirm: vi.fn(),
    }));
    vi.doMock('../src/commands/push.js', () => ({
      loadLatestCachedAuditPayload: vi.fn(),
    }));
    vi.doMock('../src/push/index.js', () => ({
      loadPushConfig: vi.fn(),
      pushAudit: vi.fn(),
    }));
    vi.doMock('../src/source-meta.js', () => ({
      buildLocalPushSourceMeta: vi.fn(),
    }));

    const { runConnectFlow } = await import('../src/commands/connect.js');
    const output = captureOutput();

    try {
      await expect(runConnectFlow()).resolves.toBe(false);
    } finally {
      output.restore();
    }

    expect(process.exitCode).toBe(1);
    expect(output.getStderr()).toContain('needs an interactive terminal');
    expect(output.getStderr()).toContain('login from a TTY');
  });

  it('pushes the in-memory audit summary passed from init', async () => {
    const pushAudit = vi.fn().mockResolvedValue({
      ok: true,
      auditId: 'audit_from_init',
    });
    const toWirePayload = vi.fn().mockReturnValue({
      version: 1,
      summary: {
        auditId: 'audit_from_init',
      },
      meta: {
        environment: 'local',
      },
    });

    vi.doMock('@xergai/core', () => ({
      toWirePayload,
    }));
    vi.doMock('../src/cloud.js', () => ({
      authenticateAndLoadPushConfig: vi.fn(),
      loadPushConfigOrNull: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env',
      }),
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock('../src/commands/push.js', () => ({
      loadLatestCachedAuditPayload: vi.fn(),
    }));
    vi.doMock('../src/push/index.js', () => ({
      loadPushConfig: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env' as const,
      }),
      pushAudit,
    }));
    vi.doMock('../src/source-meta.js', () => ({
      buildLocalPushSourceMeta: () => ({
        sourceId: 'OpenClaw - localhost',
        sourceHost: 'localhost',
        environment: 'local',
      }),
    }));

    const { runConnectFlow } = await import('../src/commands/connect.js');
    const output = captureOutput();

    try {
      await expect(
        runConnectFlow({
          auditSummary: {
            auditId: 'audit_from_init',
            generatedAt: '2026-04-13T00:00:00.000Z',
            runtime: 'openclaw',
          } as never,
        }),
      ).resolves.toBe(true);
    } finally {
      output.restore();
    }

    expect(toWirePayload).toHaveBeenCalledTimes(1);
    expect(pushAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({
          auditId: 'audit_from_init',
        }),
      }),
      expect.objectContaining({
        apiKey: 'sk_test_auth',
      }),
    );
    const { promptConfirm } = await import('../src/prompts.js');
    expect(promptConfirm).toHaveBeenCalledWith('Push this audit to Xerg Cloud?', true);
  });

  it('pushes the latest cached audit in standalone mode', async () => {
    const loadLatestCachedAuditPayload = vi.fn().mockReturnValue({
      version: 1,
      summary: {
        auditId: 'audit_cached_1',
      },
      meta: {},
    });
    const pushAudit = vi.fn().mockResolvedValue({
      ok: true,
      auditId: 'audit_cached_1',
    });

    vi.doMock('@xergai/core', () => ({
      toWirePayload: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      authenticateAndLoadPushConfig: vi.fn(),
      loadPushConfigOrNull: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env',
      }),
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock('../src/commands/push.js', () => ({
      loadLatestCachedAuditPayload,
    }));
    vi.doMock('../src/push/index.js', () => ({
      loadPushConfig: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env' as const,
      }),
      pushAudit,
    }));
    vi.doMock('../src/source-meta.js', () => ({
      buildLocalPushSourceMeta: vi.fn(),
    }));

    const { runConnectFlow } = await import('../src/commands/connect.js');
    const output = captureOutput();

    try {
      await expect(runConnectFlow()).resolves.toBe(true);
    } finally {
      output.restore();
    }

    expect(loadLatestCachedAuditPayload).toHaveBeenCalledTimes(1);
    expect(pushAudit).toHaveBeenCalledTimes(1);
    expect(output.getStderr()).toContain('Pushed successfully');
  });

  it('prints guidance when there is no cached audit to push', async () => {
    const pushAudit = vi.fn();

    vi.doMock('@xergai/core', () => ({
      toWirePayload: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      authenticateAndLoadPushConfig: vi.fn(),
      loadPushConfigOrNull: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env',
      }),
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock('../src/commands/push.js', () => ({
      loadLatestCachedAuditPayload: vi.fn().mockImplementation(() => {
        throw new NoDataError('No cached audit snapshots found. Run `xerg audit` first.');
      }),
    }));
    vi.doMock('../src/push/index.js', () => ({
      loadPushConfig: () => ({
        apiKey: 'sk_test_auth',
        apiUrl: 'https://api.xerg.ai',
        source: 'env' as const,
      }),
      pushAudit,
    }));
    vi.doMock('../src/source-meta.js', () => ({
      buildLocalPushSourceMeta: vi.fn(),
    }));

    const { runConnectFlow } = await import('../src/commands/connect.js');
    const output = captureOutput();

    try {
      await expect(runConnectFlow()).resolves.toBe(true);
    } finally {
      output.restore();
    }

    expect(pushAudit).not.toHaveBeenCalled();
    expect(output.getStderr()).toContain('No cached audit snapshots found');
    expect(output.getStderr()).toContain('xerg audit');
  });
});
