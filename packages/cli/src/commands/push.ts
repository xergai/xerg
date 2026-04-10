import { readFileSync } from 'node:fs';
import type { AuditPushPayload } from '@xerg/schemas';
import { getDefaultDbPath, listStoredAuditSummaries, toWirePayload } from '@xergai/core';
import type { WirePayloadMeta } from '@xergai/core';

import { formatCommand } from '../command-display.js';
import { NoDataError } from '../errors.js';
import { loadPushConfig, pushAudit } from '../push/index.js';
import { buildCachedPushSourceMeta } from '../source-meta.js';
import { getCliVersion } from '../version.js';

export interface PushCommandOptions {
  file?: string;
  dryRun?: boolean;
}

export async function runPushCommand(options: PushCommandOptions) {
  const payload = options.file ? loadPayloadFromFile(options.file) : loadPayloadFromCache();

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const config = loadPushConfig();
  const auditId = payload.summary.auditId;
  process.stderr.write(`Pushing audit ${auditId} to ${config.apiUrl}...\n`);

  const result = await pushAudit(payload, config);

  if (result.ok) {
    process.stderr.write(`Pushed successfully (audit: ${result.auditId}).\n`);
  } else {
    const statusInfo = result.status > 0 ? ` (HTTP ${result.status})` : '';
    throw new Error(`Push failed${statusInfo}: ${result.message}`);
  }
}

function loadPayloadFromFile(filePath: string): AuditPushPayload {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(`Cannot read file: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`File is not valid JSON: ${filePath}`);
  }

  const payload = parsed as AuditPushPayload;
  if (!payload.version || !payload.summary || !payload.meta) {
    throw new Error(
      `File does not look like an AuditPushPayload (missing version, summary, or meta): ${filePath}`,
    );
  }

  return payload;
}

function loadPayloadFromCache(): AuditPushPayload {
  const dbPath = getDefaultDbPath();
  let summaries: ReturnType<typeof listStoredAuditSummaries>;

  try {
    summaries = listStoredAuditSummaries(dbPath);
  } catch {
    throw new NoDataError(
      `No local audit database found. Run \`${formatCommand('audit')}\` first, or use \`${formatCommand('push --file <path>')}\`.`,
    );
  }

  if (summaries.length === 0) {
    throw new NoDataError(
      `No cached audit snapshots found. Run \`${formatCommand('audit')}\` first, or use \`${formatCommand('push --file <path>')}\`.`,
    );
  }

  const latest = summaries[0];
  const meta = buildMeta(latest);

  process.stderr.write(
    `Using most recent cached audit: ${latest.auditId} (${latest.generatedAt})\n`,
  );

  return toWirePayload(latest, meta);
}

function buildMeta(summary: Parameters<typeof buildCachedPushSourceMeta>[0]): WirePayloadMeta {
  const sourceMeta = buildCachedPushSourceMeta(summary);
  return {
    cliVersion: getCliVersion(),
    sourceId: sourceMeta.sourceId,
    sourceHost: sourceMeta.sourceHost,
    environment: sourceMeta.environment,
  };
}
