import { styleText } from 'node:util';

import {
  getCredentialsPath,
  loadStoredCredentials,
  storeCredentials,
} from '../auth/credentials.js';
import { formatCommand } from '../command-display.js';

const DEFAULT_AUTH_URL = 'https://xerg.ai/dashboard/settings';
const DEFAULT_API_URL = 'https://api.xerg.ai';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 300_000; // 5 minutes

export async function runLoginCommand() {
  const existing = loadStoredCredentials();
  if (existing) {
    process.stderr.write(
      `Already logged in. Credentials stored at ${getCredentialsPath()}.\nRun ${colorBold(formatCommand('logout'))} first to re-authenticate.\n`,
    );
    return;
  }

  const apiUrl = process.env.XERG_API_URL || DEFAULT_API_URL;
  const deviceCodeUrl = `${apiUrl}/v1/auth/device-code`;

  let deviceResponse: {
    deviceCode: string;
    userCode: string;
    verificationUrl: string;
    interval?: number;
  };
  try {
    const res = await fetch(deviceCodeUrl, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    deviceResponse = (await res.json()) as typeof deviceResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(
      `Could not start device auth flow (${msg}).\n\nAlternative: create an API key at ${DEFAULT_AUTH_URL}\nand set XERG_API_KEY in your environment.`,
    );
  }

  const verifyUrl = deviceResponse.verificationUrl || DEFAULT_AUTH_URL;
  const pollInterval = (deviceResponse.interval || 2) * 1000;

  process.stderr.write(
    `\nOpen this URL in your browser to authenticate:\n\n  ${colorBold(verifyUrl)}\n\n`,
  );
  if (deviceResponse.userCode) {
    process.stderr.write(`Your code: ${colorBold(deviceResponse.userCode)}\n\n`);
  }
  process.stderr.write('Waiting for authentication...\n');

  await openBrowser(verifyUrl);

  const tokenUrl = `${apiUrl}/v1/auth/device-token`;
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    await sleep(Math.max(pollInterval, POLL_INTERVAL_MS));

    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode: deviceResponse.deviceCode }),
      });

      if (res.status === 200) {
        const data = (await res.json()) as { token: string; teamName?: string };
        storeCredentials(data.token);
        const teamInfo = data.teamName ? ` (team: ${data.teamName})` : '';
        process.stderr.write(
          `\n${colorSuccess('Authenticated successfully')}${teamInfo}.\nCredentials saved to ${getCredentialsPath()}.\n`,
        );
        return;
      }

      if (res.status === 428) {
        // Authorization pending -- keep polling
        continue;
      }

      if (res.status === 410) {
        throw new Error(`Device code expired. Please run \`${formatCommand('login')}\` again.`);
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `Unexpected response: HTTP ${res.status}`);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('expired') || err.message.includes('Unexpected'))
      ) {
        throw err;
      }
      // Network errors during poll -- keep trying
    }
  }

  throw new Error(`Authentication timed out. Please run \`${formatCommand('login')}\` again.`);
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const { platform } = await import('node:os');

  const commands: Record<string, string> = {
    darwin: 'open',
    win32: 'start',
    linux: 'xdg-open',
  };

  const cmd = commands[platform()];
  if (!cmd) return;

  return new Promise((resolve) => {
    exec(`${cmd} ${JSON.stringify(url)}`, () => resolve());
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function colorBold(text: string): string {
  return process.stderr.isTTY ? styleText('bold', text) : text;
}

function colorSuccess(text: string): string {
  return process.stderr.isTTY ? styleText('green', text) : text;
}
