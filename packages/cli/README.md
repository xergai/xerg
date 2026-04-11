# xerg

Audit OpenClaw and Hermes workflows in dollars, compare fixes, and export daily spend and waste trends.

Xerg audits OpenClaw and Hermes workflows in dollars, not tokens. It reads local gateway logs and session transcripts, surfaces daily spend and waste rollups plus the highest-leverage findings, and lets you re-run the same audit with `--compare` so you can see exactly what changed after a fix.

Everything runs locally by default. No account is required for local audits. No data leaves your machine unless you explicitly `--push` results to the Xerg API for a team dashboard.

## 30-second quick start

```bash
npx @xerg/cli doctor
npx @xerg/cli doctor --verbose
npx @xerg/cli audit
npx @xerg/cli audit --compare
```

Prefer a global install?

```bash
npm install -g @xerg/cli
xerg doctor
xerg audit
```

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

First savings test
- Move heartbeat_monitor from Claude Opus to Sonnet
```

## Commands

- Inspect local audit readiness:

```bash
xerg doctor
```

- Run the first audit:

```bash
xerg audit
```

- Compare the latest run against the newest compatible prior local snapshot:

```bash
xerg audit --compare
```

- Audit a specific window:

```bash
xerg audit --since 24h --compare
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

If your local machine has no OpenClaw or Hermes files, inspect remote targets directly instead:

```bash
xerg doctor --remote user@host
xerg doctor --railway
```

Remote SSH and Railway flows are still OpenClaw-only.

## Authentication and config

Push commands resolve credentials in this order:

1. `XERG_API_KEY`
2. `~/.xerg/config.json`
3. `xerg login` browser credentials stored at `~/.config/xerg/credentials.json`

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

`xerg login` stores a browser-issued token in `~/.config/xerg/credentials.json`. That token store is separate from `~/.xerg/config.json`.

## What the audit shows

- Total spend by workflow and model, in dollars
- Daily spend and confirmed waste rollups in UTC
- Observed vs. estimated cost (always labeled)
- Confirmed waste: retry, loop, cache carryover where applicable
- Savings opportunities: context bloat, downgrade candidates, idle, max mode concentration where applicable
- Savings recommendations with suggested A/B tests
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
- `--verbose` prints progress updates to stderr for `xerg doctor` and `xerg audit`, which helps distinguish package install time from CLI runtime.
- If `xerg audit --remote ...` fails before pulling files, verify that both `ssh` and `rsync` are installed and reachable on your `PATH`.
- If `xerg audit --railway` fails immediately, verify that the `railway` CLI is installed, authenticated, and can access the target project.

## Pilot and support

- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
