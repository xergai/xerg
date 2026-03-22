import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface PushConfig {
  apiKey: string;
  apiUrl: string;
}

const DEFAULT_API_URL = 'https://api.xerg.ai';
const CONFIG_PATH = join(homedir(), '.xerg', 'config.json');

export function loadPushConfig(): PushConfig {
  const envKey = process.env.XERG_API_KEY;
  const envUrl = process.env.XERG_API_URL;

  if (envKey) {
    return {
      apiKey: envKey,
      apiUrl: envUrl || DEFAULT_API_URL,
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { apiKey?: string; apiUrl?: string };

    if (parsed.apiKey) {
      return {
        apiKey: parsed.apiKey,
        apiUrl: envUrl || parsed.apiUrl || DEFAULT_API_URL,
      };
    }
  } catch {
    // config file doesn't exist or isn't valid JSON — fall through
  }

  throw new Error(
    `No API key configured. Set XERG_API_KEY or add "apiKey" to ${CONFIG_PATH}.\nGet your key at https://xerg.ai/dashboard/settings`,
  );
}
