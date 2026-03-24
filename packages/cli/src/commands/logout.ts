import { clearCredentials, getCredentialsPath } from '../auth/credentials.js';

export function runLogoutCommand() {
  const removed = clearCredentials();

  if (removed) {
    process.stderr.write(`Credentials removed from ${getCredentialsPath()}.\n`);
  } else {
    process.stderr.write('No stored credentials found. Already logged out.\n');
  }
}
