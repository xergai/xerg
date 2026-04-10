import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { platform } from 'node:process';

function getUserHome() {
  return process.env.HOME ?? homedir();
}

export function getAppPaths() {
  const home = getUserHome();
  return platform === 'darwin'
    ? {
        data: join(home, 'Library', 'Application Support', 'xerg'),
        config: join(home, 'Library', 'Preferences', 'xerg'),
        cache: join(home, 'Library', 'Caches', 'xerg'),
      }
    : platform === 'win32'
      ? {
          data: join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'xerg', 'Data'),
          config: join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'xerg', 'Config'),
          cache: join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'xerg', 'Cache'),
        }
      : {
          data: join(process.env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'xerg'),
          config: join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'xerg'),
          cache: join(process.env.XDG_CACHE_HOME ?? join(home, '.cache'), 'xerg'),
        };
}

export function ensureAppPaths() {
  const paths = getAppPaths();
  for (const path of Object.values(paths)) {
    mkdirSync(path, { recursive: true });
  }

  return paths;
}

export function getDefaultDbPath() {
  return join(getAppPaths().data, 'xerg.db');
}

export function getDefaultOpenClawSessionsPattern() {
  return join(getUserHome(), '.openclaw', 'agents', '*', 'sessions', '*.jsonl');
}

export function getDefaultOpenClawGatewayPattern() {
  return '/tmp/openclaw/openclaw-*.log';
}

export function getDefaultHermesSessionsPattern() {
  return join(getUserHome(), '.hermes', 'sessions', '**', '*.{json,jsonl}');
}

export function getDefaultHermesGatewayPattern() {
  return join(getUserHome(), '.hermes', 'logs', 'agent.log* (fallback: gateway.log*)');
}

export function getDefaultSessionsPattern() {
  return getDefaultOpenClawSessionsPattern();
}

export function getDefaultGatewayPattern() {
  return getDefaultOpenClawGatewayPattern();
}
