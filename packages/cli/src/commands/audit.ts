import { auditOpenClaw, renderMarkdownSummary, renderTerminalSummary } from '@xergai/core';

export interface AuditCommandOptions {
  logFile?: string;
  sessionsDir?: string;
  since?: string;
  json?: boolean;
  markdown?: boolean;
  db?: string;
  noDb?: boolean;
}

export async function runAuditCommand(options: AuditCommandOptions) {
  const summary = await auditOpenClaw({
    logFile: options.logFile,
    sessionsDir: options.sessionsDir,
    since: options.since,
    dbPath: options.db,
    noDb: options.noDb,
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  if (options.markdown) {
    process.stdout.write(`${renderMarkdownSummary(summary)}\n`);
    return;
  }

  process.stdout.write(`${renderTerminalSummary(summary)}\n`);
}
