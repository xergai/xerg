import { describe, expect, it } from 'vitest';

import { renderDoctorReport } from '../src/report/render.js';

describe('renderDoctorReport', () => {
  it('includes remote next steps when no local sources are detected', () => {
    const report = renderDoctorReport({
      canAudit: false,
      sources: [],
      defaults: {
        gatewayPattern: '/tmp/openclaw/openclaw-*.log',
        sessionsPattern: '/Users/test/.openclaw/agents/*/sessions/*.jsonl',
      },
      notes: [
        'No OpenClaw gateway logs or session files were detected.',
        'Doctor checks local defaults by default. Use --remote or --railway to inspect remote targets.',
      ],
    });

    expect(report).toContain('## Next steps');
    expect(report).toContain('xerg doctor --remote user@host');
    expect(report).toContain('xerg doctor --railway');
    expect(report).toContain('Remote audits still analyze locally');
  });

  it('renders next steps with the provided command prefix', () => {
    const report = renderDoctorReport(
      {
        canAudit: false,
        sources: [],
        defaults: {
          gatewayPattern: '/tmp/openclaw/openclaw-*.log',
          sessionsPattern: '/Users/test/.openclaw/agents/*/sessions/*.jsonl',
        },
        notes: ['No OpenClaw gateway logs or session files were detected.'],
      },
      { commandPrefix: 'npx @xerg/cli' },
    );

    expect(report).toContain('npx @xerg/cli doctor --log-file');
    expect(report).toContain('npx @xerg/cli doctor --railway');
  });
});
