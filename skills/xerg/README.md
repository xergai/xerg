# Xerg

Xerg audits OpenClaw workflows in dollars, not tokens. It reads gateway logs and session transcripts, surfaces five spend categories across confirmed waste and savings opportunities, and gives you a concrete first fix to try. Run it again with `--compare` and you can see exactly what changed.

Everything runs locally by default. The CLI is open source (MIT), published on npm as `@xerg/cli`, and the full source is at [github.com/xergai/xerg](https://github.com/xergai/xerg). No account is required for local audits. No data leaves your machine unless you explicitly `--push` results to the Xerg API for a team dashboard.

## Install

```bash
npm install -g @xerg/cli
```

Or run without installing:

```bash
npx @xerg/cli audit
```

## What It Finds

- **Retry waste** — failed calls that burned spend before a later success
- **Loop waste** — runs that exceeded efficient iteration bounds
- **Context bloat** — input token volume far above the workflow baseline
- **Downgrade candidates** — expensive models on operationally simple tasks
- **Idle waste** — recurring heartbeat or monitoring loops worth reviewing

## Quick Start

```bash
xerg doctor
xerg doctor --verbose
xerg audit
xerg audit --compare
```

## Works Where Your Agents Run

- Local machine
- Remote VPS over SSH: `xerg audit --remote user@host`
- Railway: `xerg audit --railway`
- Multiple sources: `xerg audit --remote-config ~/.xerg/remotes.json`

If local defaults are empty, inspect the target directly first with `xerg doctor --remote user@host` or `xerg doctor --railway`.

## CI And Automation

```bash
xerg audit --push --fail-above-waste-rate 0.25
xerg audit --fail-above-waste-usd 100
xerg audit --json
```

## Links

- Docs: [xerg.ai/docs](https://xerg.ai/docs)
- GitHub: [xergai/xerg](https://github.com/xergai/xerg)
- npm: [@xerg/cli](https://www.npmjs.com/package/@xerg/cli)
- Pilot: [xerg.ai/pilot](https://xerg.ai/pilot)
- Support: `query@xerg.ai`
