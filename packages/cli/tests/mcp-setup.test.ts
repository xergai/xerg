import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

function createTempDir(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('mcp setup flow', () => {
  const originalCwd = process.cwd();
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    process.chdir(originalCwd);

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('explains the paid cloud requirement when auth is missing', async () => {
    vi.doMock('../src/cloud.js', async () => {
      const actual = await vi.importActual<typeof import('../src/cloud.js')>('../src/cloud.js');
      return {
        ...actual,
        authenticateAndLoadPushConfig: vi.fn(),
        loadPushConfigOrNull: () => null,
        renderCloudDisclaimer: () => 'cloud disclaimer',
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn().mockResolvedValue(false),
      promptSelect: vi.fn(),
    }));

    const { runMcpSetupFlow } = await import('../src/commands/mcp-setup.js');
    const output = captureOutput();

    try {
      await runMcpSetupFlow();
    } finally {
      output.restore();
    }

    expect(output.getStderr()).toContain('cloud disclaimer');
    expect(output.getStderr()).toContain('Hosted MCP requires Xerg Cloud authentication');
    expect(output.getStderr()).toContain('Skipped hosted MCP setup');
  });

  it.each([
    { source: 'env' as const, message: 'Using your workspace API key.' },
    { source: 'config' as const, message: 'Using your workspace API key.' },
    {
      source: 'stored' as const,
      message:
        'Using your stored login token. If hosted MCP requires a workspace API key, create one at xerg.ai/dashboard/settings and set XERG_API_KEY.',
    },
  ])('prints the credential-source caveat for $source auth', async ({ source, message }) => {
    vi.doMock('../src/cloud.js', async () => {
      const actual = await vi.importActual<typeof import('../src/cloud.js')>('../src/cloud.js');
      return {
        ...actual,
        authenticateAndLoadPushConfig: vi.fn(),
        loadPushConfigOrNull: () => ({
          apiKey: 'sk_test_token',
          apiUrl: 'https://api.xerg.ai',
          source,
        }),
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn(),
      promptSelect: vi.fn().mockResolvedValue('other'),
    }));

    const { runMcpSetupFlow } = await import('../src/commands/mcp-setup.js');
    const output = captureOutput();

    try {
      await runMcpSetupFlow();
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toContain('https://mcp.xerg.ai/mcp');
    expect(output.getStdout()).toContain('Bearer sk_test_token');
    expect(output.getStderr()).toContain(message);
  });

  it('writes a project-scoped Cursor config when .cursor already exists', async () => {
    const cwd = createTempDir('xerg-mcp-cursor-');
    tempDirs.push(cwd);
    mkdirSync(join(cwd, '.cursor'), { recursive: true });
    process.chdir(cwd);

    vi.doMock('../src/cloud.js', async () => {
      const actual = await vi.importActual<typeof import('../src/cloud.js')>('../src/cloud.js');
      return {
        ...actual,
        authenticateAndLoadPushConfig: vi.fn(),
        loadPushConfigOrNull: () => ({
          apiKey: 'sk_test_token',
          apiUrl: 'https://api.xerg.ai',
          source: 'env' as const,
        }),
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn().mockResolvedValue(true),
      promptSelect: vi.fn().mockResolvedValue('cursor'),
    }));

    const { runMcpSetupFlow } = await import('../src/commands/mcp-setup.js');
    const output = captureOutput();

    try {
      await runMcpSetupFlow();
    } finally {
      output.restore();
    }

    const cursorConfigPath = join(cwd, '.cursor', 'mcp.json');
    expect(existsSync(cursorConfigPath)).toBe(true);
    expect(JSON.parse(readFileSync(cursorConfigPath, 'utf8'))).toMatchObject({
      mcpServers: {
        xerg: {
          url: 'https://mcp.xerg.ai/mcp',
          headers: {
            Authorization: 'Bearer sk_test_token',
          },
        },
      },
    });
    expect(output.getStderr()).toContain('Wrote hosted MCP config');
  });

  it('prints the snippet instead of writing when no project Cursor directory exists', async () => {
    const cwd = createTempDir('xerg-mcp-print-');
    tempDirs.push(cwd);
    process.chdir(cwd);

    vi.doMock('../src/cloud.js', async () => {
      const actual = await vi.importActual<typeof import('../src/cloud.js')>('../src/cloud.js');
      return {
        ...actual,
        authenticateAndLoadPushConfig: vi.fn(),
        loadPushConfigOrNull: () => ({
          apiKey: 'sk_test_token',
          apiUrl: 'https://api.xerg.ai',
          source: 'env' as const,
        }),
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn(),
      promptSelect: vi.fn().mockResolvedValue('cursor'),
    }));

    const { runMcpSetupFlow } = await import('../src/commands/mcp-setup.js');
    const output = captureOutput();

    try {
      await runMcpSetupFlow();
    } finally {
      output.restore();
    }

    expect(existsSync(join(cwd, '.cursor', 'mcp.json'))).toBe(false);
    expect(output.getStdout()).toContain('https://mcp.xerg.ai/mcp');
    expect(output.getStderr()).toContain('.cursor/mcp.json');
  });

  it('prints a Codex config.toml snippet when Codex is selected', async () => {
    vi.doMock('../src/cloud.js', async () => {
      const actual = await vi.importActual<typeof import('../src/cloud.js')>('../src/cloud.js');
      return {
        ...actual,
        authenticateAndLoadPushConfig: vi.fn(),
        loadPushConfigOrNull: () => ({
          apiKey: 'sk_test_token',
          apiUrl: 'https://api.xerg.ai',
          source: 'env' as const,
        }),
      };
    });
    vi.doMock('../src/prompts.js', () => ({
      hasPromptTty: () => true,
      promptConfirm: vi.fn(),
      promptSelect: vi.fn().mockResolvedValue('codex'),
    }));

    const { runMcpSetupFlow } = await import('../src/commands/mcp-setup.js');
    const output = captureOutput();

    try {
      await runMcpSetupFlow();
    } finally {
      output.restore();
    }

    expect(output.getStdout()).toContain('[mcp_servers.xerg]');
    expect(output.getStdout()).toContain('url = "https://mcp.xerg.ai/mcp"');
    expect(output.getStdout()).toContain('Authorization = "Bearer sk_test_token"');
    expect(output.getStderr()).toContain('~/.codex/config.toml');
  });
});
