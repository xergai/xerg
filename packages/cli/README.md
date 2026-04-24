# xerg

Audit OpenClaw and Hermes workflows in dollars, compare fixes, and optionally connect hosted follow-up after the first local result.

Xerg runs locally by default. Local audits and `--compare` are free. No account is required for local value, and no data leaves your machine unless you explicitly push results to Xerg Cloud.

## Fastest first run

```bash
npx @xerg/cli init
```

`init` is the default first-run path. It:

- detects local OpenClaw or Hermes data
- runs a first audit and stores the local snapshot
- prints the standard terminal summary
- offers optional hosted follow-up with `connect` and `mcp-setup`

Prefer a global install?

```bash
npm install -g @xerg/cli
xerg init
```

## Direct commands for explicit control

If you already know what you want, skip `init` and use the direct flows:

```bash
npx @xerg/cli doctor
npx @xerg/cli audit
npx @xerg/cli audit --compare
npx @xerg/cli audit --json
npx @xerg/cli audit --markdown
```

Use these when you need non-interactive behavior, CI gates, JSON/Markdown output, or explicit runtime and path flags.

## Bundled skill

The published `@xerg/cli` package includes the portable Xerg skill bundle inside the installed package at:

```text
skills/xerg/SKILL.md
```

For a local project install, that usually resolves to:

```text
node_modules/@xerg/cli/skills/xerg/SKILL.md
```

For a global install, the same file lives inside the global npm package directory instead. That file is a packaged copy of the canonical repo skill at [`skills/xerg/SKILL.md`](../../skills/xerg/SKILL.md). Use it if your agent platform imports skills from disk; installing the npm package does not automatically register the skill with every agent product.

## Supported runtime

`@xerg/cli` supports Node `22` and `24`.

If you are developing or releasing from this repo, `.nvmrc` pins the default toolchain to Node `24.14.0`.

## Sample output

```text
Total spend: $148.00
Observed spend: $105.00
Estimated spend: $43.00

Waste taxonomy
- Retry waste: $12.40
- Context bloat: $18.90
- Loop waste: $7.10
- Downgrade candidates: $4.80
- Idle waste: $3.37

Action queue
Fix now
- Reduce retry waste in workspace: $12.40 (high)
Test next
- Evaluate a cheaper model for heartbeat_monitor: $4.80 (low)
Watch
- none
How to validate: `xerg audit --compare --push`
```

## Common commands

```bash
xerg init
xerg audit --compare
xerg connect
xerg mcp-setup
```

More explicit examples:

```bash
xerg doctor --runtime openclaw
xerg audit --runtime hermes
xerg audit --since 24h --compare
xerg audit --push
xerg push
```

## Works where your agent data lives

- Local machine: yes
- VPS or remote server: OpenClaw only in this phase
- If OpenClaw runs remotely, you can audit it from your local machine with `xerg audit --remote user@host`
- Or point Xerg at exported files directly with flags

Remote prerequisites:

- SSH audits require `ssh` and `rsync` on your `PATH`
- Railway audits require the `railway` CLI on your `PATH`

## Default paths

By default, Xerg checks:

- OpenClaw: `/tmp/openclaw/openclaw-*.log`
- OpenClaw: `~/.openclaw/agents/*/sessions/*.jsonl`
- Hermes: `~/.hermes/logs/agent.log*` with `gateway.log*` fallback
- Hermes: `~/.hermes/sessions/`

Use explicit paths when needed:

```bash
xerg audit --runtime openclaw --log-file /path/to/openclaw.log
xerg audit --runtime openclaw --sessions-dir /path/to/sessions
xerg audit --runtime hermes --log-file ~/.hermes/logs/agent.log
xerg audit --runtime hermes --sessions-dir ~/.hermes/sessions
```

If only one supported local runtime is present, Xerg auto-selects it. If both OpenClaw and Hermes are present locally, rerun with `--runtime openclaw` or `--runtime hermes`.

If local defaults are empty, `xerg init` prints next-step commands for explicit local paths plus remote OpenClaw-only flows:

```bash
xerg audit --remote user@host
xerg audit --railway
```

## Hosted follow-up

Hosted sync and hosted MCP are optional paid workspace features. The simplest hosted path is:

```bash
xerg connect
xerg mcp-setup
```

- `connect` resolves auth from `XERG_API_KEY`, `~/.xerg/config.json`, or stored browser credentials, then offers to push the latest audit
- `mcp-setup` prints or writes hosted MCP config for Cursor, Claude Code, Codex, or another client

You can skip both and keep using local audits and compare.

## Authentication and config

Push commands resolve credentials in this order:

1. `XERG_API_KEY`
2. `~/.xerg/config.json`
3. stored browser credentials from `xerg login` at `~/.config/xerg/credentials.json`

Optional API URL overrides:

- `XERG_API_URL`
- `apiUrl` in `~/.xerg/config.json`

Example `~/.xerg/config.json`:

```json
{
  "apiKey": "sk_live_or_test_key",
  "apiUrl": "https://api.xerg.ai"
}
```

`xerg connect` is the guided hosted path. `xerg login` remains available when you want browser auth without the push prompt.

`xerg login` stores a browser-issued token in `~/.config/xerg/credentials.json`. That token store is separate from `~/.xerg/config.json`. Hosted MCP works best with a workspace API key.

## What the audit shows

- Total spend by workflow and model, in dollars
- Daily spend and confirmed waste rollups in UTC
- Observed vs. estimated cost (always labeled)
- Confirmed waste: retry, loop, cache carryover where applicable
- Savings opportunities: context bloat, downgrade candidates, idle, max mode concentration where applicable
- Ranked recommendations with where-to-change guidance and compare validation steps
- Before/after deltas on re-audit

## Privacy

Xerg v0 stores economic metadata and audit summaries locally. It does not store prompt or response content.

## Exit codes

- `0`: success
- `1`: general failure
- `2`: no supported local runtime data was found
- `3`: a `--fail-above-waste-rate` or `--fail-above-waste-usd` threshold was exceeded

## Troubleshooting

- `better-sqlite3` is a native dependency. If install fails, retry on a supported Node version and make sure standard native build tooling is available for your platform.
- `xerg init` is interactive in v1. Use direct `doctor` / `audit` commands when you need non-interactive control.
- `--verbose` prints progress updates to stderr for `xerg doctor` and `xerg audit`, which helps distinguish package install time from CLI runtime.
- If `xerg audit --remote ...` fails before pulling files, verify that both `ssh` and `rsync` are installed and reachable on your `PATH`.
- If `xerg audit --railway` fails immediately, verify that the `railway` CLI is installed, authenticated, and can access the target project.

## Pilot and support

- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
