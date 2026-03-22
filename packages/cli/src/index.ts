#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { styleText } from 'node:util';

import { runAuditCommand } from './commands/audit.js';
import { runDoctorCommand } from './commands/doctor.js';

type AuditCliOptions = {
  logFile?: string;
  sessionsDir?: string;
  since?: string;
  compare?: boolean;
  json?: boolean;
  markdown?: boolean;
  db?: string;
  noDb?: boolean;
  remote?: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
  remoteConfig?: string;
  keepRemoteFiles?: boolean;
  railway?: boolean;
  railwayProject?: string;
  railwayEnvironment?: string;
  railwayService?: string;
  push?: boolean;
  dryRun?: boolean;
};

type DoctorCliOptions = {
  logFile?: string;
  sessionsDir?: string;
  remote?: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
  railway?: boolean;
  railwayProject?: string;
  railwayEnvironment?: string;
  railwayService?: string;
};

const VERSION = readVersion();
const argv = process.argv.slice(2);

const command = argv[0];

if (!command || command === '--help' || command === '-h' || command === 'help') {
  process.stdout.write(renderRootHelp());
  process.exit(0);
}

if (command === '--version' || command === '-v' || command === 'version') {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${colorError(`xerg failed: ${message}`)}\n`);
  process.exitCode = 1;
});

async function run() {
  if (command === 'audit') {
    const options = parseAuditOptions(argv.slice(1));
    if (options.json && options.markdown) {
      throw new Error('Use either --json or --markdown, not both.');
    }

    await runAuditCommand(options);
    return;
  }

  if (command === 'doctor') {
    const options = parseDoctorOptions(argv.slice(1));
    await runDoctorCommand(options);
    return;
  }

  throw new Error(`Unknown command "${command}". Run \`xerg --help\` to see available commands.`);
}

function parseAuditOptions(raw: string[]) {
  const argv = expandEqualsArgs(raw);
  const options: AuditCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        process.stdout.write(renderAuditHelp());
        process.exit(0);
        break;
      case '--log-file':
        options.logFile = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--sessions-dir':
        options.sessionsDir = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--since':
        options.since = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--db':
        options.db = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--compare':
        options.compare = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--markdown':
        options.markdown = true;
        break;
      case '--no-db':
        options.noDb = true;
        break;
      case '--remote':
        options.remote = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote-log-file':
        options.remoteLogFile = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote-sessions-dir':
        options.remoteSessionsDir = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote-config':
        options.remoteConfig = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--keep-remote-files':
        options.keepRemoteFiles = true;
        break;
      case '--railway':
        options.railway = true;
        break;
      case '--project':
        options.railwayProject = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--environment':
        options.railwayEnvironment = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--service':
        options.railwayService = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--push':
        options.push = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown audit option "${arg}". Run \`xerg audit --help\` for usage.`);
    }
  }

  return options;
}

function parseDoctorOptions(raw: string[]) {
  const argv = expandEqualsArgs(raw);
  const options: DoctorCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        process.stdout.write(renderDoctorHelp());
        process.exit(0);
        break;
      case '--log-file':
        options.logFile = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--sessions-dir':
        options.sessionsDir = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote':
        options.remote = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote-log-file':
        options.remoteLogFile = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--remote-sessions-dir':
        options.remoteSessionsDir = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--railway':
        options.railway = true;
        break;
      case '--project':
        options.railwayProject = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--environment':
        options.railwayEnvironment = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--service':
        options.railwayService = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      default:
        throw new Error(`Unknown doctor option "${arg}". Run \`xerg doctor --help\` for usage.`);
    }
  }

  return options;
}

function expandEqualsArgs(argv: string[]): string[] {
  const result: string[] = [];
  for (const arg of argv) {
    const eqIndex = arg.indexOf('=');
    if (eqIndex > 0 && arg.startsWith('--')) {
      result.push(arg.slice(0, eqIndex), arg.slice(eqIndex + 1));
    } else {
      result.push(arg);
    }
  }
  return result;
}

function readValue(flag: string, value: string | undefined) {
  if (!value || value.startsWith('-')) {
    throw new Error(`The ${flag} flag needs a value.`);
  }

  return value;
}

function renderRootHelp() {
  return `xerg ${VERSION}

Waste intelligence for OpenClaw workflows.

Usage:
  xerg <command> [options]

Commands:
  audit   Analyze OpenClaw logs and produce a waste intelligence report.
  doctor  Inspect your machine for OpenClaw sources and audit readiness.

Global options:
  -h, --help     Show help
  -v, --version  Show version
`;
}

function renderAuditHelp() {
  return `xerg audit

Analyze OpenClaw logs and produce a waste intelligence report.

Usage:
  xerg audit [options]

Options:
  --log-file <path>           Explicit OpenClaw gateway log file to analyze
  --sessions-dir <path>       Explicit OpenClaw sessions directory to analyze
  --since <duration>          Look back window such as 24h, 7d, or 30m
  --compare                   Compare this audit to the newest compatible prior local snapshot
  --json                      Render the report as JSON
  --markdown                  Render the report as Markdown
  --db <path>                 Custom SQLite database path
  --no-db                     Skip local persistence

Remote options (SSH):
  --remote <user@host>        SSH target in user@host or user@host:port format
  --remote-log-file <path>    Override the default gateway log path on the remote host
  --remote-sessions-dir <path>  Override the default sessions directory on the remote host
  --remote-config <path>      Path to a JSON file defining multiple remote sources
  --keep-remote-files         Retain pulled files in ~/.xerg/remote-cache/ instead of using a temp directory

Railway options:
  --railway                   Audit a Railway service (uses linked project by default)
  --project <id>              Railway project ID
  --environment <id>          Railway environment ID
  --service <id>              Railway service ID

Push options:
  --push                      Push the audit summary to the Xerg API after computing it
  --dry-run                   With --push: print the payload to stdout without sending it

  -h, --help                  Show help
`;
}

function renderDoctorHelp() {
  return `xerg doctor

Inspect your machine for OpenClaw sources and audit readiness.

Usage:
  xerg doctor [options]

Options:
  --log-file <path>           Explicit OpenClaw gateway log file to inspect
  --sessions-dir <path>       Explicit OpenClaw sessions directory to inspect

Remote options (SSH):
  --remote <user@host>        SSH target in user@host or user@host:port format
  --remote-log-file <path>    Override the default gateway log path on the remote host
  --remote-sessions-dir <path>  Override the default sessions directory on the remote host

Railway options:
  --railway                   Check a Railway service (uses linked project by default)
  --project <id>              Railway project ID
  --environment <id>          Railway environment ID
  --service <id>              Railway service ID

  -h, --help                  Show help
`;
}

function colorError(message: string) {
  return process.stderr.isTTY ? styleText('red', message) : message;
}

function readVersion() {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}
