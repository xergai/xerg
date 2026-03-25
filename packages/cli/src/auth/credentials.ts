import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

interface StoredCredentials {
  token: string;
  storedAt: string;
}

export function getCredentialsPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(xdgConfig, 'xerg', 'credentials.json');
}

export function storeCredentials(token: string): void {
  const credPath = getCredentialsPath();
  const dir = dirname(credPath);
  mkdirSync(dir, { recursive: true });
  const data: StoredCredentials = { token, storedAt: new Date().toISOString() };
  writeFileSync(credPath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function loadStoredCredentials(): string | null {
  const credPath = getCredentialsPath();
  try {
    if (!existsSync(credPath)) return null;
    const raw = readFileSync(credPath, 'utf8');
    const parsed = JSON.parse(raw) as StoredCredentials;
    return parsed.token || null;
  } catch {
    return null;
  }
}

export function clearCredentials(): boolean {
  const credPath = getCredentialsPath();
  try {
    if (!existsSync(credPath)) return false;
    rmSync(credPath);
    return true;
  } catch {
    return false;
  }
}
