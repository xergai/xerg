import { toWirePayload } from '@xergai/core';
import type { AuditSummary, WirePayloadMeta } from '@xergai/core';

import {
  authenticateAndLoadPushConfig,
  loadPushConfigOrNull,
  renderCloudDisclaimer,
} from '../cloud.js';
import { formatCommand } from '../command-display.js';
import { NoDataError } from '../errors.js';
import { hasPromptTty, promptConfirm } from '../prompts.js';
import { loadPushConfig, pushAudit } from '../push/index.js';
import { buildLocalPushSourceMeta } from '../source-meta.js';
import { getCliVersion } from '../version.js';
import { loadLatestCachedAuditPayload } from './push.js';

export async function runConnectCommand() {
  await runConnectFlow();
}

export async function runConnectFlow(options?: {
  skipDisclaimer?: boolean;
  auditSummary?: AuditSummary;
}): Promise<boolean> {
  if (!options?.skipDisclaimer) {
    process.stderr.write(`${renderCloudDisclaimer()}\n`);
  }

  let config = loadPushConfigOrNull();
  if (config) {
    process.stderr.write('Xerg authentication detected.\n');
  } else {
    if (!hasPromptTty()) {
      process.stderr.write(
        `No Xerg authentication is configured, and ${formatCommand('connect')} needs an interactive terminal before it can start browser login.\nRun ${formatCommand('login')} from a TTY, or keep using local audits for free.\n`,
      );
      process.exitCode = 1;
      return false;
    }

    const shouldLogin = await promptConfirm('Sign in to Xerg Cloud now?', true);
    if (!shouldLogin) {
      process.stderr.write(
        'Skipped Xerg Cloud setup. You can keep using local audits and compare without connecting.\n',
      );
      return false;
    }

    config = await authenticateAndLoadPushConfig();
  }

  if (!hasPromptTty()) {
    if (!options?.auditSummary) {
      process.stderr.write(
        `Non-interactive mode skips the push prompt. Run ${formatCommand('push')} when you want to sync a cached audit.\n`,
      );
    } else {
      process.stderr.write(
        `Authentication is ready. Run ${formatCommand('push')} later if you want to sync this audit.\n`,
      );
    }
    return true;
  }

  const shouldPush = await promptConfirm(
    options?.auditSummary
      ? 'Push this audit to Xerg Cloud?'
      : 'Push your latest cached audit to Xerg Cloud?',
    true,
  );

  if (!shouldPush) {
    process.stderr.write(
      options?.auditSummary
        ? `Skipped push. Run ${formatCommand('push')} later if you want to sync a cached audit.\n`
        : `Skipped push. Run ${formatCommand('push')} when you want to sync a cached audit.\n`,
    );
    return true;
  }

  const payload = options?.auditSummary
    ? toWirePayload(options.auditSummary, buildLocalMeta(options.auditSummary))
    : loadStandalonePayload();

  if (!payload) {
    return true;
  }

  await pushResolvedPayload(payload, config ?? loadPushConfig());
  return true;
}

function buildLocalMeta(summary: AuditSummary): WirePayloadMeta {
  const sourceMeta = buildLocalPushSourceMeta(summary.runtime);
  return {
    cliVersion: getCliVersion(),
    sourceId: sourceMeta.sourceId,
    sourceHost: sourceMeta.sourceHost,
    environment: sourceMeta.environment,
  };
}

function loadStandalonePayload() {
  try {
    return loadLatestCachedAuditPayload();
  } catch (error) {
    if (error instanceof NoDataError || (error instanceof Error && error.name === 'NoDataError')) {
      process.stderr.write(
        `${error instanceof Error ? error.message : 'No cached audit snapshots found.'}\n`,
      );
      return null;
    }
    throw error;
  }
}

async function pushResolvedPayload(
  payload: Parameters<typeof pushAudit>[0],
  config: Parameters<typeof pushAudit>[1],
) {
  process.stderr.write(`Pushing audit ${payload.summary.auditId} to ${config.apiUrl}...\n`);
  const result = await pushAudit(payload, config);

  if (result.ok) {
    process.stderr.write(`Pushed successfully (audit: ${result.auditId}).\n`);
    return;
  }

  const statusInfo = result.status > 0 ? ` (HTTP ${result.status})` : '';
  throw new Error(`Push failed${statusInfo}: ${result.message}`);
}
