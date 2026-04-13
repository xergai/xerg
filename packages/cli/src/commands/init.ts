import {
  auditAgentRuntime,
  getRuntimeAdapter,
  renderTerminalSummary,
  resolveRuntimeCandidates,
} from '@xergai/core';
import type { AgentRuntime } from '@xergai/core';

import { loadPushConfigOrNull, renderCloudDisclaimer } from '../cloud.js';
import { formatCommand } from '../command-display.js';
import { hasPromptTty, promptConfirm, promptSelect } from '../prompts.js';
import { runConnectFlow } from './connect.js';
import { runMcpSetupFlow } from './mcp-setup.js';

type RuntimeCandidate = Awaited<ReturnType<typeof resolveRuntimeCandidates>>[number];

export async function runInitCommand() {
  if (!hasPromptTty()) {
    process.stderr.write(
      `${formatCommand('init')} is interactive in this release. Run ${formatCommand('audit')} directly when you need a non-interactive audit.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const candidates = await resolveRuntimeCandidates({ runtime: 'auto' });
  const usable = candidates.filter((candidate) => candidate.usable);

  if (usable.length === 0) {
    renderNoDataGuidance();
    return;
  }

  const runtime = await chooseRuntime(usable);
  if (!runtime) {
    return;
  }

  try {
    const summary = await auditAgentRuntime({
      runtime,
      commandPrefix: formatCommand(''),
    });

    process.stdout.write(`${renderTerminalSummary(summary)}\n`);
    process.stderr.write(
      `\nNext: after you make a fix, run ${formatCommand('audit --compare')} to measure the delta.\n`,
    );

    const existingAuth = loadPushConfigOrNull();
    process.stderr.write(
      `${
        existingAuth
          ? 'Xerg Cloud authentication is already configured. You can optionally push this audit and set up hosted MCP next.'
          : renderCloudDisclaimer()
      }\n`,
    );

    const shouldConnect = await promptConfirm('Continue with optional Xerg Cloud setup?', true);
    if (!shouldConnect) {
      process.stderr.write(
        `Skipped Xerg Cloud setup. Run ${formatCommand('connect')} or ${formatCommand('mcp-setup')} whenever you want the hosted follow-up.\n`,
      );
      return;
    }

    const connected = await runConnectFlow({
      skipDisclaimer: true,
      auditSummary: summary,
    });

    if (!connected) {
      return;
    }

    const shouldSetupMcp = await promptConfirm('Set up hosted MCP now?', true);
    if (!shouldSetupMcp) {
      process.stderr.write(
        `Skipped hosted MCP setup. Run ${formatCommand('mcp-setup')} when you're ready.\n`,
      );
      return;
    }

    await runMcpSetupFlow();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const productName = getRuntimeAdapter(runtime).productName;
    process.stderr.write(
      `${[
        `${productName} audit failed: ${message}`,
        `Try ${formatCommand(['doctor', '--runtime', runtime])} to inspect the detected paths first.`,
        `Re-run ${formatCommand('audit --verbose')} for more detail.`,
      ].join('\n')}\n`,
    );
    process.exitCode = 1;
  }
}

async function chooseRuntime(candidates: RuntimeCandidate[]): Promise<AgentRuntime | null> {
  if (candidates.length === 1) {
    const candidate = candidates[0];
    process.stderr.write(`${describeCandidate(candidate)}\n`);

    const shouldAudit = await promptConfirm(
      `Run your first ${candidate.adapter.productName} audit now?`,
      true,
    );
    if (!shouldAudit) {
      process.stderr.write(
        `Skipped the first audit. Run ${formatCommand(['audit', '--runtime', candidate.adapter.runtime])} when you're ready.\n`,
      );
      return null;
    }

    return candidate.adapter.runtime;
  }

  return promptSelect<AgentRuntime>('Choose the local runtime to audit first.', [
    ...candidates.map((candidate) => ({
      name: candidate.adapter.productName,
      value: candidate.adapter.runtime,
      description: describeSources(candidate),
    })),
  ]);
}

function describeCandidate(candidate: RuntimeCandidate): string {
  return `Found local ${candidate.adapter.productName} data (${describeSources(candidate)}).`;
}

function describeSources(candidate: RuntimeCandidate): string {
  const kinds = new Set(candidate.sources.map((source) => source.kind));
  const details = [
    kinds.has('gateway') ? 'gateway logs' : null,
    kinds.has('sessions') ? 'session transcripts' : null,
  ].filter((detail): detail is string => detail !== null);

  return details.join(' and ');
}

function renderNoDataGuidance() {
  const openclawDefaults = getRuntimeAdapter('openclaw').defaultPaths();
  const hermesDefaults = getRuntimeAdapter('hermes').defaultPaths();

  process.stderr.write(
    `${[
      'No local OpenClaw or Hermes data was detected in the default locations Xerg checked.',
      '',
      'Checked defaults:',
      `- OpenClaw gateway logs: ${openclawDefaults.gatewayPattern}`,
      `- OpenClaw session transcripts: ${openclawDefaults.sessionsPattern}`,
      `- Hermes gateway logs: ${hermesDefaults.gatewayPattern}`,
      `- Hermes session transcripts: ${hermesDefaults.sessionsPattern}`,
      '',
      'Next steps:',
      `- Local OpenClaw paths: ${formatCommand('audit --runtime openclaw --log-file /path/to/openclaw.log')} or ${formatCommand('audit --runtime openclaw --sessions-dir /path/to/sessions')}`,
      `- Local Hermes paths: ${formatCommand('audit --runtime hermes --log-file ~/.hermes/logs/agent.log')} or ${formatCommand('audit --runtime hermes --sessions-dir ~/.hermes/sessions')}`,
      `- Remote OpenClaw only: ${formatCommand('audit --remote user@host')}`,
      `- Railway OpenClaw only: ${formatCommand('audit --railway')}`,
    ].join('\n')}\n`,
  );
}
