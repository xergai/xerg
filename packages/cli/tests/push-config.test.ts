import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadPushConfig } from '../src/push/config.js';

function clearEnv(key: string) {
  Reflect.deleteProperty(process.env, key);
}

describe('loadPushConfig', () => {
  const savedKey = process.env.XERG_API_KEY;
  const savedUrl = process.env.XERG_API_URL;

  beforeEach(() => {
    clearEnv('XERG_API_KEY');
    clearEnv('XERG_API_URL');
  });

  afterEach(() => {
    if (savedKey !== undefined) {
      process.env.XERG_API_KEY = savedKey;
    } else {
      clearEnv('XERG_API_KEY');
    }
    if (savedUrl !== undefined) {
      process.env.XERG_API_URL = savedUrl;
    } else {
      clearEnv('XERG_API_URL');
    }
  });

  it('reads API key from XERG_API_KEY env var', () => {
    process.env.XERG_API_KEY = 'sk_test_env_key';

    const config = loadPushConfig();
    expect(config.apiKey).toBe('sk_test_env_key');
    expect(config.apiUrl).toBe('https://api.xerg.ai');
  });

  it('reads custom API URL from XERG_API_URL env var', () => {
    process.env.XERG_API_KEY = 'sk_test_env_key';
    process.env.XERG_API_URL = 'https://api-staging.xerg.ai';

    const config = loadPushConfig();
    expect(config.apiKey).toBe('sk_test_env_key');
    expect(config.apiUrl).toBe('https://api-staging.xerg.ai');
  });

  it('env var takes priority over config file', () => {
    process.env.XERG_API_KEY = 'sk_from_env';

    const config = loadPushConfig();
    expect(config.apiKey).toBe('sk_from_env');
  });

  it('throws when no API key is configured', () => {
    expect(() => loadPushConfig()).toThrow('No API key configured');
  });

  it('error message includes instructions', () => {
    expect(() => loadPushConfig()).toThrow('XERG_API_KEY');
    expect(() => loadPushConfig()).toThrow('xerg.ai/dashboard/settings');
  });
});
