import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import envPaths from 'env-paths';

export function getAppPaths() {
  const paths = envPaths('xerg', { suffix: '' });

  mkdirSync(paths.data, { recursive: true });
  mkdirSync(paths.config, { recursive: true });
  mkdirSync(paths.cache, { recursive: true });

  return paths;
}

export function getDefaultDbPath() {
  return join(getAppPaths().data, 'xerg.db');
}

export function getDefaultSessionsPattern() {
  return join(homedir(), '.openclaw', 'agents', '*', 'sessions', '*.jsonl');
}

export function getDefaultGatewayPattern() {
  return '/tmp/openclaw/openclaw-*.log';
}
