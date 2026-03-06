#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';

import { runAuditCommand } from './commands/audit.js';
import { runDoctorCommand } from './commands/doctor.js';

const program = new Command();

program.name('xerg').description('Waste intelligence for OpenClaw workflows.').version('0.1.0');

program
  .command('audit')
  .description('Analyze OpenClaw logs and produce a waste intelligence report.')
  .option('--log-file <path>', 'explicit OpenClaw gateway log file to analyze')
  .option('--sessions-dir <path>', 'explicit OpenClaw sessions directory to analyze')
  .option('--since <duration>', 'look back window such as 24h, 7d, or 30m')
  .option('--json', 'render the report as JSON')
  .option('--markdown', 'render the report as Markdown')
  .option('--db <path>', 'custom SQLite database path')
  .option('--no-db', 'skip local persistence')
  .action(async (options) => {
    if (options.json && options.markdown) {
      throw new Error('Use either --json or --markdown, not both.');
    }

    await runAuditCommand(options);
  });

program
  .command('doctor')
  .description('Inspect your machine for OpenClaw sources and audit readiness.')
  .option('--log-file <path>', 'explicit OpenClaw gateway log file to inspect')
  .option('--sessions-dir <path>', 'explicit OpenClaw sessions directory to inspect')
  .action(async (options) => {
    await runDoctorCommand(options);
  });

program.configureOutput({
  outputError: (text, write) => {
    write(`${pc.red(text)}\n`);
  },
});

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${pc.red(`xerg failed: ${message}`)}\n`);
  process.exitCode = 1;
});
