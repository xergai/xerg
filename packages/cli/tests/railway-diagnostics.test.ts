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

function installDoctorMocks(config: {
  reachStatus: number;
  gatewayExists?: boolean;
  sessionsExists?: boolean;
  alternateSessionsExists?: boolean;
}) {
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
        return spawnResult(config.gatewayExists ? 0 : 1, config.gatewayExists ? 'exists\n' : '');
      }

      if (remoteCommand === 'eval echo ~/.openclaw/agents') {
        return spawnResult(0, '/root/.openclaw/agents\n');
      }

      if (remoteCommand === 'test -e /root/.openclaw/agents && echo exists') {
        return spawnResult(config.sessionsExists ? 0 : 1, config.sessionsExists ? 'exists\n' : '');
      }

      if (remoteCommand === 'test -e /data/.clawdbot/agents/main/sessions && echo exists') {
        return spawnResult(
          config.alternateSessionsExists ? 0 : 1,
          config.alternateSessionsExists ? 'exists\n' : '',
        );
      }
    }

    throw new Error(`Unexpected spawnSync call: ${command} ${args.join(' ')}`);
  });
}

function installPullMocks(config: {
  reachStatus: number;
  gatewayExists?: boolean;
  sessionsExists?: boolean;
  alternateSessionsExists?: boolean;
}) {
  spawnSyncMock.mockImplementation((command: string, args: string[] = []) => {
    if (command !== 'railway' || args[0] !== 'ssh') {
      throw new Error(`Unexpected spawnSync call: ${command} ${args.join(' ')}`);
    }

    const remoteCommand = args.at(-1) ?? '';

    if (remoteCommand === 'echo ok') {
      return spawnResult(config.reachStatus, config.reachStatus === 0 ? 'ok\n' : '');
    }

    if (remoteCommand === 'test -e /tmp/openclaw && echo exists') {
      return spawnResult(config.gatewayExists ? 0 : 1, config.gatewayExists ? 'exists\n' : '');
    }

    if (remoteCommand === 'eval echo ~/.openclaw/agents') {
      return spawnResult(0, '/root/.openclaw/agents\n');
    }

    if (remoteCommand === 'test -e /root/.openclaw/agents && echo exists') {
      return spawnResult(config.sessionsExists ? 0 : 1, config.sessionsExists ? 'exists\n' : '');
    }

    if (remoteCommand === 'test -e /data/.clawdbot/agents/main/sessions && echo exists') {
      return spawnResult(
        config.alternateSessionsExists ? 0 : 1,
        config.alternateSessionsExists ? 'exists\n' : '',
      );
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
});
