import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PullResult, RailwayDoctorReport, RailwayTarget, RemoteSource } from './types.js';

const DEFAULT_GATEWAY_DIR = '/tmp/openclaw';
const DEFAULT_SESSIONS_DIR = '~/.openclaw/agents';

const ALTERNATE_SESSION_PATHS = ['/data/.clawdbot/agents/main/sessions'];

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function railwaySshArgs(target?: RailwayTarget): string[] {
  const args = ['ssh'];
  if (target) {
    args.push(`--project=${target.projectId}`);
    args.push(`--environment=${target.environmentId}`);
    args.push(`--service=${target.serviceId}`);
  }
  return args;
}

function railwayExec(command: string, target?: RailwayTarget): { stdout: string; status: number } {
  const args = [...railwaySshArgs(target), command];
  const result = spawnSync('railway', args, { stdio: 'pipe', timeout: 30_000 });
  return {
    stdout: result.stdout?.toString().trim() ?? '',
    status: result.status ?? 1,
  };
}

function buildSinceFind(since: string | undefined): string {
  if (!since) return '';

  const match = since
    .trim()
    .toLowerCase()
    .match(/^(\d+)([mhdw])$/);
  if (!match) return '';

  const value = Number(match[1]);
  const unit = match[2];

  let minutes: number;
  switch (unit) {
    case 'm':
      minutes = value;
      break;
    case 'h':
      minutes = value * 60;
      break;
    case 'd':
      minutes = value * 60 * 24;
      break;
    case 'w':
      minutes = value * 60 * 24 * 7;
      break;
    default:
      return '';
  }

  return `-mmin -${minutes}`;
}

function tarRailwayPull(opts: {
  target?: RailwayTarget;
  remotePath: string;
  localDir: string;
  since?: string;
}): boolean {
  mkdirSync(opts.localDir, { recursive: true });

  // Railway SSH allocates a PTY that corrupts binary data (LF → CRLF).
  // Base64-encoding the tar stream on the remote side avoids this.
  let tarCmd: string;
  if (opts.since) {
    const findArgs = buildSinceFind(opts.since);
    if (findArgs) {
      tarCmd = `find ${opts.remotePath} -type f ${findArgs} -print0 2>/dev/null | tar -czf - --null -T - 2>/dev/null | base64`;
    } else {
      tarCmd = `tar -czf - -C ${opts.remotePath} . 2>/dev/null | base64`;
    }
  } else {
    tarCmd = `tar -czf - -C ${opts.remotePath} . 2>/dev/null | base64`;
  }

  const sshArgs = railwaySshArgs(opts.target).join(' ');
  const fullCmd = `railway ${sshArgs} '${tarCmd}' | base64 -d | tar -xzf - -C ${opts.localDir}`;

  try {
    execSync(fullCmd, { stdio: 'pipe', timeout: 120_000 });
    return true;
  } catch {
    return false;
  }
}

function resolveLocalPath(source: RemoteSource, keepFiles: boolean): string {
  if (keepFiles) {
    const cacheDir = join(homedir(), '.xerg', 'remote-cache', source.name);
    mkdirSync(cacheDir, { recursive: true });
    return cacheDir;
  }

  const identity = source.railway
    ? `railway:${source.railway.projectId}:${Date.now()}`
    : `${source.name}:${Date.now()}`;
  const hash = hashString(identity);
  const tmpPath = join(tmpdir(), `xerg-remote-${hash}`);
  mkdirSync(tmpPath, { recursive: true });
  return tmpPath;
}

function checkRemotePath(remotePath: string, target?: RailwayTarget) {
  const { status: exists } = railwayExec(`test -e ${remotePath} && echo exists`, target);
  if (exists !== 0) {
    return { exists: false, path: remotePath, fileCount: 0, totalBytes: 0 };
  }
  const { stdout: countOut } = railwayExec(
    `find ${remotePath} -type f 2>/dev/null | wc -l`,
    target,
  );
  const { stdout: sizeOut } = railwayExec(`du -sb ${remotePath} 2>/dev/null | cut -f1`, target);
  return {
    exists: true,
    path: remotePath,
    fileCount: Number.parseInt(countOut, 10) || 0,
    totalBytes: Number.parseInt(sizeOut, 10) || 0,
  };
}

function findSessionsPath(target?: RailwayTarget, customPath?: string): string | null {
  if (customPath) {
    const check = checkRemotePath(customPath, target);
    return check.exists ? customPath : null;
  }

  const { stdout: expandedDefault } = railwayExec(`eval echo ${DEFAULT_SESSIONS_DIR}`, target);
  const defaultPath = expandedDefault || DEFAULT_SESSIONS_DIR;
  const defaultCheck = checkRemotePath(defaultPath, target);
  if (defaultCheck.exists && defaultCheck.fileCount > 0) {
    return defaultPath;
  }

  for (const altPath of ALTERNATE_SESSION_PATHS) {
    const check = checkRemotePath(altPath, target);
    if (check.exists && check.fileCount > 0) {
      return altPath;
    }
  }

  return null;
}

export function buildRailwaySourceFromFlags(opts: {
  railway?: RailwayTarget;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
}): RemoteSource {
  const name = opts.railway ? `railway-${opts.railway.serviceId.slice(0, 8)}` : 'railway-linked';
  return {
    name,
    transport: 'railway',
    host: name,
    logFile: opts.remoteLogFile,
    sessionsDir: opts.remoteSessionsDir,
    railway: opts.railway,
  };
}

export function buildComparisonKeyForRailway(source: RemoteSource): string {
  const logPath = source.logFile ?? DEFAULT_GATEWAY_DIR;
  const sessPath = source.sessionsDir ?? DEFAULT_SESSIONS_DIR;
  if (source.railway) {
    return `railway:${source.railway.projectId}:${source.railway.environmentId}:${source.railway.serviceId}:${logPath}:${sessPath}`;
  }
  return `railway-linked:${logPath}:${sessPath}`;
}

export async function pullRemoteFilesRailway(opts: {
  source: RemoteSource;
  since?: string;
  keepFiles?: boolean;
}): Promise<PullResult> {
  const { source, since, keepFiles = false } = opts;
  const target = source.railway;

  const { status } = railwayExec('echo ok', target);
  if (status !== 0) {
    throw new Error(
      `Cannot reach Railway service${target ? ` (project: ${target.projectId})` : ' (linked project)'}. Check railway CLI auth and service configuration.`,
    );
  }

  const localBase = resolveLocalPath(source, keepFiles);
  const gatewayDir = join(localBase, 'gateway');
  const sessionsDir = join(localBase, 'sessions');

  const remoteLogPath = source.logFile ?? DEFAULT_GATEWAY_DIR;

  const logCheck = checkRemotePath(remoteLogPath, target);
  const resolvedSessionsPath = findSessionsPath(target, source.sessionsDir);

  let pulledLog = false;
  let pulledSessions = false;

  if (logCheck.exists) {
    const { stdout: isFile } = railwayExec(`test -f ${remoteLogPath} && echo file`, target);
    if (isFile === 'file') {
      const parentDir = remoteLogPath.slice(0, remoteLogPath.lastIndexOf('/')) || '/tmp';
      pulledLog = tarRailwayPull({
        target,
        remotePath: parentDir,
        localDir: gatewayDir,
        since,
      });
    } else {
      pulledLog = tarRailwayPull({
        target,
        remotePath: remoteLogPath,
        localDir: gatewayDir,
        since,
      });
    }
  }

  if (resolvedSessionsPath) {
    pulledSessions = tarRailwayPull({
      target,
      remotePath: resolvedSessionsPath,
      localDir: sessionsDir,
      since,
    });
  }

  if (!pulledLog && !pulledSessions) {
    if (keepFiles) {
      rmSync(localBase, { recursive: true, force: true });
    }
    const checkedPaths = [remoteLogPath, DEFAULT_SESSIONS_DIR, ...ALTERNATE_SESSION_PATHS].join(
      ', ',
    );
    throw new Error(
      `No OpenClaw data found on Railway service. Checked: ${checkedPaths}. Use --remote-log-file or --remote-sessions-dir to specify custom paths.`,
    );
  }

  const result: PullResult = {
    localPath: localBase,
    source,
  };

  if (pulledLog) result.logFile = gatewayDir;
  if (pulledSessions) result.sessionsDir = sessionsDir;

  return result;
}

export async function runRailwayDoctor(opts: {
  source: RemoteSource;
}): Promise<RailwayDoctorReport> {
  const { source } = opts;
  const target = source.railway;
  const notes: string[] = [];

  const whichCheck = spawnSync('which', ['railway'], { stdio: 'pipe', timeout: 5_000 });
  const railwayCliInstalled = whichCheck.status === 0;

  if (!railwayCliInstalled) {
    return {
      transport: 'railway',
      name: source.name,
      railwayCliInstalled: false,
      railwayAuthenticated: false,
      serviceReachable: false,
      defaultPaths: emptyDefaultPaths(),
      alternateSessionPaths: [],
      notes: ['Railway CLI is not installed. Install it: npm i -g @railway/cli'],
    };
  }

  const railwayPath = whichCheck.stdout?.toString().trim() ?? 'railway';
  const versionCheck = spawnSync('railway', ['version'], { stdio: 'pipe', timeout: 10_000 });
  const versionStr =
    versionCheck.status === 0 ? versionCheck.stdout?.toString().trim() : railwayPath;
  notes.push(`Railway CLI: installed (${versionStr})`);

  const whoami = spawnSync('railway', ['whoami'], { stdio: 'pipe', timeout: 10_000 });
  const railwayAuthenticated = whoami.status === 0;
  const railwayAuthUser = railwayAuthenticated ? whoami.stdout?.toString().trim() : undefined;

  if (!railwayAuthenticated) {
    return {
      transport: 'railway',
      name: source.name,
      railwayCliInstalled: true,
      railwayAuthenticated: false,
      serviceReachable: false,
      defaultPaths: emptyDefaultPaths(),
      alternateSessionPaths: [],
      notes: [...notes, 'Not authenticated. Run: railway login'],
    };
  }

  notes.push(`Authenticated as: ${railwayAuthUser}`);

  const { status: reachStatus } = railwayExec('echo ok', target);
  const serviceReachable = reachStatus === 0;

  if (!serviceReachable) {
    return {
      transport: 'railway',
      name: source.name,
      railwayCliInstalled: true,
      railwayAuthenticated: true,
      railwayAuthUser,
      serviceReachable: false,
      serviceError: target
        ? `Cannot reach service ${target.serviceId}`
        : 'Cannot reach linked service. Run: railway link',
      defaultPaths: emptyDefaultPaths(),
      alternateSessionPaths: [],
      notes: [
        ...notes,
        target
          ? `Service unreachable (project: ${target.projectId}, service: ${target.serviceId})`
          : 'Service unreachable. Ensure a project is linked with: railway link',
      ],
    };
  }

  notes.push('Service connectivity: OK');

  const gateway = checkRemotePath(DEFAULT_GATEWAY_DIR, target);
  const { stdout: expandedDefault } = railwayExec(`eval echo ${DEFAULT_SESSIONS_DIR}`, target);
  const resolvedDefault = expandedDefault || DEFAULT_SESSIONS_DIR;
  const sessions = checkRemotePath(resolvedDefault, target);

  if (gateway.exists) {
    notes.push(
      `Gateway logs at ${gateway.path}: ${gateway.fileCount} files, ${formatBytes(gateway.totalBytes)}`,
    );
  } else {
    notes.push(`No gateway logs at ${DEFAULT_GATEWAY_DIR}`);
  }

  if (sessions.exists) {
    notes.push(
      `Sessions at ${sessions.path}: ${sessions.fileCount} files, ${formatBytes(sessions.totalBytes)}`,
    );
  } else {
    notes.push(`No sessions at ${resolvedDefault}`);
  }

  const alternateSessionPaths = ALTERNATE_SESSION_PATHS.map((altPath) => {
    const check = checkRemotePath(altPath, target);
    if (check.exists) {
      notes.push(
        `Alternate sessions at ${altPath}: ${check.fileCount} files, ${formatBytes(check.totalBytes)}`,
      );
    } else {
      notes.push(`No alternate sessions at ${altPath}`);
    }
    return {
      path: altPath,
      exists: check.exists,
      fileCount: check.fileCount,
      totalBytes: check.totalBytes,
    };
  });

  const report: RailwayDoctorReport = {
    transport: 'railway',
    name: source.name,
    railwayCliInstalled: true,
    railwayAuthenticated: true,
    railwayAuthUser,
    serviceReachable: true,
    defaultPaths: {
      gatewayExists: gateway.exists,
      gatewayPath: gateway.path,
      gatewayFileCount: gateway.fileCount,
      gatewayTotalBytes: gateway.totalBytes,
      sessionsExists: sessions.exists,
      sessionsPath: sessions.path,
      sessionsFileCount: sessions.fileCount,
      sessionsTotalBytes: sessions.totalBytes,
    },
    alternateSessionPaths,
    notes,
  };

  if (source.logFile || source.sessionsDir) {
    const logCheck = source.logFile ? checkRemotePath(source.logFile, target) : null;
    const sessCheck = source.sessionsDir ? checkRemotePath(source.sessionsDir, target) : null;

    report.customPaths = {
      logFileExists: logCheck?.exists ?? false,
      logFilePath: source.logFile ?? '',
      logFileBytes: logCheck?.totalBytes ?? 0,
      sessionsDirExists: sessCheck?.exists ?? false,
      sessionsDirPath: source.sessionsDir ?? '',
      sessionsFileCount: sessCheck?.fileCount ?? 0,
      sessionsTotalBytes: sessCheck?.totalBytes ?? 0,
    };

    if (logCheck?.exists) {
      notes.push(`Custom log path ${source.logFile}: ${formatBytes(logCheck.totalBytes)}`);
    } else if (source.logFile) {
      notes.push(`Custom log path ${source.logFile}: not found`);
    }

    if (sessCheck?.exists) {
      notes.push(
        `Custom sessions path ${source.sessionsDir}: ${sessCheck.fileCount} files, ${formatBytes(sessCheck.totalBytes)}`,
      );
    } else if (source.sessionsDir) {
      notes.push(`Custom sessions path ${source.sessionsDir}: not found`);
    }
  }

  return report;
}

function emptyDefaultPaths() {
  return {
    gatewayExists: false,
    gatewayPath: DEFAULT_GATEWAY_DIR,
    gatewayFileCount: 0,
    gatewayTotalBytes: 0,
    sessionsExists: false,
    sessionsPath: DEFAULT_SESSIONS_DIR,
    sessionsFileCount: 0,
    sessionsTotalBytes: 0,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
