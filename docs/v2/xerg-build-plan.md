# Xerg — Technical Build Plan (v2)

Status: current build-now plan

Date: March 6, 2026

## 1. What This Plan Is For

This is not the build plan for the whole company.

It is the build plan for proving the wedge.

The wedge is simple:

- local-first CLI
- OpenClaw workflows first
- waste intelligence first

The goal is to ship one report that people trust, not to build the entire eventual platform up front.

## 2. The Core Build Decision

The most important technical decision in Xerg right now is not which cloud vendor to use.

It is this:

> Build the product that proves the insight before building the platform that scales the company.

That is why the active scope is narrow:

- a local CLI
- a one-page site
- a waitlist flow

Everything else is deferred until the audit proves it deserves to exist.

## 3. What We Are Building Now

### 3.1 The CLI

The CLI is the product.

It should:

- find OpenClaw data with minimal setup
- compute spend cleanly
- surface structural waste
- surface clearly labeled opportunities
- point to the next optimization tests worth running

### 3.2 The site

The site is not a second product.

Its job is to:

- explain Xerg clearly
- make the wedge legible quickly
- collect waitlist demand

### 3.3 What we are not building now

Not now:

- dashboard
- hosted API
- SDK suite
- auth
- billing
- policy engine
- outcome tracking
- team collaboration features

## 4. Current Stack

The stack is intentionally boring and current.

### Repo defaults

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

## 5. Repo Structure

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

This repo stays small until reality forces it to split.

## 6. Current Packages

### `packages/core`

This is the shared engine.

It owns:

- source detection
- normalization
- pricing
- findings
- report generation
- local persistence

If logic is needed in more than one place, it should usually live here.

### `packages/cli`

This is the user-facing interface to the product.

Current commands:

- `xerg doctor`
- `xerg audit`

### `apps/site`

This is the marketing surface.

It exists to explain, capture interest, and support early distribution. It is not the hosted product.

## 7. Current Data Model

The current local data model is intentionally small:

- `source_files`
- `runs`
- `calls`
- `findings`
- `pricing_catalog`
- `audit_snapshots`

This is enough to support the CLI honestly.

It intentionally excludes:

- outcome events
- work units
- multi-tenant records
- auth records
- policy definitions

## 8. Current Audit Scope

The CLI should answer four questions well:

1. How much did this workflow spend?
2. Where does the spend cluster?
3. What looks like confirmed waste?
4. What should we test next?

That is the product bar for now.

## 9. Current Site Scope

The site should do three things clearly:

1. explain the category claim
2. show how Xerg differs from generic spend tooling
3. capture waitlist demand

Everything else is noise right now.

## 10. Deployment

### Site

- hosted on Vercel
- production domain: `xerg.ai`
- `www.xerg.ai` redirects to apex
- branch previews use Vercel preview URLs for now

### CLI

- local-only
- npm later

### Infrastructure we are intentionally not using now

- Cloudflare
- Neon
- Supabase
- PostHog
- Stripe

Those are not bad tools. They are just not necessary to prove the current wedge.

## 11. CI

The CI pipeline should protect the repo from drift, not become a second product.

Current checks:

- install
- lint
- typecheck
- test
- build
- CLI smoke test

## 12. Node Workflow

This repo pins Node in `.nvmrc`.

Recommended local flow:

```bash
nvm use
corepack prepare pnpm@10.6.2 --activate
pnpm install
pnpm check
```

If another repo uses a different Node patch version, switch per repo rather than forcing one global default.

## 13. Current Validation Goals

The build should optimize for these outcomes:

- the audit feels trustworthy
- the audit feels useful
- time to first value stays low
- the site makes the wedge obvious
- the waitlist flow is dependable

Everything else is secondary.

## 14. What Happens Next

Near-term engineering steps:

1. improve parser robustness on real OpenClaw data
2. improve report quality and prioritization
3. prepare npm release mechanics for `@xerg/cli`
4. keep the repo private through the first beta
5. prepare OpenClaw Hub packaging

## 15. What Is Deferred On Purpose

Deferred until the CLI proves the wedge:

- public OSS launch
- Homebrew
- Python SDK
- team dashboard
- hosted API
- outcome tagging
- pricing and billing implementation
- governance and policy engine

The discipline here matters.

Xerg should feel like a focused product with a point of view, not a sprawling half-built platform.
