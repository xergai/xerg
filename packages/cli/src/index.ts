#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { styleText } from 'node:util';

import { formatCommand, resolveCommandDisplay } from './command-display.js';
import { runAuditCommand } from './commands/audit.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runLoginCommand } from './commands/login.js';
import { runLogoutCommand } from './commands/logout.js';
import { runPushCommand } from './commands/push.js';
import { NoDataError } from './errors.js';
import { renderAuditHelp, renderDoctorHelp, renderPushHelp, renderRootHelp } from './help.js';

type AuditCliOptions = {
  logFile?: string;
  sessionsDir?: string;
  cursorUsageCsv?: string;
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
  failAboveWasteRate?: number;
  failAboveWasteUsd?: number;
  verbose?: boolean;
};

type PushCliOptions = {
  file?: string;
  dryRun?: boolean;
};

type DoctorCliOptions = {
  logFile?: string;
  sessionsDir?: string;
  cursorUsageCsv?: string;
  remote?: string;
  remoteLogFile?: string;
  remoteSessionsDir?: string;
  railway?: boolean;
  railwayProject?: string;
  railwayEnvironment?: string;
  railwayService?: string;
  verbose?: boolean;
};

const VERSION = readVersion();
const argv = process.argv.slice(2);
const commandDisplay = resolveCommandDisplay();

const command = argv[0];

if (!command || command === '--help' || command === '-h' || command === 'help') {
  process.stdout.write(renderRootHelp(VERSION, commandDisplay));
  process.exit(0);
}

if (command === '--version' || command === '-v' || command === 'version') {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${colorError(`${commandDisplay.name} failed: ${message}`)}\n`);
  process.exitCode = error instanceof NoDataError ? 2 : 1;
});

async function run() {
  if (command === 'audit') {
    const options = parseAuditOptions(argv.slice(1));
    if (options.json && options.markdown) {
      throw new Error('Use either --json or --markdown, not both.');
    }

    await runAuditCommand({
      ...options,
      commandPrefix: commandDisplay.prefix,
    });
    return;
  }

  if (command === 'doctor') {
    const options = parseDoctorOptions(argv.slice(1));
    await runDoctorCommand({
      ...options,
      commandPrefix: commandDisplay.prefix,
    });
    return;
  }

  if (command === 'push') {
    const options = parsePushOptions(argv.slice(1));
    await runPushCommand(options);
    return;
  }

  if (command === 'login') {
    await runLoginCommand();
    return;
  }

  if (command === 'logout') {
    runLogoutCommand();
    return;
  }

  throw new Error(
    `Unknown command "${command}". Run \`${formatCommand('--help', commandDisplay.prefix)}\` to see available commands.`,
  );
}

function parseAuditOptions(raw: string[]) {
  const argv = expandEqualsArgs(raw);
  const options: AuditCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        process.stdout.write(renderAuditHelp(commandDisplay.prefix));
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
      case '--cursor-usage-csv':
        options.cursorUsageCsv = readValue(arg, argv[index + 1]);
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
      case '--verbose':
        options.verbose = true;
        break;
      case '--fail-above-waste-rate':
        options.failAboveWasteRate = readFloat(arg, argv[index + 1]);
        index += 1;
        break;
      case '--fail-above-waste-usd':
        options.failAboveWasteUsd = readFloat(arg, argv[index + 1]);
        index += 1;
        break;
      default:
        throw new Error(
          `Unknown audit option "${arg}". Run \`${formatCommand(['audit', '--help'], commandDisplay.prefix)}\` for usage.`,
        );
    }
  }

  return options;
}

function parsePushOptions(raw: string[]) {
  const argv = expandEqualsArgs(raw);
  const options: PushCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        process.stdout.write(renderPushHelp(commandDisplay.prefix));
        process.exit(0);
        break;
      case '--file':
        options.file = readValue(arg, argv[index + 1]);
        index += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new Error(
          `Unknown push option "${arg}". Run \`${formatCommand(['push', '--help'], commandDisplay.prefix)}\` for usage.`,
        );
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
        process.stdout.write(renderDoctorHelp(commandDisplay.prefix));
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
      case '--cursor-usage-csv':
        options.cursorUsageCsv = readValue(arg, argv[index + 1]);
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
      case '--verbose':
        options.verbose = true;
        break;
      default:
        throw new Error(
          `Unknown doctor option "${arg}". Run \`${formatCommand(['doctor', '--help'], commandDisplay.prefix)}\` for usage.`,
        );
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

function readFloat(flag: string, value: string | undefined): number {
  const raw = readValue(flag, value);
  const num = Number.parseFloat(raw);
  if (Number.isNaN(num)) {
    throw new Error(`The ${flag} flag requires a numeric value, got "${raw}".`);
  }
  return num;
}

function colorError(message: string) {
  return process.stderr.isTTY ? styleText('red', message) : message;
}

function readVersion() {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}
