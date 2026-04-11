import { type CommandDisplay, formatCommand } from './command-display.js';

export function renderRootHelp(version: string, display: CommandDisplay) {
  return `${display.name} ${version}

Waste intelligence for OpenClaw and Hermes workflows plus local Cursor usage CSVs.

Usage:
  ${formatCommand('<command> [options]', display.prefix)}

Commands:
  audit    Analyze OpenClaw or Hermes logs, or a local Cursor usage CSV.
  doctor   Inspect OpenClaw or Hermes sources, or a local Cursor usage CSV.
  push     Push a cached audit snapshot to the Xerg API.
  login    Authenticate with the Xerg API via browser.
  logout   Remove stored Xerg API credentials.

Global options:
  -h, --help     Show help
  -v, --version  Show version
`;
}

export function renderAuditHelp(commandPrefix: string) {
  return `${formatCommand('audit', commandPrefix)}

Analyze OpenClaw or Hermes logs, or a local Cursor usage CSV, and produce an audit report.

Usage:
  ${formatCommand('audit [options]', commandPrefix)}

Options:
  --runtime <name>            Local runtime to inspect: openclaw or hermes
  --log-file <path>           Explicit local gateway log file to analyze
  --sessions-dir <path>       Explicit local sessions directory to analyze
  --cursor-usage-csv <path>   Local Cursor usage CSV export to analyze
  --since <duration>          Look back window such as 24h, 7d, or 30m
  --compare                   Compare this audit to the newest compatible prior local snapshot
  --json                      Render the report as JSON
  --markdown                  Render the report as Markdown
  --db <path>                 Custom SQLite database path
  --no-db                     Skip local persistence

Remote options (SSH, OpenClaw only):
  --remote <user@host>        SSH target in user@host or user@host:port format
  --remote-log-file <path>    Override the default gateway log path on the remote host
  --remote-sessions-dir <path>  Override the default sessions directory on the remote host
  --remote-config <path>      Path to a JSON file defining multiple remote sources
  --keep-remote-files         Retain pulled files in ~/.xerg/remote-cache/ instead of using a temp directory

Prerequisites:
  SSH remote audits require ssh and rsync on your PATH.

Railway options (OpenClaw only):
  --railway                   Audit a Railway service (uses linked project by default)
  --project <id>              Railway project ID
  --environment <id>          Railway environment ID
  --service <id>              Railway service ID

  Railway audits require the railway CLI on your PATH.

Push options:
  --push                      Push the audit summary to the Xerg API after computing it
  --dry-run                   With --push: print the payload to stdout without sending it
  --verbose                   Print progress updates to stderr while the audit runs

Threshold options:
  --fail-above-waste-rate <n> Exit with code 3 if structural waste rate exceeds threshold (e.g. 0.30)
  --fail-above-waste-usd <n>  Exit with code 3 if waste spend exceeds threshold in USD (e.g. 50)

  -h, --help                  Show help
`;
}

export function renderPushHelp(commandPrefix: string) {
  return `${formatCommand('push', commandPrefix)}

Push a cached audit snapshot to the Xerg API.

Usage:
  ${formatCommand('push [options]', commandPrefix)}

Options:
  --file <path>               Push a specific snapshot file instead of the most recent cached audit
  --dry-run                   Print the payload to stdout without sending it

  -h, --help                  Show help

Authentication:
  Set XERG_API_KEY in your environment, add "apiKey" to ~/.xerg/config.json,
  or run \`${formatCommand('login', commandPrefix)}\` to authenticate via browser.
  Browser login stores a token at ~/.config/xerg/credentials.json by default.
`;
}

export function renderDoctorHelp(commandPrefix: string) {
  return `${formatCommand('doctor', commandPrefix)}

Inspect OpenClaw or Hermes sources, or a local Cursor usage CSV, before you audit.

Usage:
  ${formatCommand('doctor [options]', commandPrefix)}

Options:
  --runtime <name>            Local runtime to inspect: openclaw or hermes
  --log-file <path>           Explicit local gateway log file to inspect
  --sessions-dir <path>       Explicit local sessions directory to inspect
  --cursor-usage-csv <path>   Local Cursor usage CSV export to inspect
  --verbose                   Print progress updates to stderr while doctor runs

Remote options (SSH, OpenClaw only):
  --remote <user@host>        SSH target in user@host or user@host:port format
  --remote-log-file <path>    Override the default gateway log path on the remote host
  --remote-sessions-dir <path>  Override the default sessions directory on the remote host

  SSH checks require ssh and rsync on your PATH.

Railway options (OpenClaw only):
  --railway                   Check a Railway service (uses linked project by default)
  --project <id>              Railway project ID
  --environment <id>          Railway environment ID
  --service <id>              Railway service ID

  Railway checks require the railway CLI on your PATH.

  -h, --help                  Show help
`;
}
