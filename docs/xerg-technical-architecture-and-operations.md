# Xerg Technical Architecture and Operations

Status: current

## Live Architecture Summary

Xerg currently has one private monorepo with two live product surfaces:

- a public npm CLI
- a public Vercel-hosted marketing site

There is no live hosted product backend beyond the site and waitlist flow.

## Org and Repo State

### GitHub org

- Org: `xergai`
- Current repo count observed: 1
- Current repo: `xergai/xerg`

### Repo metadata

- Visibility: private
- URL: `https://github.com/xergai/xerg`
- Default branch: `main`
- Description: `Audit OpenClaw agent spend, waste, and before/after improvements.`
- Homepage: `https://xerg.ai`

### Branch protection on `main`

Current branch protection is enabled with:

- pull request required
- strict up-to-date required
- required checks: `ci`, `Vercel`
- conversation resolution required
- force pushes disabled
- deletions disabled
- admins included in protection

## Monorepo Structure

```text
xerg/
├── apps/site
├── docs
│   ├── tmp
│   ├── v1
│   ├── v2
│   └── ssot
├── fixtures/openclaw
├── packages
│   ├── cli
│   └── core
├── skills/xerg
└── .github/workflows
```

## Packages and Surfaces

### `packages/core`

Responsibilities:

- source detection
- normalization
- pricing lookup and cost estimation
- findings engine
- report generation
- local persistence
- comparison logic

### `packages/cli`

Responsibilities:

- CLI entrypoint and help text
- command parsing
- `doctor`
- `audit`
- JSON and Markdown output selection

### `apps/site`

Responsibilities:

- public homepage
- pilot page
- waitlist capture
- email confirmation flow
- simple analytics

### `skills/xerg`

Responsibilities:

- ecosystem skill packaging and listing support

## Stack

### Workspace defaults

- Node `24.14.0`
- pnpm `10.6.2`
- TypeScript `5.x`
- Biome
- Vitest
- Changesets

### CLI and core

- `better-sqlite3`
- Node built-ins for filesystem access, globbing, and output
- raw SQL persistence
- `tsup`

### Site

- Next.js `16.1.x`
- React `19.x`
- Tailwind CSS `4.x`
- shadcn-style local UI components
- Geist Sans and Geist Mono
- Lucide icons
- Resend
- Vercel Analytics
- Vercel hosting

## Current npm and Release State

### Package

- Name: `@xerg/cli`
- Current version: `0.1.2`
- Homepage: `https://xerg.ai`
- Repository: `xergai/xerg`
- License: MIT

### Current install paths

- `npx @xerg/cli audit`
- `npm install -g @xerg/cli`
- after global install: `xerg audit`

### Important packaging reality

The desired unscoped package name `xerg` is not the current live install path.

The current, truthful install story is:

- `npx @xerg/cli audit`
- `npm install -g @xerg/cli`

### Release mechanics

- CI validates install, lint, typecheck, tests, build, pack dry run, and CLI smoke
- npm publishing is handled by GitHub Actions via Trusted Publishing
- manual workflow: `Publish CLI to npm`

### GitHub workflows

Current workflows:

- `CI`
- `Publish CLI to npm`

### GitHub releases

Current observed state:

- no GitHub releases listed

### GitHub Packages

Current observed state:

- no GitHub Packages artifacts are published
- npm is the real distribution channel

## Local Data Flow

### Doctor flow

1. detect gateway logs and session transcript files
2. report defaults and findings
3. tell the user whether audit can proceed

### Audit flow

1. detect sources
2. parse JSONL data
3. normalize into runs and calls
4. compute observed and estimated spend
5. compute findings
6. build summary
7. optionally load prior comparable snapshot
8. optionally build before/after comparison
9. optionally persist the audit locally
10. render terminal, JSON, or Markdown output

## Current Persistence Model

Xerg persists only local economic metadata and summaries.

It does not persist prompt or response content.

Persisted entities:

- `source_files`
- `runs`
- `calls`
- `findings`
- `pricing_catalog`
- `audit_snapshots`

## Waitlist and Site Operations

### Current waitlist behavior

- Resend-powered
- double opt-in confirmation email
- signed confirmation tokens
- confirmed-signup segment support
- rate limiting on submit and confirm
- internal notifications for submissions and confirmations
- Vercel Analytics events for confirmation sent and signup confirmed

### Key site environment variables

- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `WAITLIST_NOTIFY_EMAIL`
- `WAITLIST_SIGNING_SECRET`
- `WAITLIST_REPLY_TO`
- `WAITLIST_SUBMIT_RATE_LIMIT_MAX`
- `WAITLIST_SUBMIT_RATE_LIMIT_WINDOW_SECONDS`
- `WAITLIST_EMAIL_RATE_LIMIT_MAX`
- `WAITLIST_EMAIL_RATE_LIMIT_WINDOW_SECONDS`
- `WAITLIST_CONFIRM_RATE_LIMIT_MAX`
- `WAITLIST_CONFIRM_RATE_LIMIT_WINDOW_SECONDS`
- `RESEND_CONFIRMED_WAITLIST_SEGMENT_ID`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

## Current Operational Defaults

### Node workflow

Recommended local flow:

```bash
nvm use
corepack prepare pnpm@10.6.2 --activate
pnpm install
pnpm check
```

### Current verification commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm cli:pack`
- `pnpm cli:smoke`

## Security and Privacy Posture

### Current strengths

- local-first CLI
- no hosted ingestion path yet
- no prompt/response persistence
- main branch protection
- npm Trusted Publishing
- waitlist double opt-in
- waitlist rate limiting
- no long-lived npm publish token required

### Current limits

- the repo is private, which limits external trust signals and ecosystem visibility
- the CLI depends on local file access, which weakens the experience for remote-only users
- the local audit store is intentionally simple, not a hardened enterprise artifact store

## What Ops Should Assume Is True Today

- Xerg is not operating a hosted multi-tenant backend yet
- Vercel is only hosting the site and waitlist surface
- npm is the production distribution surface for the CLI
- GitHub Actions is the production publishing path
- Resend is the production waitlist email path
- SQLite is only local product storage right now
