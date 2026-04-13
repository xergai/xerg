import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function clearEnv(key: string) {
  Reflect.deleteProperty(process.env, key);
}

describe('loadPushConfig', () => {
  const originalEnv = {
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XERG_API_KEY: process.env.XERG_API_KEY,
    XERG_API_URL: process.env.XERG_API_URL,
  };
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    clearEnv('XERG_API_KEY');
    clearEnv('XERG_API_URL');
    clearEnv('HOME');
    clearEnv('XDG_CONFIG_HOME');
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalEnv.HOME !== undefined) {
      process.env.HOME = originalEnv.HOME;
    } else {
      clearEnv('HOME');
    }

    if (originalEnv.XDG_CONFIG_HOME !== undefined) {
      process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
    } else {
      clearEnv('XDG_CONFIG_HOME');
    }

    if (originalEnv.XERG_API_KEY !== undefined) {
      process.env.XERG_API_KEY = originalEnv.XERG_API_KEY;
    } else {
      clearEnv('XERG_API_KEY');
    }

    if (originalEnv.XERG_API_URL !== undefined) {
      process.env.XERG_API_URL = originalEnv.XERG_API_URL;
    } else {
      clearEnv('XERG_API_URL');
    }

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  async function loadModule() {
    return import('../src/push/config.js');
  }

  function createTempDir(prefix: string) {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('reads API key from XERG_API_KEY env var', async () => {
    process.env.XERG_API_KEY = 'sk_test_env_key';

    const { loadPushConfig } = await loadModule();
    const config = loadPushConfig();
    expect(config).toMatchObject({
      apiKey: 'sk_test_env_key',
      apiUrl: 'https://api.xerg.ai',
      source: 'env',
    });
  });

  it('reads custom API URL from XERG_API_URL env var', async () => {
    process.env.XERG_API_KEY = 'sk_test_env_key';
    process.env.XERG_API_URL = 'https://api-staging.xerg.ai';

    const { loadPushConfig } = await loadModule();
    const config = loadPushConfig();
    expect(config).toMatchObject({
      apiKey: 'sk_test_env_key',
      apiUrl: 'https://api-staging.xerg.ai',
      source: 'env',
    });
  });

  it('reads API key from ~/.xerg/config.json when env is absent', async () => {
    const home = createTempDir('xerg-home-');
    process.env.HOME = home;

    mkdirSync(join(home, '.xerg'), { recursive: true });
    writeFileSync(
      join(home, '.xerg', 'config.json'),
      JSON.stringify({
        apiKey: 'sk_from_config',
        apiUrl: 'https://api-config.xerg.ai',
      }),
    );

    const { loadPushConfig } = await loadModule();
    const config = loadPushConfig();

    expect(config).toMatchObject({
      apiKey: 'sk_from_config',
      apiUrl: 'https://api-config.xerg.ai',
      source: 'config',
    });
  });

  it('falls back to stored browser credentials', async () => {
    const configHome = createTempDir('xerg-config-home-');
    process.env.XDG_CONFIG_HOME = configHome;

    mkdirSync(join(configHome, 'xerg'), { recursive: true });
    writeFileSync(
      join(configHome, 'xerg', 'credentials.json'),
      JSON.stringify({
        token: 'sk_from_stored_login',
        storedAt: '2026-04-13T00:00:00.000Z',
      }),
    );

    const { loadPushConfig } = await loadModule();
    const config = loadPushConfig();

    expect(config).toMatchObject({
      apiKey: 'sk_from_stored_login',
      apiUrl: 'https://api.xerg.ai',
      source: 'stored',
    });
  });

  it('env var takes priority over config file', async () => {
    const home = createTempDir('xerg-home-');
    process.env.HOME = home;
    process.env.XERG_API_KEY = 'sk_from_env';

    mkdirSync(join(home, '.xerg'), { recursive: true });
    writeFileSync(
      join(home, '.xerg', 'config.json'),
      JSON.stringify({
        apiKey: 'sk_from_config',
      }),
    );

    const { loadPushConfig } = await loadModule();
    const config = loadPushConfig();
    expect(config).toMatchObject({
      apiKey: 'sk_from_env',
      source: 'env',
    });
  });

  it('throws when no API key is configured', async () => {
    const { loadPushConfig } = await loadModule();
    expect(() => loadPushConfig()).toThrow('No API key configured');
  });

  it('error message includes instructions', async () => {
    const { loadPushConfig } = await loadModule();
    expect(() => loadPushConfig()).toThrow('XERG_API_KEY');
    expect(() => loadPushConfig()).toThrow('xerg.ai/dashboard/settings');
  });
});
