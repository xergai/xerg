import { getCredentialsPath, storeCredentials } from './auth/credentials.js';
import { performDeviceLogin } from './commands/login.js';
import { loadPushConfig } from './push/index.js';
import type { PushConfig } from './push/index.js';

export function loadPushConfigOrNull(): PushConfig | null {
  try {
    return loadPushConfig();
  } catch {
    return null;
  }
}

export async function authenticateAndLoadPushConfig(): Promise<PushConfig> {
  const data = await performDeviceLogin();
  storeCredentials(data.token);

  const teamInfo = data.teamName ? ` (team: ${data.teamName})` : '';
  process.stderr.write(
    `\nAuthenticated successfully${teamInfo}.\nCredentials saved to ${getCredentialsPath()}.\n`,
  );

  return loadPushConfig();
}

export function renderCloudDisclaimer(): string {
  return [
    'Xerg Cloud sync and hosted MCP are optional paid workspace features.',
    'Local audits and compare stay free, and you can keep using Xerg locally if you skip this step.',
  ].join('\n');
}

export function renderMcpCredentialSourceMessage(config: PushConfig): string {
  if (config.source === 'stored') {
    return 'Using your stored login token. If hosted MCP requires a workspace API key, create one at xerg.ai/dashboard/settings and set XERG_API_KEY.';
  }

  return 'Using your workspace API key.';
}
