import { doctorOpenClaw, renderDoctorReport } from '@xergai/core';

import { createCliLogger } from '../log.js';
import {
  buildRailwaySourceFromFlags,
  buildSourceFromFlags,
  runRailwayDoctor,
  runRemoteDoctor,
} from '../transport/index.js';
import type { RailwayDoctorReport, RailwayTarget, RemoteDoctorReport } from '../transport/index.js';

export interface DoctorCommandOptions {
  logFile?: string;
  sessionsDir?: string;
  remote?: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
  railway?: boolean;
  railwayProject?: string;
  railwayEnvironment?: string;
  railwayService?: string;
  verbose?: boolean;
}

export async function runDoctorCommand(options: DoctorCommandOptions) {
  const logger = createCliLogger({ verbose: options.verbose });

  if (options.railway) {
    logger.verbose('Inspecting Railway audit readiness.');
    const railwayTarget = buildRailwayTarget(options);
    const source = buildRailwaySourceFromFlags({
      railway: railwayTarget,
      remoteLogFile: options.remoteLogFile,
      remoteSessionsDir: options.remoteSessionsDir,
    });

    const report = await runRailwayDoctor({ source, onProgress: logger.verbose });
    process.stdout.write(`${renderRailwayDoctorReport(report)}\n`);
    return;
  }

  if (options.remote) {
    logger.verbose(`Inspecting SSH audit readiness for ${options.remote}.`);
    const source = buildSourceFromFlags({
      remote: options.remote,
      remoteLogFile: options.remoteLogFile,
      remoteSessionsDir: options.remoteSessionsDir,
    });

    const report = await runRemoteDoctor({ source, onProgress: logger.verbose });
    process.stdout.write(`${renderRemoteDoctorReport(report)}\n`);
    return;
  }

  logger.verbose('Inspecting local OpenClaw audit readiness.');
  if (options.logFile) {
    logger.verbose(`Using explicit local log file: ${options.logFile}`);
  }
  if (options.sessionsDir) {
    logger.verbose(`Using explicit local sessions directory: ${options.sessionsDir}`);
  }

  const report = await doctorOpenClaw({
    logFile: options.logFile,
    sessionsDir: options.sessionsDir,
    onProgress: logger.verbose,
  });

  process.stdout.write(`${renderDoctorReport(report)}\n`);
}

function buildRailwayTarget(options: DoctorCommandOptions): RailwayTarget | undefined {
  if (options.railwayProject && options.railwayEnvironment && options.railwayService) {
    return {
      projectId: options.railwayProject,
      environmentId: options.railwayEnvironment,
      serviceId: options.railwayService,
    };
  }
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function renderRemoteDoctorReport(report: RemoteDoctorReport): string {
  const sections = [
    '# Xerg doctor [remote]',
    '',
    `Host: ${report.host}`,
    `SSH connectivity: ${report.sshConnectivity ? 'OK' : 'FAILED'}`,
  ];

  if (!report.sshConnectivity) {
    sections.push('', ...report.notes.map((n) => `[remote] ${n}`));
    return sections.join('\n');
  }

  sections.push(
    `rsync (local): ${report.rsyncAvailableLocal ? 'available' : 'not found'}`,
    `rsync (remote): ${report.rsyncAvailableRemote ? 'available' : 'not found'}`,
    '',
    '## Default paths',
    `[remote] Gateway (${report.defaultPaths.gatewayPath}): ${
      report.defaultPaths.gatewayExists
        ? `${report.defaultPaths.gatewayFileCount} files, ${formatBytes(report.defaultPaths.gatewayTotalBytes)}`
        : 'not found'
    }`,
    `[remote] Sessions (${report.defaultPaths.sessionsPath}): ${
      report.defaultPaths.sessionsExists
        ? `${report.defaultPaths.sessionsFileCount} files, ${formatBytes(report.defaultPaths.sessionsTotalBytes)}`
        : 'not found'
    }`,
  );

  if (report.customPaths) {
    sections.push('', '## Custom paths');
    if (report.customPaths.logFilePath) {
      sections.push(
        `[remote] Log file (${report.customPaths.logFilePath}): ${
          report.customPaths.logFileExists
            ? formatBytes(report.customPaths.logFileBytes)
            : 'not found'
        }`,
      );
    }
    if (report.customPaths.sessionsDirPath) {
      sections.push(
        `[remote] Sessions dir (${report.customPaths.sessionsDirPath}): ${
          report.customPaths.sessionsDirExists
            ? `${report.customPaths.sessionsFileCount} files, ${formatBytes(report.customPaths.sessionsTotalBytes)}`
            : 'not found'
        }`,
      );
    }
  }

  sections.push('', '## Notes', ...report.notes.map((n) => `[remote] ${n}`));

  return sections.join('\n');
}

function renderRailwayDoctorReport(report: RailwayDoctorReport): string {
  const sections = [
    '# Xerg doctor [railway]',
    '',
    `Source: ${report.name}`,
    `Railway CLI: ${report.railwayCliInstalled ? 'installed' : 'NOT INSTALLED'}`,
  ];

  if (!report.railwayCliInstalled) {
    sections.push('', ...report.notes.map((n) => `[railway] ${n}`));
    return sections.join('\n');
  }

  sections.push(`Authentication: ${report.railwayAuthenticated ? 'OK' : 'NOT AUTHENTICATED'}`);

  if (!report.railwayAuthenticated) {
    sections.push('', ...report.notes.map((n) => `[railway] ${n}`));
    return sections.join('\n');
  }

  if (report.railwayAuthUser) {
    sections.push(`User: ${report.railwayAuthUser}`);
  }

  sections.push(`Service reachable: ${report.serviceReachable ? 'OK' : 'FAILED'}`);

  if (!report.serviceReachable) {
    if (report.serviceError) {
      sections.push(`Error: ${report.serviceError}`);
    }
    sections.push('', ...report.notes.map((n) => `[railway] ${n}`));
    return sections.join('\n');
  }

  sections.push(
    '',
    '## Default paths',
    `[railway] Gateway (${report.defaultPaths.gatewayPath}): ${
      report.defaultPaths.gatewayExists
        ? `${report.defaultPaths.gatewayFileCount} files, ${formatBytes(report.defaultPaths.gatewayTotalBytes)}`
        : 'not found'
    }`,
    `[railway] Sessions (${report.defaultPaths.sessionsPath}): ${
      report.defaultPaths.sessionsExists
        ? `${report.defaultPaths.sessionsFileCount} files, ${formatBytes(report.defaultPaths.sessionsTotalBytes)}`
        : 'not found'
    }`,
  );

  if (report.alternateSessionPaths.length > 0) {
    sections.push('', '## Alternate session paths');
    for (const alt of report.alternateSessionPaths) {
      sections.push(
        `[railway] ${alt.path}: ${
          alt.exists ? `${alt.fileCount} files, ${formatBytes(alt.totalBytes)}` : 'not found'
        }`,
      );
    }
  }

  if (report.customPaths) {
    sections.push('', '## Custom paths');
    if (report.customPaths.logFilePath) {
      sections.push(
        `[railway] Log file (${report.customPaths.logFilePath}): ${
          report.customPaths.logFileExists
            ? formatBytes(report.customPaths.logFileBytes)
            : 'not found'
        }`,
      );
    }
    if (report.customPaths.sessionsDirPath) {
      sections.push(
        `[railway] Sessions dir (${report.customPaths.sessionsDirPath}): ${
          report.customPaths.sessionsDirExists
            ? `${report.customPaths.sessionsFileCount} files, ${formatBytes(report.customPaths.sessionsTotalBytes)}`
            : 'not found'
        }`,
      );
    }
  }

  sections.push('', '## Notes', ...report.notes.map((n) => `[railway] ${n}`));

  return sections.join('\n');
}
