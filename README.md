# Xerg

Xerg audits OpenClaw and Hermes spend in dollars, not tokens. Local audits and `--compare` are free and local-first. Hosted sync and hosted MCP are optional paid workspace features.

This repository contains:

- `packages/cli`: the `xerg` CLI, published as [`@xerg/cli`](https://www.npmjs.com/package/@xerg/cli)
- `packages/core`: the local economics engine, parsers, storage, and reporting logic
- `packages/schemas`: public wire types for push payloads, daily rollups, findings, comparisons, and recommendations
- `skills/xerg`: the skill package for ecosystem listings

## Quick start

Run the guided local-first path without installing anything:

```bash
npx @xerg/cli init
```

`init` detects local OpenClaw or Hermes data, runs a first audit, stores the local snapshot for later `--compare` runs, and then offers optional hosted follow-up.

Prefer explicit control?

```bash
npx @xerg/cli doctor
npx @xerg/cli audit
npx @xerg/cli audit --compare
```

Use those direct commands when you already know which source you want, you need non-interactive behavior, or you want JSON / Markdown / CI flows immediately.

## Optional hosted follow-up

If you have a paid workspace and want hosted features after the first local audit:

```bash
npx @xerg/cli connect
npx @xerg/cli mcp-setup
```

- `connect` reuses existing auth when present, or walks through browser login and offers to push the latest audit
- `mcp-setup` prints or writes hosted MCP config for Cursor, Claude Code, Codex, or another client

You can skip both and keep using Xerg locally.

## Supported sources

- Local OpenClaw logs and session transcripts
- Local Hermes logs and session transcripts
- Local Cursor usage CSV exports
- Remote OpenClaw audits over SSH, Railway, or `--remote-config`

Remote SSH, Railway, and multi-source flows remain OpenClaw-only in this phase. Hermes support is local-only.

## Default local paths

By default, Xerg checks:

- OpenClaw gateway logs: `/tmp/openclaw/openclaw-*.log`
- OpenClaw session transcripts: `~/.openclaw/agents/*/sessions/*.jsonl`
- Hermes logs: `~/.hermes/logs/agent.log*` with `gateway.log*` fallback
- Hermes session transcripts: `~/.hermes/sessions/`

If your data lives elsewhere, point Xerg at it directly:

```bash
xerg audit --runtime openclaw --log-file /path/to/openclaw.log
xerg audit --runtime openclaw --sessions-dir /path/to/sessions
xerg audit --runtime hermes --log-file ~/.hermes/logs/agent.log
xerg audit --runtime hermes --sessions-dir ~/.hermes/sessions
```

If no local data is present, `init` prints next steps for explicit local paths plus remote OpenClaw-only commands:

```bash
xerg audit --remote user@host
xerg audit --railway
```

## Requirements

- Node `22` or `24`
- `pnpm` `10.x` for local development in this repo

Local development and releases in this repo pin Node `24.14.0` via `.nvmrc`.

## Local development

```bash
nvm use
corepack prepare pnpm@10.6.2 --activate
pnpm install
pnpm lint
pnpm test
pnpm build
```

Run the CLI locally:

```bash
pnpm --filter @xerg/cli dev -- init
pnpm --filter @xerg/cli dev -- audit --compare
pnpm --filter @xerg/cli dev -- connect
pnpm --filter @xerg/cli dev -- mcp-setup
```

Common explicit flows:

```bash
# Inspect paths directly
pnpm --filter @xerg/cli dev -- doctor --runtime hermes

# Run a local audit with machine-readable output
pnpm --filter @xerg/cli dev -- audit --json

# Remote OpenClaw audit over SSH
pnpm --filter @xerg/cli dev -- audit --remote deploy@prod.example.com --since 24h

# Push the newest cached audit later
pnpm --filter @xerg/cli dev -- push

# Fail CI if waste is too high
pnpm --filter @xerg/cli dev -- audit --fail-above-waste-rate 0.30
```

## Pilot

- [xerg.ai/pilot](https://xerg.ai/pilot)

## Publishing

The manual [`Publish to npm`](.github/workflows/publish-npm.yml) workflow publishes both `@xerg/cli` and `@xerg/schemas`.

Current release convention:

- keep `package.json`, `packages/core/package.json`, `packages/cli/package.json`, and `packages/schemas/package.json` on the same semver in-repo
- treat `packages/cli/package.json` as the source of truth for the published CLI version and the ClawHub skill version
- update `docs/`, `packages/cli/README.md`, `skills/xerg/README.md`, and `skills/xerg/SKILL.md` whenever user-facing behavior changes
- publish with the `Publish to npm and ClawHub` workflow using `publish_target=all` when the CLI, schemas, and skill should stay in sync

See [`RELEASING.md`](RELEASING.md) for the maintainer checklist and messaging invariants.
