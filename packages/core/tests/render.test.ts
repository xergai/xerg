import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { auditCursorUsageCsv } from '../src/audit.js';
import {
  renderDoctorReport,
  renderMarkdownSummary,
  renderTerminalSummary,
} from '../src/report/render.js';

const root = process.cwd();
const cursorUsageCsv = join(root, 'fixtures', 'cursor', 'usage-sample.csv');

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

  it('renders a daily trend block when the audit spans more than one day', async () => {
    const summary = await auditCursorUsageCsv({
      cursorUsageCsv,
      noDb: true,
    });

    expect(renderTerminalSummary(summary)).toContain('## Daily trend');
    expect(renderTerminalSummary(summary)).toContain('2026-04-03:');
    expect(renderMarkdownSummary(summary)).toContain('## Daily trend');
    expect(renderMarkdownSummary(summary)).toContain('2026-04-01:');
  });
});
