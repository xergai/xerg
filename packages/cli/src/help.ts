import { type CommandDisplay, formatCommand } from './command-display.js';

export function renderRootHelp(version: string, display: CommandDisplay) {
  return `${display.name} ${version}

Waste intelligence for OpenClaw and Hermes workflows.

Usage:
  ${formatCommand('<command> [options]', display.prefix)}

Getting started:
  init       Detect local runtimes, run a first audit, and offer optional cloud follow-up.

Audit and inspect:
  audit    Analyze OpenClaw or Hermes logs, or a local Cursor usage CSV.
  doctor   Inspect OpenClaw or Hermes sources, or a local Cursor usage CSV.

Cloud:
  connect    Authenticate and optionally push your latest audit to Xerg Cloud.
  push     Push a cached audit snapshot to the Xerg API.
  login    Authenticate with the Xerg API via browser.
  logout   Remove stored Xerg API credentials.
  mcp-setup  Generate hosted MCP client configuration.

Global options:
  -h, --help     Show help
  -v, --version  Show version
`;
}

export function renderInitHelp(commandPrefix: string) {
  return `${formatCommand('init', commandPrefix)}

Detect local OpenClaw or Hermes runtimes, run a first audit, and offer optional cloud follow-up.

Usage:
  ${formatCommand('init', commandPrefix)}

Notes:
  - Interactive only in v1
  - Uses local runtime auto-detection
  - Runs a first local audit with snapshot persistence enabled
  - Offers optional Xerg Cloud connect and hosted MCP setup after a successful audit

  -h, --help                  Show help
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
  or run \`${formatCommand('connect', commandPrefix)}\` / \`${formatCommand('login', commandPrefix)}\` to authenticate via browser.
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

export function renderConnectHelp(commandPrefix: string) {
  return `${formatCommand('connect', commandPrefix)}

Authenticate with Xerg Cloud and optionally push the latest audit.

Usage:
  ${formatCommand('connect', commandPrefix)}

Notes:
  - Shows paid-workspace disclosure before hosted setup
  - Reuses existing auth from XERG_API_KEY, ~/.xerg/config.json, or stored browser login
  - Standalone non-interactive mode reports auth status and skips the push prompt
  - When called after ${formatCommand('init', commandPrefix)}, it can push the in-memory audit directly

  -h, --help                  Show help
`;
}

export function renderMcpSetupHelp(commandPrefix: string) {
  return `${formatCommand('mcp-setup', commandPrefix)}

Generate hosted MCP client configuration for Cursor, Claude Code, or another MCP client.

Usage:
  ${formatCommand('mcp-setup', commandPrefix)}

Notes:
  - Interactive in v1 because client selection is prompt-driven
  - Uses the hosted MCP endpoint at https://mcp.xerg.ai/mcp
  - Can write a project-scoped Cursor config when .cursor/ already exists
  - Local audits and compare stay available even if you skip hosted MCP setup

  -h, --help                  Show help
`;
}
