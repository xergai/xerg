# Xerg Overview

Status: current

## What Xerg Is

Xerg is an economic intelligence product for AI agent systems.

Its current job is narrower than the full company vision:

- help teams see where agent spend is going
- identify likely waste in dollars, not just tokens
- show what to test next
- show before/after improvement when a fix is made

The long-term ambition remains larger:

- cost per outcome
- outcome-aware unit economics
- economic governance and policy

But today Xerg is intentionally earning the right to move upward by first being trustworthy at waste intelligence.

## Category Position

Xerg is not trying to be:

- a generic trace viewer
- a plain spend dashboard
- just a model router
- a full hosted platform before the wedge is proven

The category claim is:

> Xerg is the economic intelligence layer for AI agent work.

In practical current terms:

> Xerg tells you where your OpenClaw workflows are wasting money and what to try next.

## What Exists Today

### Public surfaces

- Marketing site: `https://xerg.ai`
- Pilot page: `https://xerg.ai/pilot`
- npm package: `https://www.npmjs.com/package/@xerg/cli`

### Private surfaces

- GitHub repo: `https://github.com/xergai/xerg`

### Current product surface

- `xerg doctor`
- `xerg audit`
- `xerg audit --compare`
- Markdown and JSON output modes
- one-page site and waitlist flow

### What does not exist yet

- hosted dashboard
- team accounts
- billing
- public API
- SDK
- outcome ingestion
- cost per outcome reporting
- governance engine
- OTel / OpenInference ingestion
- OpenClaw export JSON import

## Current Product Promise

The current promise Xerg can honestly make is:

> We help you understand what your AI workflows are worth by starting with the part you can verify today: where spend is leaking and what to do next.

The phrase "what your AI is worth" is the company-level narrative.
The actual shipped product today delivers the first rung of that ladder: waste intelligence.

## Core Audience Today

The current best-fit audience is:

- OpenClaw users
- builders running real workflows repeatedly
- teams who care about cost, retries, loops, context bloat, and model choice
- technical early adopters willing to run a CLI and share results

The current wedge is not:

- general LLM app builders without repeated workflows
- enterprise governance buyers
- teams asking for a hosted dashboard first

## Current Business Posture

- The CLI beta is free.
- The site is a demand capture and explanation surface.
- The repo remains private through the first CLI beta.
- The package is public so people can install and use it.
- Pricing is intentionally not hardened yet.

## Live Company and Repo Facts

- GitHub org currently has one repo: `xergai/xerg`
- Repo visibility: private
- Repo homepage: `https://xerg.ai`
- Default branch: `main`
- npm package: `@xerg/cli`
- Current published version: `0.1.2`
- Maintainer currently shown on npm: `jasoncurry <jason@xerg.ai>`

## The Three Truth Levels

To remove confusion across older docs, Xerg should be understood in three levels:

### Current truth

What is live now:

- CLI
- site
- waitlist
- pilot flow
- private repo
- public npm package

### Ratified direction

What has been explicitly chosen as the near-term shape:

- OpenClaw first
- local-first analysis first
- npm before broader distribution
- Vercel for the site
- Resend for email capture and notifications
- GitHub Actions Trusted Publishing for npm

### Strategic future

What is plausible and important, but not yet current:

- cost per outcome
- team and hosted product
- XergCore and XergLedger as a two-product ecosystem
- runtime policy and governance
- broader runtime integrations beyond OpenClaw

Important clarification:

- XergLedger is not current build scope
- but it is not an uncommitted maybe either
- it is the planned second major product after Core-style waste intelligence validates with real users
- it is intended to become the open-source distribution engine that later strengthens the XergCore commercial layer

## Why This Matters

The biggest risk in the current Xerg docs history was not lack of ambition.
It was mixing:

- what is true now
- what is decided next
- what is only strategic exploration

This source-of-truth set separates those clearly.
