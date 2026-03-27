import { createHash } from 'node:crypto';
import { closeSync, openSync, readSync } from 'node:fs';

export function sha1(input: string) {
  return createHash('sha1').update(input).digest('hex');
}

export function sha1File(path: string) {
  const hash = createHash('sha1');
  const fd = openSync(path, 'r');
  const buffer = Buffer.allocUnsafe(64 * 1024);

  try {
    let bytesRead = 0;
    do {
      bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    closeSync(fd);
  }

  return hash.digest('hex');
}
