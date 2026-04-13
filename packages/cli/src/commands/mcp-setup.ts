import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  authenticateAndLoadPushConfig,
  loadPushConfigOrNull,
  renderCloudDisclaimer,
  renderMcpCredentialSourceMessage,
} from '../cloud.js';
import { formatCommand } from '../command-display.js';
import { hasPromptTty, promptConfirm, promptSelect } from '../prompts.js';
import type { PushConfig } from '../push/index.js';

const HOSTED_MCP_URL = 'https://mcp.xerg.ai/mcp';

type McpClient = 'cursor' | 'claude-code' | 'other';

export async function runMcpSetupCommand() {
  await runMcpSetupFlow();
}

export async function runMcpSetupFlow() {
  let config = loadPushConfigOrNull();

  if (!config) {
    process.stderr.write(`${renderCloudDisclaimer()}\n`);
    process.stderr.write('Hosted MCP requires Xerg Cloud authentication before client setup.\n');
  }

  if (!hasPromptTty()) {
    process.stderr.write(
      `${formatCommand('mcp-setup')} needs an interactive terminal so it can ask which MCP client you want to configure.\n`,
    );
    process.exitCode = 1;
    return;
  }

  if (!config) {
    const shouldLogin = await promptConfirm('Authenticate with Xerg Cloud now?', true);
    if (!shouldLogin) {
      process.stderr.write(
        `Skipped hosted MCP setup. Run ${formatCommand('mcp-setup')} when you're ready.\n`,
      );
      return;
    }

    config = await authenticateAndLoadPushConfig();
  }

  process.stderr.write(`${renderMcpCredentialSourceMessage(config)}\n`);

  const client = await promptSelect<McpClient>('Which MCP client do you want to configure?', [
    {
      name: 'Cursor',
      value: 'cursor',
      description: 'Project-scoped or global Cursor MCP config',
    },
    {
      name: 'Claude Code',
      value: 'claude-code',
      description: 'Project-scoped Claude Code MCP config',
    },
    {
      name: 'Other',
      value: 'other',
      description: 'Print the hosted HTTP MCP snippet for another client',
    },
  ]);

  const snippet = JSON.stringify(buildHostedMcpConfig(config), null, 2);

  if (client === 'cursor') {
    await handleCursorSetup(snippet, config);
    return;
  }

  process.stdout.write(`${snippet}\n`);

  if (client === 'claude-code') {
    process.stderr.write(
      'Add this to `.mcp.json` in your project root, or import the same `mcpServers.xerg` config through Claude Code MCP settings.\n',
    );
    return;
  }

  process.stderr.write(
    `Add this as a remote HTTP MCP server in your client. Endpoint: ${HOSTED_MCP_URL}\n`,
  );
}

async function handleCursorSetup(snippet: string, config: PushConfig) {
  const cursorDir = join(process.cwd(), '.cursor');
  const cursorConfigPath = join(cursorDir, 'mcp.json');

  if (existsSync(cursorDir)) {
    const shouldWrite = await promptConfirm(
      'Write a project-scoped Cursor MCP config to .cursor/mcp.json?',
      true,
    );

    if (shouldWrite) {
      writeCursorConfig(cursorConfigPath, config);
      process.stderr.write(`Wrote hosted MCP config to ${cursorConfigPath}.\n`);
      return;
    }
  }

  process.stdout.write(`${snippet}\n`);
  process.stderr.write(
    'Add this to `.cursor/mcp.json` for a project-scoped Cursor config, or `~/.cursor/mcp.json` for a global Cursor config.\n',
  );
}

function buildHostedMcpConfig(config: PushConfig) {
  return {
    mcpServers: {
      xerg: {
        type: 'http',
        url: HOSTED_MCP_URL,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      },
    },
  };
}

function writeCursorConfig(filePath: string, config: PushConfig) {
  mkdirSync(dirname(filePath), { recursive: true });

  let parsed: {
    mcpServers?: Record<string, unknown>;
    [key: string]: unknown;
  } = {};

  if (existsSync(filePath)) {
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf8')) as typeof parsed;
    } catch {
      throw new Error(`Cursor config is not valid JSON: ${filePath}`);
    }
  }

  const existingServers = parsed.mcpServers;
  if (existingServers && typeof existingServers !== 'object') {
    throw new Error(`Cursor config has an invalid "mcpServers" value: ${filePath}`);
  }

  parsed.mcpServers = {
    ...(existingServers ?? {}),
    xerg: buildHostedMcpConfig(config).mcpServers.xerg,
  };

  writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
}
