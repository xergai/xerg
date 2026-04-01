import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PullResult, RemoteDoctorReport, RemoteSource } from './types.js';

const DEFAULT_GATEWAY_DIR = '/tmp/openclaw';
const DEFAULT_SESSIONS_DIR = '~/.openclaw/agents';

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function sshArgs(source: RemoteSource): string[] {
  const args: string[] = [];
  if (source.identityFile) {
    const resolved = source.identityFile.replace(/^~/, homedir());
    args.push('-i', resolved);
  }
  args.push('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10');
  return args;
}

function rsyncSshCommand(source: RemoteSource): string {
  const parts = ['ssh'];
  if (source.identityFile) {
    const resolved = source.identityFile.replace(/^~/, homedir());
    parts.push(`-i "${resolved}"`);
  }
  parts.push('-o BatchMode=yes', '-o ConnectTimeout=10');
  return parts.join(' ');
}

function isRsyncAvailable(): boolean {
  try {
    spawnSync('rsync', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function isRemoteRsyncAvailable(source: RemoteSource): boolean {
  try {
    const result = spawnSync('ssh', [...sshArgs(source), source.host, 'which rsync'], {
      stdio: 'pipe',
      timeout: 15_000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function testSshConnectivity(source: RemoteSource): { ok: boolean; error?: string } {
  const result = spawnSync('ssh', [...sshArgs(source), source.host, 'echo ok'], {
    stdio: 'pipe',
    timeout: 15_000,
  });

  if (result.status === 0) {
    return { ok: true };
  }

  const stderr = result.stderr?.toString().trim() || 'Connection failed';
  return { ok: false, error: stderr };
}

function sshExec(source: RemoteSource, command: string): { stdout: string; status: number } {
  const result = spawnSync('ssh', [...sshArgs(source), source.host, command], {
    stdio: 'pipe',
    timeout: 30_000,
  });
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

function rsyncPull(opts: {
  source: RemoteSource;
  remotePath: string;
  localDir: string;
  includes?: string[];
  since?: string;
}): boolean {
  mkdirSync(opts.localDir, { recursive: true });

  const args = ['-avz', '--timeout=30', '-e', rsyncSshCommand(opts.source)];

  if (opts.includes) {
    for (const pattern of opts.includes) {
      args.push('--include', pattern);
    }
    args.push('--exclude', '*');
  }

  if (opts.since) {
    const findArgs = buildSinceFind(opts.since);
    if (findArgs) {
      const fileListCmd = `find ${opts.remotePath} -type f ${findArgs} 2>/dev/null`;
      const { stdout, status } = sshExec(opts.source, fileListCmd);
      if (status !== 0 || !stdout) return false;

      const files = stdout.split('\n').filter(Boolean);
      if (files.length === 0) return false;

      const tmpFile = join(tmpdir(), `xerg-filelist-${hashString(opts.remotePath)}`);
      const relativePaths = files.map((f) =>
        f.startsWith(opts.remotePath) ? f.slice(opts.remotePath.length).replace(/^\//, '') : f,
      );
      execSync(`cat > ${tmpFile} << 'XERGEOF'\n${relativePaths.join('\n')}\nXERGEOF`);
      args.push('--files-from', tmpFile);
    }
  }

  const remoteSrc = opts.remotePath.endsWith('/')
    ? `${opts.source.host}:${opts.remotePath}`
    : `${opts.source.host}:${opts.remotePath}/`;

  args.push(remoteSrc, `${opts.localDir}/`);

  const result = spawnSync('rsync', args, { stdio: 'pipe', timeout: 120_000 });
  return result.status === 0;
}

function tarSshPull(opts: {
  source: RemoteSource;
  remotePath: string;
  localDir: string;
}): boolean {
  mkdirSync(opts.localDir, { recursive: true });

  const tarCmd = `tar -czf - -C ${opts.remotePath} . 2>/dev/null`;
  const sshArgsList = sshArgs(opts.source);
  const fullCmd = `ssh ${sshArgsList.map((a) => `"${a}"`).join(' ')} ${opts.source.host} '${tarCmd}' | tar -xzf - -C ${opts.localDir}`;

  try {
    execSync(fullCmd, { stdio: 'pipe', timeout: 120_000 });
    return true;
  } catch {
    return false;
  }
}

function pullDirectory(opts: {
  source: RemoteSource;
  remotePath: string;
  localDir: string;
  includes?: string[];
  since?: string;
  useRsync: boolean;
}): boolean {
  if (opts.useRsync) {
    const ok = rsyncPull({
      source: opts.source,
      remotePath: opts.remotePath,
      localDir: opts.localDir,
      includes: opts.includes,
      since: opts.since,
    });
    if (ok) return true;
  }

  process.stderr.write(
    opts.useRsync
      ? 'rsync transfer failed, falling back to tar over ssh\n'
      : 'rsync not found, using tar over ssh\n',
  );

  return tarSshPull({
    source: opts.source,
    remotePath: opts.remotePath,
    localDir: opts.localDir,
  });
}

function resolveLocalPath(source: RemoteSource, keepFiles: boolean): string {
  if (keepFiles) {
    const cacheDir = join(homedir(), '.xerg', 'remote-cache', source.name);
    mkdirSync(cacheDir, { recursive: true });
    return cacheDir;
  }

  const hash = hashString(`${source.host}:${Date.now()}`);
  const tmpPath = join(tmpdir(), `xerg-remote-${hash}`);
  mkdirSync(tmpPath, { recursive: true });
  return tmpPath;
}

export function parseRemoteTarget(target: string): { user: string; host: string; port?: string } {
  const portMatch = target.match(/^(.+):(\d+)$/);
  if (portMatch) {
    const userHost = portMatch[1];
    const port = portMatch[2];
    const atIndex = userHost.indexOf('@');
    return {
      user: atIndex >= 0 ? userHost.slice(0, atIndex) : '',
      host: atIndex >= 0 ? userHost.slice(atIndex + 1) : userHost,
      port,
    };
  }

  const atIndex = target.indexOf('@');
  return {
    user: atIndex >= 0 ? target.slice(0, atIndex) : '',
    host: atIndex >= 0 ? target.slice(atIndex + 1) : target,
  };
}

export function buildSourceFromFlags(opts: {
  remote: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
}): RemoteSource {
  const parsed = parseRemoteTarget(opts.remote);
  return {
    name: parsed.host,
    transport: 'ssh',
    host: opts.remote,
    logFile: opts.remoteLogFile,
    sessionsDir: opts.remoteSessionsDir,
  };
}

export function buildComparisonKeyForRemote(source: RemoteSource): string {
  const logPath = source.logFile ?? DEFAULT_GATEWAY_DIR;
  const sessPath = source.sessionsDir ?? DEFAULT_SESSIONS_DIR;
  return `${source.host}:${logPath}:${sessPath}`;
}

export async function pullRemoteFiles(opts: {
  source: RemoteSource;
  since?: string;
  keepFiles?: boolean;
  onProgress?: (message: string) => void;
}): Promise<PullResult> {
  const { source, since, keepFiles = false, onProgress } = opts;

  onProgress?.(`Testing SSH connectivity to ${source.host}...`);
  const connectivity = testSshConnectivity(source);
  if (!connectivity.ok) {
    throw new Error(
      `Cannot connect to ${source.host}. Check SSH config and key access.${connectivity.error ? ` (${connectivity.error})` : ''}`,
    );
  }
  onProgress?.('SSH connectivity OK.');

  const useRsync = isRsyncAvailable();
  onProgress?.(
    useRsync
      ? 'Local rsync detected. Xerg will prefer rsync and fall back to tar over SSH if needed.'
      : 'Local rsync not detected. Xerg will pull files with tar over SSH.',
  );
  const localBase = resolveLocalPath(source, keepFiles);
  const gatewayDir = join(localBase, 'gateway');
  const sessionsDir = join(localBase, 'sessions');

  const remoteLogPath = source.logFile ?? DEFAULT_GATEWAY_DIR;
  const remoteSessionsPath = source.sessionsDir ?? DEFAULT_SESSIONS_DIR;

  const { stdout: expandedSessions } = sshExec(source, `eval echo ${remoteSessionsPath}`);
  const resolvedSessionsPath = expandedSessions || remoteSessionsPath;
  onProgress?.('Checking remote default paths for gateway logs and sessions...');

  const { status: logPathExists } = sshExec(source, `test -e ${remoteLogPath} && echo exists`);
  const { status: sessPathExists } = sshExec(
    source,
    `test -e ${resolvedSessionsPath} && echo exists`,
  );

  let pulledLog = false;
  let pulledSessions = false;

  if (logPathExists === 0) {
    onProgress?.(`Pulling gateway logs from ${remoteLogPath}...`);
    const { stdout: isFile } = sshExec(source, `test -f ${remoteLogPath} && echo file`);
    if (isFile === 'file') {
      const parentDir = remoteLogPath.slice(0, remoteLogPath.lastIndexOf('/')) || '/tmp';
      const fileName = remoteLogPath.slice(remoteLogPath.lastIndexOf('/') + 1);
      pulledLog = pullDirectory({
        source,
        remotePath: parentDir,
        localDir: gatewayDir,
        includes: [fileName],
        since,
        useRsync,
      });
    } else {
      pulledLog = pullDirectory({
        source,
        remotePath: remoteLogPath,
        localDir: gatewayDir,
        includes: ['openclaw-*.log', '*.log'],
        since,
        useRsync,
      });
    }
  }

  if (sessPathExists === 0) {
    onProgress?.(`Pulling session files from ${resolvedSessionsPath}...`);
    pulledSessions = pullDirectory({
      source,
      remotePath: resolvedSessionsPath,
      localDir: sessionsDir,
      includes: ['**/', '*.jsonl'],
      since,
      useRsync,
    });
  }

  if (!pulledLog && !pulledSessions) {
    if (keepFiles) {
      rmSync(localBase, { recursive: true, force: true });
    }
    throw new Error(
      `No OpenClaw data found at default paths on ${source.host}. Use --remote-log-file or --remote-sessions-dir.`,
    );
  }

  const result: PullResult = {
    localPath: localBase,
    source,
  };

  if (pulledLog) result.logFile = gatewayDir;
  if (pulledSessions) result.sessionsDir = sessionsDir;
  onProgress?.('Remote files pulled successfully.');

  return result;
}

export async function runRemoteDoctor(opts: {
  source: RemoteSource;
  onProgress?: (message: string) => void;
}): Promise<RemoteDoctorReport> {
  const { source, onProgress } = opts;
  const notes: string[] = [];

  onProgress?.(`Testing SSH connectivity to ${source.host}...`);
  const connectivity = testSshConnectivity(source);
  if (!connectivity.ok) {
    return {
      host: source.host,
      sshConnectivity: false,
      sshError: connectivity.error,
      rsyncAvailableLocal: false,
      rsyncAvailableRemote: false,
      defaultPaths: {
        gatewayExists: false,
        gatewayPath: DEFAULT_GATEWAY_DIR,
        gatewayFileCount: 0,
        gatewayTotalBytes: 0,
        sessionsExists: false,
        sessionsPath: DEFAULT_SESSIONS_DIR,
        sessionsFileCount: 0,
        sessionsTotalBytes: 0,
      },
      notes: [
        `Cannot connect to ${source.host}. Check SSH config and key access.${connectivity.error ? ` (${connectivity.error})` : ''}`,
      ],
    };
  }

  onProgress?.('SSH connectivity OK.');
  notes.push('SSH connectivity: OK');

  onProgress?.('Checking rsync availability locally and on the remote host...');
  const rsyncLocal = isRsyncAvailable();
  const rsyncRemote = isRemoteRsyncAvailable(source);
  notes.push(`rsync available locally: ${rsyncLocal ? 'yes' : 'no'}`);
  notes.push(`rsync available on remote: ${rsyncRemote ? 'yes' : 'no'}`);
  if (!rsyncLocal || !rsyncRemote) {
    notes.push('tar over ssh fallback will be used for file transfer');
  }

  function checkPath(remotePath: string) {
    const { stdout: expanded } = sshExec(source, `eval echo ${remotePath}`);
    const resolved = expanded || remotePath;
    const { status: exists } = sshExec(source, `test -e ${resolved} && echo exists`);
    if (exists !== 0) {
      return { exists: false, path: resolved, fileCount: 0, totalBytes: 0 };
    }
    const { stdout: countOut } = sshExec(source, `find ${resolved} -type f 2>/dev/null | wc -l`);
    const { stdout: sizeOut } = sshExec(source, `du -sb ${resolved} 2>/dev/null | cut -f1`);
    return {
      exists: true,
      path: resolved,
      fileCount: Number.parseInt(countOut, 10) || 0,
      totalBytes: Number.parseInt(sizeOut, 10) || 0,
    };
  }

  onProgress?.('Inspecting remote default paths...');
  const gateway = checkPath(DEFAULT_GATEWAY_DIR);
  const sessions = checkPath(DEFAULT_SESSIONS_DIR);

  if (gateway.exists) {
    notes.push(
      `Gateway logs found at ${gateway.path}: ${gateway.fileCount} files, ${formatBytes(gateway.totalBytes)}`,
    );
  } else {
    notes.push(`No gateway logs at ${gateway.path}`);
  }

  if (sessions.exists) {
    notes.push(
      `Sessions found at ${sessions.path}: ${sessions.fileCount} files, ${formatBytes(sessions.totalBytes)}`,
    );
  } else {
    notes.push(`No sessions at ${sessions.path}`);
  }

  const report: RemoteDoctorReport = {
    host: source.host,
    sshConnectivity: true,
    rsyncAvailableLocal: rsyncLocal,
    rsyncAvailableRemote: rsyncRemote,
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
    notes,
  };

  if (source.logFile || source.sessionsDir) {
    const logCheck = source.logFile ? checkPath(source.logFile) : null;
    const sessCheck = source.sessionsDir ? checkPath(source.sessionsDir) : null;

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
