import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { auditCursorUsageCsv, auditOpenClaw } from '../src/audit.js';
import {
  renderDoctorReport,
  renderMarkdownSummary,
  renderTerminalSummary,
} from '../src/report/render.js';

const root = process.cwd();
const cursorUsageCsv = join(root, 'fixtures', 'cursor', 'usage-sample.csv');
const gatewayLog = join(root, 'fixtures', 'openclaw', 'gateway', 'openclaw-2026-03-06.log');

describe('renderDoctorReport', () => {
  it('includes remote next steps when no local sources are detected', () => {
    const report = renderDoctorReport({
      canAudit: false,
      mode: 'none',
      runtime: null,
      sources: [],
      defaults: [
        {
          runtime: 'openclaw',
          gatewayPattern: '/tmp/openclaw/openclaw-*.log',
          sessionsPattern: '/Users/test/.openclaw/agents/*/sessions/*.jsonl',
        },
        {
          runtime: 'hermes',
          gatewayPattern: '/Users/test/.hermes/logs/agent.log* (fallback: gateway.log*)',
          sessionsPattern: '/Users/test/.hermes/sessions/**/*.{json,jsonl}',
        },
      ],
      notes: [
        'No supported local runtime sources were detected.',
        'Auto-detection checked both OpenClaw and Hermes local defaults.',
      ],
    });

    expect(report).toContain('## Next steps');
    expect(report).toContain('xerg doctor --runtime openclaw');
    expect(report).toContain('xerg doctor --runtime hermes');
    expect(report).toContain('Remote audits still analyze locally');
  });

  it('renders next steps with the provided command prefix', () => {
    const report = renderDoctorReport(
      {
        canAudit: false,
        mode: 'none',
        runtime: null,
        sources: [],
        defaults: [
          {
            runtime: 'openclaw',
            gatewayPattern: '/tmp/openclaw/openclaw-*.log',
            sessionsPattern: '/Users/test/.openclaw/agents/*/sessions/*.jsonl',
          },
          {
            runtime: 'hermes',
            gatewayPattern: '/Users/test/.hermes/logs/agent.log* (fallback: gateway.log*)',
            sessionsPattern: '/Users/test/.hermes/sessions/**/*.{json,jsonl}',
          },
        ],
        notes: ['No supported local runtime sources were detected.'],
      },
      { commandPrefix: 'npx @xerg/cli' },
    );

    expect(report).toContain('npx @xerg/cli doctor --runtime hermes --log-file');
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

  it('renders the new Action queue block and compare command for runtime audits', async () => {
    const summary = await auditOpenClaw({
      logFile: gatewayLog,
      noDb: true,
    });

    const terminal = renderTerminalSummary(summary);
    const markdown = renderMarkdownSummary(summary);

    expect(terminal).toContain('## Action queue');
    expect(terminal).toContain('Fix now');
    expect(terminal).toContain('Test next');
    expect(terminal).toContain('How to validate: `xerg audit --compare --push`');
    expect(markdown).toContain('## Action queue');
  });
});
