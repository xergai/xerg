import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { auditOpenClaw } from '../src/audit.js';

const root = process.cwd();
const gatewayLog = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');
const tempDirs: string[] = [];

function createTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'xerg-keyoverride-'));
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

describe('comparisonKeyOverride', () => {
  it('uses the override as the comparison key instead of path-derived key', async () => {
    const tempDir = createTempDir();
    const tempLog = join(tempDir, 'openclaw-2026-03-06.log');
    writeFileSync(tempLog, readFileSync(gatewayLog, 'utf8'));

    const summary = await auditOpenClaw({
      logFile: tempLog,
      noDb: true,
      comparisonKeyOverride: 'deploy@prod.example.com:/tmp/openclaw:~/.openclaw/agents',
    });

    expect(summary.comparisonKey).toBe('deploy@prod.example.com:/tmp/openclaw:~/.openclaw/agents');
  });

  it('uses the path-derived key when no override is set', async () => {
    const summary = await auditOpenClaw({
      logFile: gatewayLog,
      noDb: true,
    });

    expect(summary.comparisonKey).not.toBe('');
    expect(summary.comparisonKey).not.toContain('@');
  });

  it('remote audit comparisons match across different temp directories', async () => {
    const tempDir1 = createTempDir();
    const tempDir2 = createTempDir();
    const tempLog1 = join(tempDir1, 'openclaw-2026-03-06.log');
    const tempLog2 = join(tempDir2, 'openclaw-2026-03-06.log');
    const logContent = readFileSync(gatewayLog, 'utf8');
    writeFileSync(tempLog1, logContent);
    writeFileSync(tempLog2, logContent);

    const overrideKey = 'deploy@prod.example.com:/tmp/openclaw:~/.openclaw/agents';

    const summary1 = await auditOpenClaw({
      logFile: tempLog1,
      noDb: true,
      comparisonKeyOverride: overrideKey,
    });

    const summary2 = await auditOpenClaw({
      logFile: tempLog2,
      noDb: true,
      comparisonKeyOverride: overrideKey,
    });

    expect(summary1.comparisonKey).toBe(summary2.comparisonKey);
  });
});
