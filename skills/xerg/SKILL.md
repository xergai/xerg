---
name: xerg
description: Audit OpenClaw and Hermes workflows in dollars. Local-first audits with init, compare mode, OpenClaw remote support, CI gates, and optional hosted follow-up.
homepage: https://xerg.ai
metadata:
  openclaw:
    homepage: https://xerg.ai
    links:
      repository: https://github.com/xergai/xerg
      documentation: https://xerg.ai/docs
    primaryEnv: XERG_API_KEY
    requires:
      anyBins:
        - xerg
        - npx
      config:
        - ~/.xerg/config.json
        - ~/.config/xerg/credentials.json
        - ~/.xerg/remotes.json
    install:
      - kind: node
        package: "@xerg/cli"
        bins:
          - xerg
    envVars:
      - name: XERG_API_KEY
        required: false
        description: Optional Xerg Cloud workspace API key for explicit push, connect, and hosted MCP setup.
      - name: XERG_API_URL
        required: false
        description: Optional override for the Xerg API endpoint; defaults to https://api.xerg.ai.
    dependencies:
      - name: "@xerg/cli"
        type: npm
        repository: https://github.com/xergai/xerg
      - name: ssh
        type: other
        url: https://www.openssh.com/
      - name: rsync
        type: other
        url: https://rsync.samba.org/
      - name: railway
        type: npm
        repository: https://github.com/railwayapp/cli
---

# Xerg

Use `xerg` if it is already installed. If not, use `npx @xerg/cli` with the same arguments.

Xerg audits OpenClaw and Hermes workflows in dollars, not tokens. It reads gateway logs and session transcripts, surfaces confirmed waste plus savings opportunities, and helps you measure fixes with `--compare`.

Local audits need no account. Hosted sync and hosted MCP are optional paid workspace features. No data leaves your machine unless you explicitly push results to Xerg Cloud.

The initial `npx @xerg/cli` path fetches and executes the published npm package. To avoid that runtime fetch, install and review the CLI first with `npm install -g @xerg/cli`, or use a locally built `xerg` binary.

## Quick Start

```bash
xerg init
xerg audit --compare
```

Use direct commands when you need explicit control, non-interactive behavior, JSON output, or CI gates:

```bash
xerg doctor
xerg audit
xerg audit --json
xerg audit --fail-above-waste-rate 0.30
```

## Inputs

Xerg needs one of these source inputs:

- Local OpenClaw data at the default paths:
  - `/tmp/openclaw/openclaw-*.log`
  - `~/.openclaw/agents/*/sessions/*.jsonl`
- Local Hermes data at the default paths:
  - `~/.hermes/logs/agent.log*` with `gateway.log*` fallback
  - `~/.hermes/sessions/`
- Explicit paths via `--log-file` and/or `--sessions-dir`
- An SSH target via `--remote`
- A Railway target via `--railway`
- A multi-source config via `--remote-config`

Additional requirements:

- `--compare` needs at least one previously stored compatible local snapshot
- Pushing needs auth via `XERG_API_KEY`, `~/.xerg/config.json`, or browser credentials from `xerg login`
- SSH audits require `ssh` and `rsync` on your local `PATH` and are OpenClaw-only in this phase
- Railway audits require the `railway` CLI on your local `PATH` and are OpenClaw-only in this phase

## Security And Data Flow

Default `doctor`, `init`, `audit`, `--compare`, `--json`, and `--markdown` commands analyze data on the local machine. They read OpenClaw, Hermes, or Cursor usage files, compute economic summaries, print reports, and may write local SQLite snapshots for future comparison.

Remote OpenClaw audits over SSH, Railway, or `--remote-config` pull selected gateway logs and session files to local temporary storage, then run the same local audit engine. These flows require the corresponding remote transport credentials already configured on the machine.

Hosted sync is opt-in. `connect`, `audit --push`, `push`, and `mcp-setup` use `XERG_API_KEY`, `~/.xerg/config.json`, or browser login credentials only for Xerg Cloud actions. The push payload contains audit totals, daily rollups, findings, recommendations, comparison deltas, and source metadata; it does not include raw prompt or response content, local source file paths, local database paths, or internal finding details.

## Default Flow

1. Start with the default first-run path when you want the fastest local result:

```bash
xerg init
```

- `init` detects local OpenClaw or Hermes data
- it runs a first audit with local snapshot persistence enabled
- it offers optional hosted follow-up after the audit completes
- if no local data is found, it prints explicit local-path commands plus remote OpenClaw-only guidance

2. Detect sources directly when paths or connectivity are uncertain:

```bash
xerg doctor
xerg doctor --verbose
xerg doctor --remote user@host
xerg doctor --railway
```

- `xerg doctor --verbose` shows progress on stderr while Xerg checks local paths or remote transports
- If local defaults are empty, prefer `xerg doctor --remote ...` or `xerg doctor --railway` instead of guessing paths

3. Run a baseline audit explicitly when you want direct control:

```bash
xerg audit
xerg audit --runtime openclaw
xerg audit --runtime hermes
```

4. Choose the right output mode for the task:

```bash
xerg audit
xerg audit --json
xerg audit --markdown
```

- Plain `xerg audit` is best for a human-readable summary
- `xerg audit --json` is best for automation and agents
- `xerg audit --markdown` is best for a shareable report

5. After a workflow or model change, measure the delta:

```bash
xerg audit --compare
xerg audit --compare --json
```

6. Export, push, or hosted-setup only when needed:

```bash
xerg audit --markdown > xerg-audit.md
xerg connect
xerg mcp-setup
xerg audit --push
xerg push
```

- `connect` is the guided hosted path: it reuses existing auth, prompts before browser login when needed, and offers to push the latest audit
- `mcp-setup` prints or writes hosted MCP config for Cursor, Claude Code, Codex, or another client
- local audits and compare remain available if you skip hosted setup

## Source Selection

Local defaults:

```bash
xerg audit
```

If both OpenClaw and Hermes are present locally, pass `--runtime openclaw` or `--runtime hermes` explicitly.

Explicit local paths:

```bash
xerg audit --runtime openclaw --log-file /path/to/openclaw.log
xerg audit --runtime openclaw --sessions-dir /path/to/sessions
xerg audit --runtime hermes --log-file ~/.hermes/logs/agent.log
xerg audit --runtime hermes --sessions-dir ~/.hermes/sessions
```

SSH remote:

```bash
xerg audit --remote user@vps.example.com
xerg audit --remote user@vps.example.com \
  --remote-log-file /opt/openclaw/logs/openclaw.log \
  --remote-sessions-dir /opt/openclaw/sessions
```

Railway:

```bash
xerg audit --railway
xerg audit --railway --project <id> --environment <id> --service <id>
```

Multiple remote sources:

```bash
xerg audit --remote-config ~/.xerg/remotes.json
```

Remote config files use this shape:

```json
{
  "remotes": [
    {
      "name": "prod",
      "transport": "ssh",
      "host": "deploy@prod.example.com"
    },
    {
      "name": "railway-prod",
      "transport": "railway",
      "railway": {
        "projectId": "...",
        "environmentId": "...",
        "serviceId": "..."
      }
    }
  ]
}
```

## CI And Automation

For CI gates, prefer a single command so the audit can still be pushed before threshold failure:

```bash
xerg audit --push --fail-above-waste-rate 0.25 --fail-above-waste-usd 100
```

Common variants:

```bash
xerg audit --fail-above-waste-rate 0.30
xerg audit --fail-above-waste-usd 50
xerg audit --since 24h --fail-above-waste-rate 0.30
```

Documented exit codes:

- `0` success
- `1` runtime error
- `2` no supported local runtime data found
- `3` threshold exceeded

Automation can branch on those codes instead of scraping terminal output.

## Recommendations

When using `--json`, expect a `recommendations` array alongside the audit summary. Each recommendation item includes:

- `id`, `findingId`, `kind`, `title`, `summary`
- `priorityBucket`, `recommendedOrder`, `implementationSurface`, `category`
- `severity`, `confidence`, `effort`
- `estimatedSavingsUsd`, `estimatedSavingsPct`
- `scope`, `scopeId`, `scopeLabel`
- `whereToChange`, `validationPlan`, `actions`

Current recommendation kinds map into the Action queue buckets:

- `fix_now`: `retry-waste`, `loop-waste`
- `test_next`: `context-outlier`, `idle-spend`, `candidate-downgrade`, `cache-carryover`, `max-mode-concentration`
- `watch`: unknown or uncategorized findings

Prefer high-confidence or reversible fixes first. Treat model downgrades, context changes, and Cursor behavior changes as compare-friendly experiments, not guaranteed savings.

## Checks

Before finalizing work that used Xerg:

- Say whether the audit was local, SSH, Railway, or multi-source
- Say whether the output was plain terminal text, JSON, or Markdown
- If `--compare` was used, confirm that it compared against a compatible stored snapshot
- If no data was found, run `xerg doctor` or use explicit source flags rather than guessing
- Say whether results were pushed to the Xerg API
- Distinguish confirmed waste (`retry-waste`, `loop-waste`) from directional opportunities (`context-outlier`, `idle-spend`, `candidate-downgrade`)

## Notes

- `--compare` and `--no-db` cannot be used together
- Xerg is local-first: it stores economic metadata and audit snapshots locally, not prompt or response content
- `XERG_API_KEY` is recommended for CI and non-interactive automation
- If browser auth is needed without the hosted setup flow, use `xerg login`; remove stored credentials with `xerg logout`
- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
