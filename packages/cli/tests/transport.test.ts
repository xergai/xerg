import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadRemoteConfig } from '../src/transport/config.js';
import {
  buildComparisonKeyForRailway,
  buildRailwaySourceFromFlags,
} from '../src/transport/railway.js';
import {
  buildComparisonKeyForRemote,
  buildSourceFromFlags,
  parseRemoteTarget,
} from '../src/transport/ssh.js';

// ---------------------------------------------------------------------------
// SSH transport
// ---------------------------------------------------------------------------

describe('parseRemoteTarget', () => {
  it('parses user@host', () => {
    const result = parseRemoteTarget('deploy@prod.example.com');
    expect(result).toEqual({
      user: 'deploy',
      host: 'prod.example.com',
      port: undefined,
    });
  });

  it('parses user@host:port', () => {
    const result = parseRemoteTarget('deploy@prod.example.com:2222');
    expect(result).toEqual({
      user: 'deploy',
      host: 'prod.example.com',
      port: '2222',
    });
  });

  it('parses bare host without user', () => {
    const result = parseRemoteTarget('prod.example.com');
    expect(result).toEqual({
      user: '',
      host: 'prod.example.com',
    });
  });
});

describe('buildSourceFromFlags (SSH)', () => {
  it('derives name from host and sets transport to ssh', () => {
    const source = buildSourceFromFlags({
      remote: 'deploy@prod.example.com',
    });
    expect(source.name).toBe('prod.example.com');
    expect(source.transport).toBe('ssh');
    expect(source.host).toBe('deploy@prod.example.com');
    expect(source.logFile).toBeUndefined();
    expect(source.sessionsDir).toBeUndefined();
  });

  it('passes custom paths through', () => {
    const source = buildSourceFromFlags({
      remote: 'deploy@prod.example.com',
      remoteLogFile: '/opt/openclaw/logs/openclaw.log',
      remoteSessionsDir: '/opt/openclaw/sessions',
    });
    expect(source.logFile).toBe('/opt/openclaw/logs/openclaw.log');
    expect(source.sessionsDir).toBe('/opt/openclaw/sessions');
  });
});

describe('buildComparisonKeyForRemote (SSH)', () => {
  it('produces a stable key from host and paths', () => {
    const key1 = buildComparisonKeyForRemote({
      name: 'production',
      transport: 'ssh',
      host: 'deploy@prod.example.com',
    });
    const key2 = buildComparisonKeyForRemote({
      name: 'production',
      transport: 'ssh',
      host: 'deploy@prod.example.com',
    });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different hosts', () => {
    const key1 = buildComparisonKeyForRemote({
      name: 'production',
      transport: 'ssh',
      host: 'deploy@prod.example.com',
    });
    const key2 = buildComparisonKeyForRemote({
      name: 'staging',
      transport: 'ssh',
      host: 'deploy@staging.example.com',
    });
    expect(key1).not.toBe(key2);
  });

  it('uses default paths when not specified', () => {
    const key = buildComparisonKeyForRemote({
      name: 'production',
      transport: 'ssh',
      host: 'deploy@prod.example.com',
    });
    expect(key).toContain('deploy@prod.example.com');
    expect(key).toContain('/tmp/openclaw');
    expect(key).toContain('~/.openclaw/agents');
  });

  it('uses custom paths when specified', () => {
    const key = buildComparisonKeyForRemote({
      name: 'production',
      transport: 'ssh',
      host: 'deploy@prod.example.com',
      logFile: '/opt/logs/openclaw.log',
      sessionsDir: '/opt/sessions',
    });
    expect(key).toContain('/opt/logs/openclaw.log');
    expect(key).toContain('/opt/sessions');
    expect(key).not.toContain('/tmp/openclaw');
  });
});

// ---------------------------------------------------------------------------
// Railway transport
// ---------------------------------------------------------------------------

describe('buildRailwaySourceFromFlags', () => {
  it('builds a source with explicit Railway IDs', () => {
    const source = buildRailwaySourceFromFlags({
      railway: {
        projectId: '1fc08608-0ffd-4844-9077-5eedc5cb7407',
        environmentId: 'fbc208ca-7305-4084-a816-9878a7ab77b3',
        serviceId: '529b088e-1039-4f49-802b-0083cdf743cf',
      },
    });
    expect(source.transport).toBe('railway');
    expect(source.name).toBe('railway-529b088e');
    expect(source.railway).toBeDefined();
    expect(source.railway?.projectId).toBe('1fc08608-0ffd-4844-9077-5eedc5cb7407');
  });

  it('builds a linked source when no IDs are provided', () => {
    const source = buildRailwaySourceFromFlags({});
    expect(source.transport).toBe('railway');
    expect(source.name).toBe('railway-linked');
    expect(source.railway).toBeUndefined();
  });

  it('passes custom paths through', () => {
    const source = buildRailwaySourceFromFlags({
      railway: {
        projectId: 'p1',
        environmentId: 'e1',
        serviceId: 's1',
      },
      remoteLogFile: '/custom/logs',
      remoteSessionsDir: '/custom/sessions',
    });
    expect(source.logFile).toBe('/custom/logs');
    expect(source.sessionsDir).toBe('/custom/sessions');
  });
});

describe('buildComparisonKeyForRailway', () => {
  it('produces a stable key with Railway IDs', () => {
    const source = buildRailwaySourceFromFlags({
      railway: {
        projectId: 'proj-1',
        environmentId: 'env-1',
        serviceId: 'svc-1',
      },
    });
    const key1 = buildComparisonKeyForRailway(source);
    const key2 = buildComparisonKeyForRailway(source);
    expect(key1).toBe(key2);
    expect(key1).toContain('railway:');
    expect(key1).toContain('proj-1');
    expect(key1).toContain('env-1');
    expect(key1).toContain('svc-1');
  });

  it('produces different keys for different services', () => {
    const source1 = buildRailwaySourceFromFlags({
      railway: { projectId: 'p1', environmentId: 'e1', serviceId: 'svc-a' },
    });
    const source2 = buildRailwaySourceFromFlags({
      railway: { projectId: 'p1', environmentId: 'e1', serviceId: 'svc-b' },
    });
    expect(buildComparisonKeyForRailway(source1)).not.toBe(buildComparisonKeyForRailway(source2));
  });

  it('includes custom paths in the key', () => {
    const source = buildRailwaySourceFromFlags({
      railway: { projectId: 'p1', environmentId: 'e1', serviceId: 'svc-1' },
      remoteLogFile: '/custom/logs',
      remoteSessionsDir: '/custom/sessions',
    });
    const key = buildComparisonKeyForRailway(source);
    expect(key).toContain('/custom/logs');
    expect(key).toContain('/custom/sessions');
  });

  it('uses default paths when none specified', () => {
    const source = buildRailwaySourceFromFlags({
      railway: { projectId: 'p1', environmentId: 'e1', serviceId: 'svc-1' },
    });
    const key = buildComparisonKeyForRailway(source);
    expect(key).toContain('/tmp/openclaw');
    expect(key).toContain('~/.openclaw/agents');
  });

  it('produces a stable linked key without IDs', () => {
    const source = buildRailwaySourceFromFlags({});
    const key = buildComparisonKeyForRailway(source);
    expect(key).toBe('railway-linked:/tmp/openclaw:~/.openclaw/agents');
  });

  it('SSH and Railway keys are never equal for the same paths', () => {
    const sshSource = buildSourceFromFlags({ remote: 'user@host' });
    const railwaySource = buildRailwaySourceFromFlags({
      railway: { projectId: 'p1', environmentId: 'e1', serviceId: 'svc-1' },
    });
    expect(buildComparisonKeyForRemote(sshSource)).not.toBe(
      buildComparisonKeyForRailway(railwaySource),
    );
  });
});

// ---------------------------------------------------------------------------
// Config loading (shared)
// ---------------------------------------------------------------------------

describe('loadRemoteConfig', () => {
  let tmpPath: string;

  beforeEach(() => {
    tmpPath = join(tmpdir(), `xerg-test-config-${Date.now()}`);
    mkdirSync(tmpPath, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpPath, { recursive: true, force: true });
  });

  it('loads a valid SSH remote config', () => {
    const configFile = join(tmpPath, 'remotes.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'production',
            host: 'deploy@prod.example.com',
            logFile: '/opt/openclaw/logs/openclaw.log',
            sessionsDir: '/opt/openclaw/sessions',
          },
          {
            name: 'canary',
            host: 'deploy@prod.example.com',
            logFile: '/opt/openclaw-canary/logs/openclaw.log',
            sessionsDir: '/opt/openclaw-canary/sessions',
            identityFile: '~/.ssh/staging_key',
          },
        ],
      }),
    );

    const remotes = loadRemoteConfig(configFile);
    expect(remotes).toHaveLength(2);
    expect(remotes[0].name).toBe('production');
    expect(remotes[0].transport).toBe('ssh');
    expect(remotes[1].name).toBe('canary');
    expect(remotes[1].identityFile).toBe('~/.ssh/staging_key');
  });

  it('loads a valid Railway remote config', () => {
    const configFile = join(tmpPath, 'remotes.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'production',
            transport: 'railway',
            railway: {
              projectId: '1fc08608-0ffd-4844-9077-5eedc5cb7407',
              environmentId: 'fbc208ca-7305-4084-a816-9878a7ab77b3',
              serviceId: '529b088e-1039-4f49-802b-0083cdf743cf',
            },
          },
        ],
      }),
    );

    const remotes = loadRemoteConfig(configFile);
    expect(remotes).toHaveLength(1);
    expect(remotes[0].name).toBe('production');
    expect(remotes[0].transport).toBe('railway');
    expect(remotes[0].railway?.projectId).toBe('1fc08608-0ffd-4844-9077-5eedc5cb7407');
    expect(remotes[0].host).toBe('railway-529b088e');
  });

  it('loads a mixed SSH + Railway config', () => {
    const configFile = join(tmpPath, 'remotes.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'vps-prod',
            host: 'deploy@prod.example.com',
          },
          {
            name: 'railway-prod',
            transport: 'railway',
            railway: {
              projectId: 'p1',
              environmentId: 'e1',
              serviceId: 's1',
            },
          },
        ],
      }),
    );

    const remotes = loadRemoteConfig(configFile);
    expect(remotes).toHaveLength(2);
    expect(remotes[0].transport).toBe('ssh');
    expect(remotes[1].transport).toBe('railway');
  });

  it('throws on missing file', () => {
    expect(() => loadRemoteConfig(join(tmpPath, 'nonexistent.json'))).toThrow(
      'Cannot read remote config',
    );
  });

  it('throws on invalid JSON', () => {
    const configFile = join(tmpPath, 'bad.json');
    writeFileSync(configFile, 'not json');
    expect(() => loadRemoteConfig(configFile)).toThrow('Invalid JSON');
  });

  it('throws when remotes array is missing', () => {
    const configFile = join(tmpPath, 'no-remotes.json');
    writeFileSync(configFile, JSON.stringify({ foo: 'bar' }));
    expect(() => loadRemoteConfig(configFile)).toThrow('must have a "remotes" array');
  });

  it('throws when remotes array is empty', () => {
    const configFile = join(tmpPath, 'empty.json');
    writeFileSync(configFile, JSON.stringify({ remotes: [] }));
    expect(() => loadRemoteConfig(configFile)).toThrow('empty');
  });

  it('throws when a remote is missing a name', () => {
    const configFile = join(tmpPath, 'no-name.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [{ host: 'deploy@prod.example.com' }],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('must have a "name"');
  });

  it('throws when an SSH remote is missing a host', () => {
    const configFile = join(tmpPath, 'no-host.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [{ name: 'production' }],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('must have a "host"');
  });

  it('throws on invalid transport value', () => {
    const configFile = join(tmpPath, 'bad-transport.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [{ name: 'prod', transport: 'ftp', host: 'foo' }],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('invalid transport');
  });

  it('throws when Railway source is missing the railway object', () => {
    const configFile = join(tmpPath, 'railway-no-obj.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [{ name: 'prod', transport: 'railway' }],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('must have a "railway" object');
  });

  it('throws when Railway source is missing projectId', () => {
    const configFile = join(tmpPath, 'railway-no-project.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'prod',
            transport: 'railway',
            railway: { environmentId: 'e1', serviceId: 's1' },
          },
        ],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('"projectId"');
  });

  it('throws when Railway source is missing environmentId', () => {
    const configFile = join(tmpPath, 'railway-no-env.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'prod',
            transport: 'railway',
            railway: { projectId: 'p1', serviceId: 's1' },
          },
        ],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('"environmentId"');
  });

  it('throws when Railway source is missing serviceId', () => {
    const configFile = join(tmpPath, 'railway-no-svc.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        remotes: [
          {
            name: 'prod',
            transport: 'railway',
            railway: { projectId: 'p1', environmentId: 'e1' },
          },
        ],
      }),
    );
    expect(() => loadRemoteConfig(configFile)).toThrow('"serviceId"');
  });
});
