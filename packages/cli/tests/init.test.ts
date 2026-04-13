import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function setPromptTty(value: boolean) {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value, configurable: true });

  return () => {
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    }
  };
}

function buildRuntimeAdapters() {
  return {
    openclaw: {
      runtime: 'openclaw' as const,
      productName: 'OpenClaw',
      defaultPaths: () => ({
        runtime: 'openclaw' as const,
        gatewayPattern: '/tmp/openclaw/openclaw-*.log',
        sessionsPattern: '~/.openclaw/agents/*/sessions/*.jsonl',
      }),
    },
    hermes: {
      runtime: 'hermes' as const,
      productName: 'Hermes',
      defaultPaths: () => ({
        runtime: 'hermes' as const,
        gatewayPattern: '~/.hermes/logs/agent.log*',
        sessionsPattern: '~/.hermes/sessions',
      }),
    },
  };
}

describe('init command', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it('runs a first audit when exactly one local runtime is detected', async () => {
    const restoreTty = setPromptTty(true);
    const promptConfirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const auditAgentRuntime = vi.fn().mockResolvedValue({
      auditId: 'audit_openclaw_1',
      runtime: 'openclaw',
    });
    const runConnectFlow = vi.fn();

    vi.doMock('@xergai/core', () => {
      const adapters = buildRuntimeAdapters();
      return {
        auditAgentRuntime,
        renderTerminalSummary: () => '# summary',
        resolveRuntimeCandidates: async () => [
          {
            adapter: adapters.openclaw,
            sources: [{ kind: 'gateway' }],
            usable: true,
          },
        ],
        getRuntimeAdapter: (runtime: 'openclaw' | 'hermes') => adapters[runtime],
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm,
      promptSelect: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/commands/connect.js', () => ({
      runConnectFlow,
    }));
    vi.doMock('../src/commands/mcp-setup.js', () => ({
      runMcpSetupFlow: vi.fn(),
    }));

    const { runInitCommand } = await import('../src/commands/init.js');
    const output = captureOutput();

    try {
      await runInitCommand();
    } finally {
      output.restore();
      restoreTty();
    }

    expect(auditAgentRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: 'openclaw',
      }),
    );
    expect(output.getStdout()).toContain('# summary');
    expect(output.getStderr()).toContain('Found local OpenClaw data');
    expect(output.getStderr()).toContain('audit --compare');
    expect(output.getStderr()).toContain('cloud disclaimer');
    expect(runConnectFlow).not.toHaveBeenCalled();
  });

  it('lets the user choose between multiple detected runtimes', async () => {
    const restoreTty = setPromptTty(true);
    const promptSelect = vi.fn().mockResolvedValue('hermes');
    const promptConfirm = vi.fn().mockResolvedValue(false);
    const auditAgentRuntime = vi.fn().mockResolvedValue({
      auditId: 'audit_hermes_1',
      runtime: 'hermes',
    });

    vi.doMock('@xergai/core', () => {
      const adapters = buildRuntimeAdapters();
      return {
        auditAgentRuntime,
        renderTerminalSummary: () => '# hermes summary',
        resolveRuntimeCandidates: async () => [
          {
            adapter: adapters.openclaw,
            sources: [{ kind: 'gateway' }],
            usable: true,
          },
          {
            adapter: adapters.hermes,
            sources: [{ kind: 'sessions' }],
            usable: true,
          },
        ],
        getRuntimeAdapter: (runtime: 'openclaw' | 'hermes') => adapters[runtime],
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm,
      promptSelect,
    }));
    vi.doMock('../src/cloud.js', () => ({
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/commands/connect.js', () => ({
      runConnectFlow: vi.fn(),
    }));
    vi.doMock('../src/commands/mcp-setup.js', () => ({
      runMcpSetupFlow: vi.fn(),
    }));

    const { runInitCommand } = await import('../src/commands/init.js');
    const output = captureOutput();

    try {
      await runInitCommand();
    } finally {
      output.restore();
      restoreTty();
    }

    expect(promptSelect).toHaveBeenCalledWith(
      'Choose the local runtime to audit first.',
      expect.any(Array),
    );
    expect(auditAgentRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: 'hermes',
      }),
    );
  });

  it('prints local and OpenClaw-only remote guidance when no runtime data is found', async () => {
    const restoreTty = setPromptTty(true);

    vi.doMock('@xergai/core', () => {
      const adapters = buildRuntimeAdapters();
      return {
        auditAgentRuntime: vi.fn(),
        renderTerminalSummary: vi.fn(),
        resolveRuntimeCandidates: async () => [],
        getRuntimeAdapter: (runtime: 'openclaw' | 'hermes') => adapters[runtime],
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn(),
      promptSelect: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/commands/connect.js', () => ({
      runConnectFlow: vi.fn(),
    }));
    vi.doMock('../src/commands/mcp-setup.js', () => ({
      runMcpSetupFlow: vi.fn(),
    }));

    const { runInitCommand } = await import('../src/commands/init.js');
    const output = captureOutput();

    try {
      await runInitCommand();
    } finally {
      output.restore();
      restoreTty();
    }

    expect(output.getStderr()).toContain('Checked defaults:');
    expect(output.getStderr()).toContain('/tmp/openclaw/openclaw-*.log');
    expect(output.getStderr()).toContain('Remote OpenClaw only');
    expect(output.getStderr()).toContain('audit --remote user@host');
    expect(output.getStderr()).toContain('audit --railway');
  });

  it('rejects non-interactive use in v1', async () => {
    const restoreTty = setPromptTty(false);

    vi.doMock('@xergai/core', () => ({
      auditAgentRuntime: vi.fn(),
      renderTerminalSummary: vi.fn(),
      resolveRuntimeCandidates: vi.fn(),
      getRuntimeAdapter: vi.fn(),
    }));
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => false,
      promptConfirm: vi.fn(),
      promptSelect: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/commands/connect.js', () => ({
      runConnectFlow: vi.fn(),
    }));
    vi.doMock('../src/commands/mcp-setup.js', () => ({
      runMcpSetupFlow: vi.fn(),
    }));

    const { runInitCommand } = await import('../src/commands/init.js');
    const output = captureOutput();

    try {
      await runInitCommand();
    } finally {
      output.restore();
      restoreTty();
    }

    expect(process.exitCode).toBe(1);
    expect(output.getStderr()).toContain('interactive in this release');
    expect(output.getStderr()).toContain('audit');
  });

  it('prints recovery guidance when the first audit fails', async () => {
    const restoreTty = setPromptTty(true);
    const promptConfirm = vi.fn().mockResolvedValue(true);

    vi.doMock('@xergai/core', () => {
      const adapters = buildRuntimeAdapters();
      return {
        auditAgentRuntime: vi.fn().mockRejectedValue(new Error('boom')),
        renderTerminalSummary: vi.fn(),
        resolveRuntimeCandidates: async () => [
          {
            adapter: adapters.hermes,
            sources: [{ kind: 'gateway' }],
            usable: true,
          },
        ],
        getRuntimeAdapter: (runtime: 'openclaw' | 'hermes') => adapters[runtime],
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm,
      promptSelect: vi.fn(),
    }));
    vi.doMock('../src/cloud.js', () => ({
      loadPushConfigOrNull: () => null,
      renderCloudDisclaimer: () => 'cloud disclaimer',
    }));
    vi.doMock('../src/commands/connect.js', () => ({
      runConnectFlow: vi.fn(),
    }));
    vi.doMock('../src/commands/mcp-setup.js', () => ({
      runMcpSetupFlow: vi.fn(),
    }));

    const { runInitCommand } = await import('../src/commands/init.js');
    const output = captureOutput();

    try {
      await runInitCommand();
    } finally {
      output.restore();
      restoreTty();
    }

    expect(process.exitCode).toBe(1);
    expect(output.getStderr()).toContain('Hermes audit failed: boom');
    expect(output.getStderr()).toContain('doctor --runtime hermes');
    expect(output.getStderr()).toContain('audit --verbose');
  });
});
