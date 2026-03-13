import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { platform } from 'node:process';

export function getAppPaths() {
  const home = homedir();
  const paths =
    platform === 'darwin'
      ? {
          data: join(home, 'Library', 'Application Support', 'xerg'),
          config: join(home, 'Library', 'Preferences', 'xerg'),
          cache: join(home, 'Library', 'Caches', 'xerg'),
        }
      : platform === 'win32'
        ? {
            data: join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'xerg', 'Data'),
            config: join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'xerg', 'Config'),
            cache: join(
              process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'),
              'xerg',
              'Cache',
            ),
          }
        : {
            data: join(process.env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'xerg'),
            config: join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'xerg'),
            cache: join(process.env.XDG_CACHE_HOME ?? join(home, '.cache'), 'xerg'),
          };

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
