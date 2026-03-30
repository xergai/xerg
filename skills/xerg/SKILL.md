---
name: xerg
description: Audit OpenClaw agent spend in dollars. Use for local or remote audits, before/after comparisons, CI threshold gates, and machine-readable recommendations.
---

# Xerg

Use `xerg` if it is already installed. If not, use `npx @xerg/cli` with the same arguments.

Xerg audits OpenClaw spend in dollars and surfaces both confirmed waste and savings opportunities. It can analyze local files, pull remote sources over SSH or Railway, compare against prior local snapshots, and optionally push audit summaries to the Xerg API.

## Inputs

Xerg needs one of these source inputs:

- Local OpenClaw data at the default paths:
  - `/tmp/openclaw/openclaw-*.log`
  - `~/.openclaw/agents/*/sessions/*.jsonl`
- Explicit paths via `--log-file` and/or `--sessions-dir`
- An SSH target via `--remote`
- A Railway target via `--railway`
- A multi-source config via `--remote-config`

Additional requirements:

- `--compare` needs at least one previously stored compatible local snapshot
- Pushing needs auth via `XERG_API_KEY`, `~/.xerg/config.json`, or `xerg login`
- SSH audits require `ssh` and `rsync` on your local `PATH`
- Railway audits require the `railway` CLI on your local `PATH`

## Default Flow

1. Detect sources first when paths or connectivity are uncertain:

```bash
xerg doctor
xerg doctor --remote user@host
xerg doctor --railway
```

2. Run a baseline audit:

```bash
xerg audit
```

3. Choose the right output mode for the task:

```bash
xerg audit
xerg audit --json
xerg audit --markdown
```

- Plain `xerg audit` is best for a human-readable summary
- `xerg audit --json` is best for automation and agents
- `xerg audit --markdown` is best for a shareable report

4. After a workflow or model change, measure the delta:

```bash
xerg audit --compare
xerg audit --compare --json
```

5. Export or push only when needed:

```bash
xerg audit --markdown > xerg-audit.md
xerg audit --push
xerg push
```

## Source Selection

Local defaults:

```bash
xerg audit
```

Explicit local paths:

```bash
xerg audit --log-file /path/to/openclaw.log
xerg audit --sessions-dir /path/to/sessions
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
- `2` no OpenClaw data found
- `3` threshold exceeded

Automation can branch on those codes instead of scraping terminal output.

## Recommendations

When using `--json`, expect a `recommendations` array alongside the audit summary. Recommendation items include:

- `id`, `findingId`, `kind`, `title`, `description`
- `estimatedSavingsUsd`, `confidence`, `actionType`
- optional `suggestedChange`

Current recommendation kinds fall into two buckets:

- Confirmed waste: `retry-waste`, `loop-waste`
- Savings opportunities or directional findings: `context-outlier`, `idle-spend`, `candidate-downgrade`

Prefer reversible or high-confidence fixes first. Treat model downgrades and context reductions as A/B-test candidates, not guaranteed savings.

## Checks

Before finalizing work that used Xerg:

- Say whether the audit was local, SSH, Railway, or multi-source
- Say whether the output was plain terminal text, JSON, or Markdown
- If `--compare` was used, confirm that it compared against a compatible stored snapshot
- If no data was found, run `xerg doctor` or use explicit source flags rather than guessing
- Say whether results were pushed to the Xerg API

## Notes

- `--compare` and `--no-db` cannot be used together
- Xerg is local-first: it stores economic metadata and audit snapshots locally, not prompt or response content
- `XERG_API_KEY` is recommended for CI and non-interactive automation
- If browser auth is needed locally, use `xerg login`; remove stored credentials with `xerg logout`
- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
