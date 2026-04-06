import { describe, expect, it } from 'vitest';

import { formatCommand, resolveCommandDisplay } from '../src/command-display.js';

describe('resolveCommandDisplay', () => {
  it('defaults to xerg for direct installs', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/usr/local/lib/node_modules/@xerg/cli/dist/index.js'],
      env: {},
    });

    expect(display).toEqual({
      prefix: 'xerg',
      name: 'xerg',
    });
  });

  it('uses npx for npm user agents', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/tmp/run.js'],
      env: { npm_config_user_agent: 'npm/10.8.2 node/v22.14.0 darwin arm64' },
    });

    expect(display.prefix).toBe('npx @xerg/cli');
    expect(display.name).toBe('@xerg/cli');
  });

  it('uses pnpm dlx for pnpm user agents', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/tmp/run.js'],
      env: { npm_config_user_agent: 'pnpm/10.2.0 npm/? node/v22.14.0 darwin arm64' },
    });

    expect(display.prefix).toBe('pnpm dlx @xerg/cli');
  });

  it('uses yarn dlx for yarn user agents', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/tmp/run.js'],
      env: { npm_config_user_agent: 'yarn/4.6.0 npm/? node/v22.14.0 darwin arm64' },
    });

    expect(display.prefix).toBe('yarn dlx @xerg/cli');
  });

  it('uses bunx for bun user agents', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/tmp/run.js'],
      env: { npm_config_user_agent: 'bun/1.2.0 darwin-arm64' },
    });

    expect(display.prefix).toBe('bunx @xerg/cli');
  });

  it('detects npx from temp argv paths when env vars are unavailable', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/Users/test/.npm/_npx/4c5f/node_modules/@xerg/cli/dist/index.js'],
      env: {},
    });

    expect(display.prefix).toBe('npx @xerg/cli');
  });

  it('falls back to npx when package-managed execution is detected but the runner is unknown', () => {
    const display = resolveCommandDisplay({
      argv: ['node', '/tmp/run.js'],
      env: { npm_execpath: '/opt/custom-package-executor' },
    });

    expect(display.prefix).toBe('npx @xerg/cli');
  });
});

describe('formatCommand', () => {
  it('joins command segments with the provided prefix', () => {
    expect(formatCommand(['doctor', '--help'], 'pnpm dlx @xerg/cli')).toBe(
      'pnpm dlx @xerg/cli doctor --help',
    );
  });
});
