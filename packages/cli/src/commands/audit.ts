import { rmSync } from 'node:fs';
import { auditOpenClaw, renderMarkdownSummary, renderTerminalSummary } from '@xergai/core';

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
}

export async function runAuditCommand(options: AuditCommandOptions) {
  const remoteFlags = [options.remote, options.remoteConfig, options.railway].filter(
    Boolean,
  ).length;
  if (remoteFlags > 1) {
    throw new Error('Use only one of --remote, --remote-config, or --railway.');
  }

  if (!options.remote && !options.remoteConfig && !options.railway) {
    return runLocalAudit(options);
  }

  if (options.railway) {
    const railwayTarget = buildRailwayTarget(options);
    const source = buildRailwaySourceFromFlags({
      railway: railwayTarget,
      remoteLogFile: options.remoteLogFile,
      remoteSessionsDir: options.remoteSessionsDir,
    });
    return runSingleRemoteAudit(source, options);
  }

  if (options.remoteConfig) {
    const sources = loadRemoteConfig(options.remoteConfig);
    if (sources.length === 1) {
      return runSingleRemoteAudit(sources[0], options);
    }
    return runMultiRemoteAudit(sources, options);
  }

  const remote = options.remote as string;
  const source = buildSourceFromFlags({
    remote,
    remoteLogFile: options.remoteLogFile,
    remoteSessionsDir: options.remoteSessionsDir,
  });
  return runSingleRemoteAudit(source, options);
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

async function runLocalAudit(options: AuditCommandOptions) {
  const summary = await auditOpenClaw({
    logFile: options.logFile,
    sessionsDir: options.sessionsDir,
    since: options.since,
    compare: options.compare,
    dbPath: options.db,
    noDb: options.noDb,
  });

  renderOutput(summary, options);
}

function getComparisonKey(source: RemoteSource): string {
  if (source.transport === 'railway') {
    return buildComparisonKeyForRailway(source);
  }
  return buildComparisonKeyForRemote(source);
}

function pullFiles(source: RemoteSource, since?: string, keepFiles?: boolean): Promise<PullResult> {
  if (source.transport === 'railway') {
    return pullRemoteFilesRailway({ source, since, keepFiles });
  }
  return pullRemoteFiles({ source, since, keepFiles });
}

function describeSource(source: RemoteSource): string {
  if (source.transport === 'railway') {
    return source.railway
      ? `${source.name} (Railway service ${source.railway.serviceId.slice(0, 8)})`
      : `${source.name} (Railway linked project)`;
  }
  return source.host;
}

async function runSingleRemoteAudit(source: RemoteSource, options: AuditCommandOptions) {
  process.stderr.write(`Pulling files from ${describeSource(source)}...\n`);

  const pullResult = await pullFiles(source, options.since, options.keepRemoteFiles);

  try {
    const comparisonKeyOverride = getComparisonKey(source);
    const summary = await auditOpenClaw({
      logFile: pullResult.logFile,
      sessionsDir: pullResult.sessionsDir,
      since: options.since,
      compare: options.compare,
      dbPath: options.db,
      noDb: options.noDb,
      comparisonKeyOverride,
    });

    renderOutput(summary, options);
  } finally {
    cleanupPullResult(pullResult, options.keepRemoteFiles);
  }
}

async function runMultiRemoteAudit(sources: RemoteSource[], options: AuditCommandOptions) {
  const results: { source: RemoteSource; pullResult: PullResult }[] = [];
  const errors: { source: RemoteSource; error: string }[] = [];

  for (const source of sources) {
    process.stderr.write(`Pulling files from ${source.name} (${describeSource(source)})...\n`);
    try {
      const pullResult = await pullFiles(source, options.since, options.keepRemoteFiles);
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
    const summaries = [];
    for (const { source, pullResult } of results) {
      const comparisonKeyOverride = getComparisonKey(source);
      const summary = await auditOpenClaw({
        logFile: pullResult.logFile,
        sessionsDir: pullResult.sessionsDir,
        since: options.since,
        compare: options.compare,
        dbPath: options.db,
        noDb: options.noDb,
        comparisonKeyOverride,
      });
      summaries.push({ name: source.name, summary });
    }

    if (options.json) {
      const output =
        summaries.length === 1
          ? summaries[0].summary
          : { sources: summaries.map((s) => ({ name: s.name, ...s.summary })) };
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      return;
    }

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

    if (errors.length > 0) {
      process.stderr.write('\nSources that could not be reached:\n');
      for (const { source, error } of errors) {
        process.stderr.write(`  ${source.name}: ${error}\n`);
      }
    }
  } finally {
    for (const { pullResult } of results) {
      cleanupPullResult(pullResult, options.keepRemoteFiles);
    }
  }
}

function renderOutput(
  summary: Awaited<ReturnType<typeof auditOpenClaw>>,
  options: AuditCommandOptions,
) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  if (options.markdown) {
    process.stdout.write(`${renderMarkdownSummary(summary)}\n`);
    return;
  }

  process.stdout.write(`${renderTerminalSummary(summary)}\n`);
}

function cleanupPullResult(pullResult: PullResult, keepFiles?: boolean) {
  if (keepFiles) return;
  try {
    rmSync(pullResult.localPath, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
