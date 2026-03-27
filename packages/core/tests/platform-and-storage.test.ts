import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDb } from '../src/db/client.js';
import { listStoredAuditSummaries } from '../src/db/read.js';
import { ensureAppPaths, getAppPaths } from '../src/utils/paths.js';

const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'xerg-core-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('app paths', () => {
  it('resolves default paths without creating directories until explicitly asked', () => {
    const home = createTempDir();
    const previousHome = process.env.HOME;
    const previousData = process.env.XDG_DATA_HOME;
    const previousConfig = process.env.XDG_CONFIG_HOME;
    const previousCache = process.env.XDG_CACHE_HOME;

    process.env.HOME = home;
    process.env.XDG_DATA_HOME = join(home, '.local', 'share');
    process.env.XDG_CONFIG_HOME = join(home, '.config');
    process.env.XDG_CACHE_HOME = join(home, '.cache');

    try {
      const paths = getAppPaths();

      expect(existsSync(paths.data)).toBe(false);
      expect(existsSync(paths.config)).toBe(false);
      expect(existsSync(paths.cache)).toBe(false);

      ensureAppPaths();

      expect(existsSync(paths.data)).toBe(true);
      expect(existsSync(paths.config)).toBe(true);
      expect(existsSync(paths.cache)).toBe(true);
    } finally {
      restoreEnv('HOME', previousHome);
      restoreEnv('XDG_DATA_HOME', previousData);
      restoreEnv('XDG_CONFIG_HOME', previousConfig);
      restoreEnv('XDG_CACHE_HOME', previousCache);
    }
  });
});

describe('stored audit snapshots', () => {
  it('warns when an unreadable snapshot is skipped', () => {
    const tempDir = createTempDir();
    const dbPath = join(tempDir, 'xerg.sqlite');
    const { sqlite } = createDb(dbPath);
    sqlite
      .prepare(
        `
          INSERT INTO audit_snapshots (
            id,
            created_at,
            summary_json
          ) VALUES (?, ?, ?)
        `,
      )
      .run('broken-audit', '2026-03-01T00:00:00.000Z', '{not json');
    sqlite.close();

    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const summaries = listStoredAuditSummaries(dbPath);

      expect(summaries).toEqual([]);
      expect(stderrWrite).toHaveBeenCalledWith(
        expect.stringContaining('Warning: skipping unreadable audit snapshot broken-audit:'),
      );
    } finally {
      stderrWrite.mockRestore();
    }
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
