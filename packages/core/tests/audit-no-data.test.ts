import { afterEach, describe, expect, it, vi } from 'vitest';

describe('auditOpenClaw no-data guidance', () => {
  afterEach(() => {
    vi.doUnmock('../src/detect/openclaw.js');
    vi.resetModules();
  });

  it('uses the provided command prefix in the no-data error message', async () => {
    vi.doMock('../src/detect/openclaw.js', () => ({
      detectOpenClawSources: vi.fn(async () => []),
      inspectOpenClawSources: vi.fn(),
    }));

    const { auditOpenClaw } = await import('../src/audit.js');

    await expect(auditOpenClaw({ commandPrefix: 'npx @xerg/cli' })).rejects.toThrow(
      'Run `npx @xerg/cli doctor` or provide --log-file / --sessions-dir.',
    );
  });
});
