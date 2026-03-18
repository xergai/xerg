# Xerg

Use this skill to audit the economics of OpenClaw agent workflows in dollars, not tokens.

Xerg reads your local OpenClaw gateway logs and session transcripts, classifies structural waste into five categories with dollar amounts, and surfaces actionable savings tests. The audit runs locally — no account, no data leaves your machine. The initial npx invocation fetches the CLI from npm; after that, all analysis is offline against your local files. Install globally with `npm install -g @xerg/cli` to skip the fetch entirely.

## Commands

Check that Xerg can find your OpenClaw data:

```bash
npx @xerg/cli doctor
```

Run a waste intelligence audit:

```bash
npx @xerg/cli audit
```

Scope the audit to a recent time window:

```bash
npx @xerg/cli audit --since 24h
```

Compare the current audit against the most recent compatible prior snapshot:

```bash
npx @xerg/cli audit --compare
```

Export the report as shareable Markdown:

```bash
npx @xerg/cli audit --markdown > xerg-audit.md
```

Export as JSON for programmatic use:

```bash
npx @xerg/cli audit --json
```

Point Xerg at specific files when data lives outside the defaults:

```bash
npx @xerg/cli audit --log-file /path/to/openclaw.log
npx @xerg/cli audit --sessions-dir /path/to/sessions
```

## Suggested agent workflow

1. Run `npx @xerg/cli doctor` to confirm sources are detected.
2. Run `npx @xerg/cli audit` to get a baseline waste report.
3. Read the "First savings test" section and apply the recommended fix.
4. Run `npx @xerg/cli audit --compare` to measure the before/after delta.
5. Run `npx @xerg/cli audit --markdown > xerg-audit.md` to export the result.

Steps 3–5 can repeat. Each `--compare` run measures against the newest compatible prior snapshot, so the improvement loop compounds.

## What the audit reports

- Total spend by workflow and model, in USD (observed vs. estimated, always labeled)
- Structural waste taxonomy with five categories:
  - **Retry waste** — failed calls that burned spend before a successful retry (high confidence)
  - **Loop waste** — runs that exceeded efficient iteration bounds (high confidence)
  - **Context bloat** — input token volume far above the workflow baseline (directional)
  - **Downgrade candidates** — expensive models on operationally simple tasks (directional, flagged as A/B test)
  - **Idle waste** — recurring heartbeat or monitoring loops worth reviewing (directional)
- A prioritized first savings test with estimated dollar impact
- Before/after deltas when `--compare` is used: spend, waste rate, biggest improvement, biggest regression, and high-confidence finding changes

## Default data paths

Xerg auto-detects OpenClaw data at:

- Gateway logs: `/tmp/openclaw/openclaw-*.log`
- Session transcripts: `~/.openclaw/agents/*/sessions/*.jsonl`

## Notes

- Xerg is local-first. It stores economic metadata and audit snapshots in a local SQLite database. It does not store prompt or response content.
- `--compare` requires local snapshot history. Using `--compare --no-db` together will fail by design.
- Cost per outcome and team dashboards are on the roadmap but out of scope for this release.
- Pilot page: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: query@xerg.ai
