import { Buffer } from 'node:buffer';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock, spawnSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  spawnSyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
  spawnSync: spawnSyncMock,
}));

import {
  buildRailwaySourceFromFlags,
  pullRemoteFilesRailway,
  runRailwayDoctor,
} from '../src/transport/railway.js';

function spawnResult(status: number, stdout = '') {
  return {
    status,
    stdout: Buffer.from(stdout),
  } as ReturnType<typeof spawnSyncMock>;
}

function buildPathResult(config: {
  exists?: boolean;
  fileCount?: number;
  totalBytes?: number;
}) {
  const exists = config.exists ?? false;
  const fileCount = exists ? (config.fileCount ?? 1) : 0;
  const totalBytes = exists ? (config.totalBytes ?? fileCount * 128) : 0;
  return { exists, fileCount, totalBytes };
}

function installDoctorMocks(config: {
  reachStatus: number;
  gatewayExists?: boolean;
  gatewayFileCount?: number;
  sessionsExists?: boolean;
  sessionsFileCount?: number;
  alternateSessionsExists?: boolean;
  alternateSessionsFileCount?: number;
}) {
  const gateway = buildPathResult({
    exists: config.gatewayExists,
    fileCount: config.gatewayFileCount,
  });
  const sessions = buildPathResult({
    exists: config.sessionsExists,
    fileCount: config.sessionsFileCount,
  });
  const alternateSessions = buildPathResult({
    exists: config.alternateSessionsExists,
    fileCount: config.alternateSessionsFileCount,
  });

  spawnSyncMock.mockImplementation((command: string, args: string[] = []) => {
    if (command === 'which' && args[0] === 'railway') {
      return spawnResult(0, '/Users/test/.npm-global/bin/railway\n');
    }

    if (command === 'railway' && args[0] === 'version') {
      return spawnResult(0, 'railway 4.6.1\n');
    }

    if (command === 'railway' && args[0] === 'whoami') {
      return spawnResult(0, 'Logged in as Jason Curry (jason@example.com) 👋\n');
    }

    if (command === 'railway' && args[0] === 'ssh') {
      const remoteCommand = args.at(-1) ?? '';

      if (remoteCommand === 'echo ok') {
        return spawnResult(config.reachStatus, config.reachStatus === 0 ? 'ok\n' : '');
      }

      if (remoteCommand === 'test -e /tmp/openclaw && echo exists') {
        return spawnResult(gateway.exists ? 0 : 1, gateway.exists ? 'exists\n' : '');
      }

      if (remoteCommand === 'find /tmp/openclaw -type f 2>/dev/null | wc -l') {
        return spawnResult(0, `${gateway.fileCount}\n`);
      }

      if (remoteCommand === 'du -sb /tmp/openclaw 2>/dev/null | cut -f1') {
        return spawnResult(0, `${gateway.totalBytes}\n`);
      }

      if (remoteCommand === 'eval echo ~/.openclaw/agents') {
        return spawnResult(0, '/root/.openclaw/agents\n');
      }

      if (remoteCommand === 'test -e /root/.openclaw/agents && echo exists') {
        return spawnResult(sessions.exists ? 0 : 1, sessions.exists ? 'exists\n' : '');
      }

      if (remoteCommand === 'find /root/.openclaw/agents -type f 2>/dev/null | wc -l') {
        return spawnResult(0, `${sessions.fileCount}\n`);
      }

      if (remoteCommand === 'du -sb /root/.openclaw/agents 2>/dev/null | cut -f1') {
        return spawnResult(0, `${sessions.totalBytes}\n`);
      }

      if (remoteCommand === 'test -e /data/.clawdbot/agents/main/sessions && echo exists') {
        return spawnResult(
          alternateSessions.exists ? 0 : 1,
          alternateSessions.exists ? 'exists\n' : '',
        );
      }

      if (
        remoteCommand === 'find /data/.clawdbot/agents/main/sessions -type f 2>/dev/null | wc -l'
      ) {
        return spawnResult(0, `${alternateSessions.fileCount}\n`);
      }

      if (remoteCommand === 'du -sb /data/.clawdbot/agents/main/sessions 2>/dev/null | cut -f1') {
        return spawnResult(0, `${alternateSessions.totalBytes}\n`);
      }
    }

    throw new Error(`Unexpected spawnSync call: ${command} ${args.join(' ')}`);
  });
}

function installPullMocks(config: {
  reachStatus: number;
  gatewayExists?: boolean;
  gatewayFileCount?: number;
  sessionsExists?: boolean;
  sessionsFileCount?: number;
  alternateSessionsExists?: boolean;
  alternateSessionsFileCount?: number;
}) {
  const gateway = buildPathResult({
    exists: config.gatewayExists,
    fileCount: config.gatewayFileCount,
  });
  const sessions = buildPathResult({
    exists: config.sessionsExists,
    fileCount: config.sessionsFileCount,
  });
  const alternateSessions = buildPathResult({
    exists: config.alternateSessionsExists,
    fileCount: config.alternateSessionsFileCount,
  });

  spawnSyncMock.mockImplementation((command: string, args: string[] = []) => {
    if (command !== 'railway' || args[0] !== 'ssh') {
      throw new Error(`Unexpected spawnSync call: ${command} ${args.join(' ')}`);
    }

    const remoteCommand = args.at(-1) ?? '';

    if (remoteCommand === 'echo ok') {
      return spawnResult(config.reachStatus, config.reachStatus === 0 ? 'ok\n' : '');
    }

    if (remoteCommand === 'test -e /tmp/openclaw && echo exists') {
      return spawnResult(gateway.exists ? 0 : 1, gateway.exists ? 'exists\n' : '');
    }

    if (remoteCommand === 'find /tmp/openclaw -type f 2>/dev/null | wc -l') {
      return spawnResult(0, `${gateway.fileCount}\n`);
    }

    if (remoteCommand === 'du -sb /tmp/openclaw 2>/dev/null | cut -f1') {
      return spawnResult(0, `${gateway.totalBytes}\n`);
    }

    if (remoteCommand === 'eval echo ~/.openclaw/agents') {
      return spawnResult(0, '/root/.openclaw/agents\n');
    }

    if (remoteCommand === 'test -e /root/.openclaw/agents && echo exists') {
      return spawnResult(sessions.exists ? 0 : 1, sessions.exists ? 'exists\n' : '');
    }

    if (remoteCommand === 'find /root/.openclaw/agents -type f 2>/dev/null | wc -l') {
      return spawnResult(0, `${sessions.fileCount}\n`);
    }

    if (remoteCommand === 'du -sb /root/.openclaw/agents 2>/dev/null | cut -f1') {
      return spawnResult(0, `${sessions.totalBytes}\n`);
    }

    if (remoteCommand === 'test -e /data/.clawdbot/agents/main/sessions && echo exists') {
      return spawnResult(
        alternateSessions.exists ? 0 : 1,
        alternateSessions.exists ? 'exists\n' : '',
      );
    }

    if (remoteCommand === 'find /data/.clawdbot/agents/main/sessions -type f 2>/dev/null | wc -l') {
      return spawnResult(0, `${alternateSessions.fileCount}\n`);
    }

    if (remoteCommand === 'du -sb /data/.clawdbot/agents/main/sessions 2>/dev/null | cut -f1') {
      return spawnResult(0, `${alternateSessions.totalBytes}\n`);
    }

    throw new Error(`Unexpected spawnSync call: railway ${args.join(' ')}`);
  });
}

describe('Railway diagnostics', () => {
  afterEach(() => {
    execSyncMock.mockReset();
    spawnSyncMock.mockReset();
  });

  it('explains how to relink when linked-mode connectivity fails', async () => {
    installDoctorMocks({ reachStatus: 1 });

    const report = await runRailwayDoctor({
      source: buildRailwaySourceFromFlags({}),
    });

    expect(report.serviceReachable).toBe(false);
    expect(report.serviceError).toContain('Current directory is not linked to a reachable');
    expect(report.notes.some((note) => note.includes('OpenClaw app service'))).toBe(true);
  });

  it('keeps explicit Railway ID failures distinct from linked-mode failures', async () => {
    installDoctorMocks({ reachStatus: 1 });

    const report = await runRailwayDoctor({
      source: buildRailwaySourceFromFlags({
        railway: {
          projectId: 'proj-123',
          environmentId: 'env-123',
          serviceId: 'svc-123',
        },
      }),
    });

    expect(report.serviceReachable).toBe(false);
    expect(report.serviceError).toContain('Cannot reach service svc-123 in project proj-123');
    expect(report.notes.some((note) => note.includes('project: proj-123'))).toBe(true);
  });

  it('warns when a linked Railway service is reachable but looks like the wrong service', async () => {
    installDoctorMocks({
      reachStatus: 0,
      gatewayExists: false,
      sessionsExists: false,
      alternateSessionsExists: false,
    });

    const report = await runRailwayDoctor({
      source: buildRailwaySourceFromFlags({}),
    });

    expect(report.serviceReachable).toBe(true);
    expect(report.notes.some((note) => note.includes('database or sidecar'))).toBe(true);
  });

  it('keeps wrong-service guidance when linked Railway paths exist but are empty', async () => {
    installDoctorMocks({
      reachStatus: 0,
      gatewayExists: true,
      gatewayFileCount: 0,
      sessionsExists: true,
      sessionsFileCount: 0,
      alternateSessionsExists: true,
      alternateSessionsFileCount: 0,
    });

    const report = await runRailwayDoctor({
      source: buildRailwaySourceFromFlags({}),
    });

    expect(report.serviceReachable).toBe(true);
    expect(report.notes.some((note) => note.includes('database or sidecar'))).toBe(true);
  });

  it('surfaces wrong-service guidance during Railway pulls with no OpenClaw data', async () => {
    installPullMocks({
      reachStatus: 0,
      gatewayExists: false,
      sessionsExists: false,
      alternateSessionsExists: false,
    });

    await expect(
      pullRemoteFilesRailway({
        source: buildRailwaySourceFromFlags({}),
      }),
    ).rejects.toThrow('database or sidecar');
  });

  it('surfaces wrong-service guidance during Railway pulls with empty directories', async () => {
    installPullMocks({
      reachStatus: 0,
      gatewayExists: true,
      gatewayFileCount: 0,
      sessionsExists: true,
      sessionsFileCount: 0,
      alternateSessionsExists: true,
      alternateSessionsFileCount: 0,
    });

    await expect(
      pullRemoteFilesRailway({
        source: buildRailwaySourceFromFlags({}),
      }),
    ).rejects.toThrow('database or sidecar');
  });
});
