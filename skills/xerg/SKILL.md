# Xerg

Use this skill to audit the economics of OpenClaw agent workflows in dollars, not tokens.

Xerg reads your local OpenClaw gateway logs and session transcripts, classifies structural waste into five categories with dollar amounts, and surfaces actionable recommendations with estimated savings. Audits run locally by default — no data leaves your machine unless you explicitly push results to the Xerg API. Install globally with `npm install -g @xerg/cli` to skip the npx fetch.

## Commands

Check that Xerg can find your OpenClaw data:

```bash
xerg doctor
```

Run a waste intelligence audit:

```bash
xerg audit
```

Scope the audit to a recent time window:

```bash
xerg audit --since 24h
```

Compare the current audit against the most recent compatible prior snapshot:

```bash
xerg audit --compare
```

Export the report as shareable Markdown:

```bash
xerg audit --markdown > xerg-audit.md
```

Export as JSON for programmatic use (includes recommendations):

```bash
xerg audit --json
```

Point Xerg at specific files when data lives outside the defaults:

```bash
xerg audit --log-file /path/to/openclaw.log
xerg audit --sessions-dir /path/to/sessions
```

### Authentication

Authenticate via browser (stores credentials locally):

```bash
xerg login
```

Remove stored credentials:

```bash
xerg logout
```

You can also set `XERG_API_KEY` as an environment variable — this takes precedence over stored credentials and is recommended for CI.

### Pushing audit results

Push the audit to the Xerg API as part of the audit:

```bash
xerg audit --push
```

Preview the push payload without sending:

```bash
xerg audit --push --dry-run
```

Push the most recent cached audit snapshot without re-running the audit:

```bash
xerg push
```

Push a specific snapshot file:

```bash
xerg push --file /path/to/snapshot.json
```

Preview what would be sent:

```bash
xerg push --dry-run
```

### Threshold flags for CI gating

Exit with code 3 if structural waste rate exceeds a threshold:

```bash
xerg audit --fail-above-waste-rate 0.30
```

Exit with code 3 if waste spend exceeds a USD threshold:

```bash
xerg audit --fail-above-waste-usd 50
```

Composable with other flags:

```bash
xerg audit --remote user@host --push --fail-above-waste-rate 0.25
```

## Suggested agent workflow

1. Run `xerg doctor` to confirm sources are detected.
2. Run `xerg audit --json` to get a structured baseline with recommendations.
3. Parse the `recommendations` array and apply the highest-impact fix.
4. Run `xerg audit --compare` to measure the before/after delta.
5. Run `xerg audit --markdown > xerg-audit.md` to export the result.

Steps 3–5 can repeat. Each `--compare` run measures against the newest compatible prior snapshot, so the improvement loop compounds.

### Agent-driven optimization loop

For automated optimization, an agent can run Xerg in a loop:

```bash
# 1. Audit and capture structured output
AUDIT=$(xerg audit --json)

# 2. Parse recommendations (the JSON includes a 'recommendations' array)
# Each recommendation has: id, findingId, kind, title, description,
# estimatedSavingsUsd, confidence, actionType, suggestedChange

# 3. Apply the fix (agent decides whether/how to act)

# 4. Re-audit with comparison to verify improvement
xerg audit --compare --json

# 5. Push results to the team dashboard
xerg audit --push
```

In CI, use threshold flags so the pipeline fails if waste is too high:

```bash
xerg audit --push --fail-above-waste-rate 0.25 --fail-above-waste-usd 100
```

## JSON output with recommendations

When using `--json`, the output includes a `recommendations` array alongside the audit summary. Each recommendation has this structure:

```json
{
  "id": "string",
  "findingId": "string",
  "kind": "retry-waste | loop-waste | context-outlier | candidate-downgrade | idle-spend",
  "title": "string",
  "description": "string",
  "estimatedSavingsUsd": 0.0,
  "confidence": "high | medium | low",
  "actionType": "model-switch | cache-config | prompt-trim | dedup | other",
  "suggestedChange": {}
}
```

Recommendations are suggestions, not commands. Xerg tells the agent what to change and estimates savings — the agent decides whether to act.

## What the audit reports

- Total spend by workflow and model, in USD (observed vs. estimated, always labeled)
- Structural waste taxonomy with five categories:
  - **Retry waste** — failed calls that burned spend before a successful retry (high confidence)
  - **Loop waste** — runs that exceeded efficient iteration bounds (high confidence)
  - **Context bloat** — input token volume far above the workflow baseline (directional)
  - **Downgrade candidates** — expensive models on operationally simple tasks (directional, flagged as A/B test)
  - **Idle waste** — recurring heartbeat or monitoring loops worth reviewing (directional)
- A prioritized first savings test with estimated dollar impact
- Machine-readable recommendations with estimated savings per finding
- Before/after deltas when `--compare` is used: spend, waste rate, biggest improvement, biggest regression, and high-confidence finding changes

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Runtime error |
| 2 | No data found |
| 3 | Threshold exceeded (`--fail-above-waste-rate` or `--fail-above-waste-usd`) |

Exit codes are stable API — agents can branch on them without parsing output.

## Default data paths

Xerg auto-detects OpenClaw data at:

- Gateway logs: `/tmp/openclaw/openclaw-*.log`
- Session transcripts: `~/.openclaw/agents/*/sessions/*.jsonl`

## Notes

- Xerg is local-first. It stores economic metadata and audit snapshots in a local SQLite database. It does not store prompt or response content.
- `--compare` requires local snapshot history. Using `--compare --no-db` together will fail by design.
- `XERG_API_KEY` env var takes precedence over stored credentials and `~/.xerg/config.json`.
- `xerg login` and `xerg logout` are the only interactive commands. Everything else works non-interactively.
- Pilot page: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: query@xerg.ai
