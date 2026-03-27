# Xerg

Xerg helps teams understand AI agent spend in economic terms, starting with local waste
intelligence for OpenClaw workflows.

This repository currently contains:

- `packages/schemas`: public wire types for push payloads, findings, comparisons, and recommendations
- `packages/cli`: the `xerg` CLI, published as `@xerg/cli`
- `packages/core`: the local economics engine, parsers, storage, and reporting logic
- `skills/xerg`: the skill package for ecosystem listings

Package links:

- npm: [@xerg/cli](https://www.npmjs.com/package/@xerg/cli)
- repo package: [`packages/schemas`](packages/schemas)
- pilot: [xerg.ai/pilot](https://xerg.ai/pilot)

## Install

Run Xerg without a global install:

```bash
npx @xerg/cli audit
```

Or install it globally:

```bash
npm install -g @xerg/cli
```

After a global install, the command is still:

```bash
xerg audit
```

## Quick start

Inspect your local OpenClaw sources first:

```bash
xerg doctor
```

Run the first audit:

```bash
xerg audit
```

Make one workflow or model fix, then compare against your newest compatible local snapshot:

```bash
xerg audit --compare
```

Run a remote audit over SSH:

```bash
xerg audit --remote deploy@prod.example.com --since 24h
```

Export a shareable report:

```bash
xerg audit --markdown > xerg-audit.md
```

Export JSON with machine-readable recommendations:

```bash
xerg audit --json
```

Push an audit summary to the Xerg API:

```bash
xerg audit --push
```

## Requirements

- Node `20`, `22`, or `24`
- `pnpm` `10.x`

Local development in this repo still defaults to Node `24.14.0` via `.nvmrc`.

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
pnpm --filter @xerg/cli dev -- doctor
pnpm --filter @xerg/cli dev -- audit
```

Common CLI flows:

```bash
# Inspect your local OpenClaw sources first
pnpm --filter @xerg/cli dev -- doctor

# Run the first local audit
pnpm --filter @xerg/cli dev -- audit

# Make a workflow/model fix, then compare against your prior local snapshot
pnpm --filter @xerg/cli dev -- audit --compare

# Optional: limit the audit window
pnpm --filter @xerg/cli dev -- audit --since 24h --compare

# Remote audit over SSH
pnpm --filter @xerg/cli dev -- audit --remote deploy@prod.example.com --since 24h

# Push the computed audit to the API
pnpm --filter @xerg/cli dev -- audit --push

# Print the push payload without sending it
pnpm --filter @xerg/cli dev -- audit --push --dry-run

# Authenticate via browser and store local credentials
pnpm --filter @xerg/cli dev -- login

# Push the most recent cached audit snapshot without re-running the audit
pnpm --filter @xerg/cli dev -- push

# Fail CI if waste is too high
pnpm --filter @xerg/cli dev -- audit --fail-above-waste-rate 0.30
```

## Where Xerg looks for OpenClaw data

By default, Xerg checks:

- gateway logs: `/tmp/openclaw/openclaw-*.log`
- session transcripts: `~/.openclaw/agents/*/sessions/*.jsonl`

If your data lives elsewhere, point Xerg at it directly:

```bash
xerg audit --log-file /path/to/openclaw.log
xerg audit --sessions-dir /path/to/sessions
```

## Pilot

If you are using OpenClaw and want to try Xerg in the real world, the pilot page is here:

- [xerg.ai/pilot](https://xerg.ai/pilot)

It includes the exact install, audit, export, and compare commands, plus where to send results.

## Publishing

The manual
[`Publish to npm`](.github/workflows/publish-npm.yml)
workflow is configured to publish both `@xerg/cli` and `@xerg/schemas`.

Publishing uses npm Trusted Publishing.
