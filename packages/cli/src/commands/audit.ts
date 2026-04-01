import { readFileSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { hostname } from 'node:os';
import {
  auditOpenClaw,
  buildRecommendations,
  renderMarkdownSummary,
  renderTerminalSummary,
  toWirePayload,
} from '@xergai/core';
import type { AuditSummary, WirePayloadMeta } from '@xergai/core';

import { NoDataError } from '../errors.js';
import { createCliLogger } from '../log.js';
import { loadPushConfig, pushAudit } from '../push/index.js';
import {
  buildComparisonKeyForRailway,
  buildComparisonKeyForRemote,
  buildRailwaySourceFromFlags,
  buildSourceFromFlags,
  loadRemoteConfig,
  pullRemoteFiles,
  pullRemoteFilesRailway,
} from '../transport/index.js';
import type { PullResult, RailwayTarget, RemoteSource } from '../transport/index.js';

export interface AuditCommandOptions {
  logFile?: string;
  sessionsDir?: string;
  since?: string;
  compare?: boolean;
  json?: boolean;
  markdown?: boolean;
  db?: string;
  noDb?: boolean;
  remote?: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
  remoteConfig?: string;
  keepRemoteFiles?: boolean;
  railway?: boolean;
  railwayProject?: string;
  railwayEnvironment?: string;
  railwayService?: string;
  push?: boolean;
  dryRun?: boolean;
  failAboveWasteRate?: number;
  failAboveWasteUsd?: number;
  verbose?: boolean;
}

const NO_DATA_PATTERN = /no openclaw sources were detected/i;

async function auditOrNoData(
  ...args: Parameters<typeof auditOpenClaw>
): ReturnType<typeof auditOpenClaw> {
  try {
    return await auditOpenClaw(...args);
  } catch (err) {
    if (err instanceof Error && NO_DATA_PATTERN.test(err.message)) {
      throw new NoDataError(err.message);
    }
    throw err;
  }
}

export async function runAuditCommand(options: AuditCommandOptions) {
  const logger = createCliLogger({ verbose: options.verbose });

  if (options.dryRun && !options.push) {
    throw new Error('--dry-run requires --push.');
  }

  const remoteFlags = [options.remote, options.remoteConfig, options.railway].filter(
    Boolean,
  ).length;
  if (remoteFlags > 1) {
    throw new Error('Use only one of --remote, --remote-config, or --railway.');
  }

  if (!options.remote && !options.remoteConfig && !options.railway) {
    return runLocalAudit(options, logger);
  }

  if (options.railway) {
    const railwayTarget = buildRailwayTarget(options);
    const source = buildRailwaySourceFromFlags({
      railway: railwayTarget,
      remoteLogFile: options.remoteLogFile,
      remoteSessionsDir: options.remoteSessionsDir,
    });
    return runSingleRemoteAudit(source, options, logger);
  }

  if (options.remoteConfig) {
    const sources = loadRemoteConfig(options.remoteConfig);
    if (sources.length === 1) {
      return runSingleRemoteAudit(sources[0], options, logger);
    }
    return runMultiRemoteAudit(sources, options, logger);
  }

  const remote = options.remote as string;
  const source = buildSourceFromFlags({
    remote,
    remoteLogFile: options.remoteLogFile,
    remoteSessionsDir: options.remoteSessionsDir,
  });
  return runSingleRemoteAudit(source, options, logger);
}

function buildRailwayTarget(options: AuditCommandOptions): RailwayTarget | undefined {
  if (options.railwayProject && options.railwayEnvironment && options.railwayService) {
    return {
      projectId: options.railwayProject,
      environmentId: options.railwayEnvironment,
      serviceId: options.railwayService,
    };
  }
  return undefined;
}

async function runLocalAudit(
  options: AuditCommandOptions,
  logger: ReturnType<typeof createCliLogger>,
) {
  logger.verbose('Running a local audit.');
  if (options.logFile) {
    logger.verbose(`Using explicit local log file: ${options.logFile}`);
  }
  if (options.sessionsDir) {
    logger.verbose(`Using explicit local sessions directory: ${options.sessionsDir}`);
  }

  const summary = await auditOrNoData({
    logFile: options.logFile,
    sessionsDir: options.sessionsDir,
    since: options.since,
    compare: options.compare,
    dbPath: options.db,
    noDb: options.noDb,
    onProgress: logger.verbose,
  });

  renderOutput(summary, options);

  if (options.push) {
    const meta = buildMeta({ environment: 'local', sourceId: hostname(), sourceHost: hostname() });
    await handlePush(summary, meta, options);
  }

  checkThresholds(summary, options);
}

function getComparisonKey(source: RemoteSource): string {
  if (source.transport === 'railway') {
    return buildComparisonKeyForRailway(source);
  }
  return buildComparisonKeyForRemote(source);
}

function pullFiles(
  source: RemoteSource,
  since?: string,
  keepFiles?: boolean,
  onProgress?: (message: string) => void,
): Promise<PullResult> {
  if (source.transport === 'railway') {
    return pullRemoteFilesRailway({ source, since, keepFiles, onProgress });
  }
  return pullRemoteFiles({ source, since, keepFiles, onProgress });
}

function describeSource(source: RemoteSource): string {
  if (source.transport === 'railway') {
    return source.railway
      ? `${source.name} (Railway service ${source.railway.serviceId.slice(0, 8)})`
      : `${source.name} (Railway linked project)`;
  }
  return source.host;
}

function sourceEnvironment(source: RemoteSource): WirePayloadMeta['environment'] {
  return source.transport === 'railway' ? 'railway' : 'remote';
}

async function runSingleRemoteAudit(
  source: RemoteSource,
  options: AuditCommandOptions,
  logger: ReturnType<typeof createCliLogger>,
) {
  logger.info(`Pulling files from ${describeSource(source)}...`);

  const pullResult = await pullFiles(
    source,
    options.since,
    options.keepRemoteFiles,
    logger.verbose,
  );
  logger.verbose(`Files staged at ${pullResult.localPath}.`);

  try {
    const comparisonKeyOverride = getComparisonKey(source);
    const summary = await auditOrNoData({
      logFile: pullResult.logFile,
      sessionsDir: pullResult.sessionsDir,
      since: options.since,
      compare: options.compare,
      dbPath: options.db,
      noDb: options.noDb,
      comparisonKeyOverride,
      onProgress: logger.verbose,
    });

    renderOutput(summary, options);

    if (options.push) {
      const meta = buildMeta({
        environment: sourceEnvironment(source),
        sourceId: source.name,
        sourceHost: source.host,
      });
      await handlePush(summary, meta, options);
    }

    checkThresholds(summary, options);
  } finally {
    cleanupPullResult(pullResult, options.keepRemoteFiles);
  }
}

async function runMultiRemoteAudit(
  sources: RemoteSource[],
  options: AuditCommandOptions,
  logger: ReturnType<typeof createCliLogger>,
) {
  const results: { source: RemoteSource; pullResult: PullResult }[] = [];
  const errors: { source: RemoteSource; error: string }[] = [];

  for (const source of sources) {
    logger.info(`Pulling files from ${source.name} (${describeSource(source)})...`);
    try {
      const pullResult = await pullFiles(
        source,
        options.since,
        options.keepRemoteFiles,
        logger.verbose,
      );
      results.push({ source, pullResult });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ source, error: message });
      process.stderr.write(`  Warning: ${message}\n`);
    }
  }

  if (results.length === 0) {
    const errorMessages = errors.map((e) => `  ${e.source.name}: ${e.error}`).join('\n');
    throw new Error(`No sources could be pulled:\n${errorMessages}`);
  }

  try {
    const summaries: { name: string; source: RemoteSource; summary: AuditSummary }[] = [];
    for (const { source, pullResult } of results) {
      const comparisonKeyOverride = getComparisonKey(source);
      const summary = await auditOrNoData({
        logFile: pullResult.logFile,
        sessionsDir: pullResult.sessionsDir,
        since: options.since,
        compare: options.compare,
        dbPath: options.db,
        noDb: options.noDb,
        comparisonKeyOverride,
        onProgress: logger.verbose,
      });
      summaries.push({ name: source.name, source, summary });
    }

    if (options.json) {
      const output =
        summaries.length === 1
          ? { ...summaries[0].summary, recommendations: buildRecommendations(summaries[0].summary) }
          : {
              sources: summaries.map((s) => ({
                name: s.name,
                ...s.summary,
                recommendations: buildRecommendations(s.summary),
              })),
            };
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      for (const { name, summary } of summaries) {
        if (summaries.length > 1) {
          process.stdout.write(`\n${'═'.repeat(60)}\n  Source: ${name}\n${'═'.repeat(60)}\n\n`);
        }

        if (options.markdown) {
          process.stdout.write(`${renderMarkdownSummary(summary)}\n`);
        } else {
          process.stdout.write(`${renderTerminalSummary(summary)}\n`);
        }
      }
    }

    if (errors.length > 0) {
      process.stderr.write('\nSources that could not be reached:\n');
      for (const { source, error } of errors) {
        process.stderr.write(`  ${source.name}: ${error}\n`);
      }
    }

    if (options.push) {
      for (const { source, summary } of summaries) {
        const meta = buildMeta({
          environment: sourceEnvironment(source),
          sourceId: source.name,
          sourceHost: source.host,
        });
        await handlePush(summary, meta, options);
      }
    }

    for (const { summary } of summaries) {
      checkThresholds(summary, options);
    }
  } finally {
    for (const { pullResult } of results) {
      cleanupPullResult(pullResult, options.keepRemoteFiles);
    }
  }
}

function readCliVersion(): string {
  try {
    const packageJsonPath = new URL('../../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function buildMeta(input: {
  environment: WirePayloadMeta['environment'];
  sourceId: string;
  sourceHost: string;
}): WirePayloadMeta {
  return {
    cliVersion: readCliVersion(),
    sourceId: input.sourceId,
    sourceHost: input.sourceHost,
    environment: input.environment,
  };
}

async function handlePush(
  summary: AuditSummary,
  meta: WirePayloadMeta,
  options: AuditCommandOptions,
) {
  const payload = toWirePayload(summary, meta);

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const config = loadPushConfig();
  process.stderr.write(`Pushing audit ${summary.auditId} to ${config.apiUrl}...\n`);

  const result = await pushAudit(payload, config);

  if (result.ok) {
    process.stderr.write(`Pushed successfully (audit: ${result.auditId}).\n`);
  } else {
    const statusInfo = result.status > 0 ? ` (HTTP ${result.status})` : '';
    throw new Error(`Push failed${statusInfo}: ${result.message}`);
  }
}

function renderOutput(summary: AuditSummary, options: AuditCommandOptions) {
  if (options.push && options.dryRun) {
    return;
  }

  if (options.json) {
    const recommendations = buildRecommendations(summary);
    const output = { ...summary, recommendations };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  if (options.markdown) {
    process.stdout.write(`${renderMarkdownSummary(summary)}\n`);
    return;
  }

  process.stdout.write(`${renderTerminalSummary(summary)}\n`);
}

function checkThresholds(summary: AuditSummary, options: AuditCommandOptions) {
  const breaches: string[] = [];

  if (
    options.failAboveWasteRate !== undefined &&
    summary.structuralWasteRate > options.failAboveWasteRate
  ) {
    breaches.push(
      `Structural waste rate ${(summary.structuralWasteRate * 100).toFixed(1)}% exceeds threshold ${(options.failAboveWasteRate * 100).toFixed(1)}%`,
    );
  }

  if (
    options.failAboveWasteUsd !== undefined &&
    summary.wasteSpendUsd > options.failAboveWasteUsd
  ) {
    breaches.push(
      `Waste spend $${summary.wasteSpendUsd.toFixed(2)} exceeds threshold $${options.failAboveWasteUsd.toFixed(2)}`,
    );
  }

  if (breaches.length > 0) {
    process.stderr.write(`\nThreshold exceeded:\n${breaches.map((b) => `  ${b}`).join('\n')}\n`);
    process.exitCode = 3;
  }
}

function cleanupPullResult(pullResult: PullResult, keepFiles?: boolean) {
  if (keepFiles) return;
  try {
    rmSync(pullResult.localPath, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
