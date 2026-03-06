# Xerg — Technical Build Plan (v2)

Status: current build-now plan

Date: March 6, 2026

## 1. Goal

Build and validate two things:

- a local CLI for OpenClaw waste intelligence
- a one-page marketing site with waitlist capture

Do not build the hosted product yet.

## 2. Current Stack

### Core repo defaults

- Node `24.14.0`
- pnpm `10.6.2`
- TypeScript `5.x`
- Biome
- Vitest
- Changesets

### CLI and core engine

- `commander`
- `zod`
- `better-sqlite3`
- `drizzle-orm`
- `drizzle-kit`
- `tsup`

### Site

- Next.js `16.1.x`
- React `19.x`
- Tailwind CSS `4.x`
- shadcn-style local components
- Geist Sans and Geist Mono
- Lucide icons
- Resend
- Vercel Analytics

## 3. Current Repo Structure

```text
xerg/
├── apps/
│   └── site/
├── docs/
│   ├── v1/
│   └── v2/
├── fixtures/
│   └── openclaw/
├── packages/
│   ├── cli/
│   └── core/
├── skills/
│   └── xerg/
└── .github/workflows/
```

## 4. Current Packages

### `packages/core`

Purpose:

- source detection
- OpenClaw normalization
- pricing catalog
- findings engine
- SQLite persistence
- report formatting

### `packages/cli`

Purpose:

- user-facing `xerg` command
- `doctor`
- `audit`

### `apps/site`

Purpose:

- explain Xerg clearly
- capture waitlist emails
- send optional internal notifications
- collect basic traffic and waitlist analytics

## 5. Current CLI Scope

Commands shipped now:

- `xerg doctor`
- `xerg audit`

Supported flags now:

- `--log-file`
- `--sessions-dir`
- `--since`
- `--json`
- `--markdown`
- `--db`
- `--no-db`

Not in scope now:

- SDKs
- outcome ingestion
- cost-per-outcome
- hosted ingestion
- auth
- billing
- dashboard
- policy engine

## 6. Current Data Model

Tables in the local SQLite layer:

- `source_files`
- `runs`
- `calls`
- `findings`
- `pricing_catalog`
- `audit_snapshots`

Not present by design:

- `outcome_events`
- `work_units`
- policy tables
- tenant or auth tables

## 7. Current Site Scope

The site does four things:

- explains what Xerg is
- communicates the current wedge
- captures waitlist signups
- routes signups into Resend Contacts

The current site also includes:

- Vercel Analytics page tracking
- a server-side `Waitlist Signup` event

## 8. Deployment Plan Now

### Site

- host on Vercel
- production domain: `xerg.ai`
- `www.xerg.ai` redirects to apex
- built-in preview URLs for branch previews

### CLI

- local-only for now
- npm distribution later

### Infrastructure not in use now

- Cloudflare
- Neon
- Supabase
- PostHog
- Stripe

## 9. Environment Variables

### Site

- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `WAITLIST_NOTIFY_EMAIL`
- `RESEND_FROM_EMAIL`

## 10. CI

The GitHub Actions pipeline currently runs:

- install
- lint
- typecheck
- test
- build
- CLI smoke test

The site build is part of CI.

## 11. Node Workflow

This repo pins Node in `.nvmrc`.

Recommended workflow:

```bash
nvm use
corepack prepare pnpm@10.6.2 --activate
pnpm install
```

If another repo uses a different patch version, switch per repo rather than forcing one global default.

## 12. Current Validation Goals

The active validation goals are:

- the CLI report is trustworthy
- a new user can run it quickly
- the site explains the product clearly
- the waitlist flow works reliably

Everything else is secondary.

## 13. Next Build Steps

Near-term engineering steps:

1. tighten CLI fixture coverage and parser robustness
2. improve report quality on real OpenClaw data
3. prepare npm release mechanics for `@xergai/cli`
4. keep the repo private through the first beta
5. prepare OpenClaw Hub packaging

## 14. Deferred Work

Deferred until after CLI validation:

- public OSS launch
- Homebrew
- Python SDK
- team dashboard
- hosted API
- outcome tagging
- pricing and billing implementation
- governance and policy engine
