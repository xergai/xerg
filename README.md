# Xerg

Xerg helps teams understand AI agent spend in economic terms, starting with local waste
intelligence for OpenClaw workflows.

This repository currently contains:

- `packages/cli`: the `xerg` CLI, published as `@xergai/cli`
- `packages/core`: the local economics engine, parsers, storage, and reporting logic
- `apps/site`: the Vercel-hosted marketing site and waitlist form
- `docs/v2`: the current product, build, and pricing docs
- `docs/v1`: the archived original planning docs
- `skills/xerg`: the skill package for ecosystem listings

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
pnpm --filter @xergai/cli dev -- doctor
pnpm --filter @xergai/cli dev -- audit
```

Run the site locally:

```bash
pnpm --filter @xergai/site dev
```
