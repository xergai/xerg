# xerg

Audit OpenClaw agent spend, waste, and before/after improvements.

Xerg audits OpenClaw workflows in dollars, not tokens. It reads your gateway logs and session transcripts, shows where money is leaking, classifies waste into five categories, and lets you re-run the same audit with `--compare` so you can see what changed after a fix.

## 30-second quick start

```bash
npx @xerg/cli doctor
npx @xerg/cli audit
npx @xerg/cli audit --compare
```

Prefer a global install?

```bash
npm install -g @xerg/cli
xerg doctor
xerg audit
```

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

## Works where your OpenClaw logs live

- Local machine: yes
- VPS or remote server: yes
- If OpenClaw runs remotely, SSH into the machine where the logs live and run Xerg there
- Or point Xerg at exported files directly with flags

## Default paths

By default, Xerg checks:

- `/tmp/openclaw/openclaw-*.log`
- `~/.openclaw/agents/*/sessions/*.jsonl`

Use explicit paths when needed:

```bash
xerg audit --log-file /path/to/openclaw.log
xerg audit --sessions-dir /path/to/sessions
```

## What the audit shows

- Total spend by workflow and model, in dollars
- Observed vs. estimated cost (always labeled)
- Structural waste: retry, context bloat, loop, downgrade candidates, idle
- Savings recommendations with suggested A/B tests
- Before/after deltas on re-audit

## Privacy

Xerg v0 stores economic metadata and audit summaries locally. It does not store prompt or response content.

## Pilot and support

- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
