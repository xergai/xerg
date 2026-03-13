# Xerg

Xerg helps teams understand AI agent spend in economic terms, starting with local waste
intelligence for OpenClaw workflows.

This repository currently contains:

- `packages/cli`: the `xerg` CLI, published as `@xerg/cli`
- `packages/core`: the local economics engine, parsers, storage, and reporting logic
- `apps/site`: the Vercel-hosted marketing site and waitlist form
- `docs/v2`: the current product, build, and pricing docs
- `docs/v1`: the archived original planning docs
- `skills/xerg`: the skill package for ecosystem listings

Package links:

- npm: [@xerg/cli](https://www.npmjs.com/package/@xerg/cli)
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

Export a shareable report:

```bash
xerg audit --markdown > xerg-audit.md
```

## Requirements

- Node `24.14.0`
- `pnpm` `10.x`

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
```

Beta-facing docs:

- sample report: `docs/v2/xerg-cli-sample-report.md`
- beta checklist: `docs/v2/xerg-cli-beta-checklist.md`

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

Run the site locally:

```bash
pnpm --filter @xergai/site dev
```

## Publishing

`@xerg/cli` is published from GitHub Actions via the manual
[`Publish CLI to npm`](/Users/jasoncurry/code/xerg/.github/workflows/publish-npm.yml)
workflow.

The intended long-term setup is npm Trusted Publishing, not long-lived npm tokens.
