# Xerg Docs

Status: canonical documentation set as of March 16, 2026

This folder is the current, consolidated source of truth for Xerg.

It synthesizes:

- prior planning and strategy work
- the live repository state in `xergai/xerg`
- the current npm package state for `@xerg/cli`
- the current GitHub repo configuration and workflows
- key product, distribution, pricing, ecosystem, and operating decisions made during product work

If these documents disagree with older planning materials, this folder wins.

## Current Truth In One Screen

- Xerg is currently a local-first CLI and a public marketing site, not a hosted product platform.
- The live package is `@xerg/cli` at version `0.1.2`.
- The current product wedge is OpenClaw waste intelligence first.
- The current install path is `npx @xerg/cli audit` or `npm install -g @xerg/cli`.
- The GitHub repo is private: `github.com/xergai/xerg`.
- The public surfaces are `xerg.ai`, `xerg.ai/pilot`, and the npm package.
- The repo has protected `main`, CI, and GitHub Actions Trusted Publishing for npm.
- The waitlist flow is live with Resend, double opt-in, confirmed segment support, rate limiting, and Vercel Analytics.
- The product does not yet support hosted dashboards, outcome-aware economics, policy enforcement, OTel ingestion, or OpenClaw export JSON import.
- XergLedger is the ratified next major product (open-source workflow state engine), sequenced after XergCore validation — not current build scope.
- The current distribution priority is outreach and real-user validation, not new feature development.

## Document Map

### For founders, investors, marketing, and general stakeholders

Start with:

1. [Xerg Overview](/Users/jasoncurry/code/xerg/docs/xerg-overview.md)
2. [Go-To-Market, Pricing, and Distribution](/Users/jasoncurry/code/xerg/docs/xerg-go-to-market-pricing-and-distribution.md)
3. [Roadmap, Ecosystem, and Strategic Options](/Users/jasoncurry/code/xerg/docs/xerg-roadmap-ecosystem-and-strategic-options.md)

### For engineering, coding agents, and technical reviewers

Start with:

1. [Product, Users, and Current Capabilities](/Users/jasoncurry/code/xerg/docs/xerg-product-users-and-current-capabilities.md)
2. [Technical Architecture and Operations](/Users/jasoncurry/code/xerg/docs/xerg-technical-architecture-and-operations.md)
3. [Decisions, Drift, and Open Questions](/Users/jasoncurry/code/xerg/docs/xerg-decisions-drift-and-open-questions.md)

### For ops, release, and package maintenance

Start with:

1. [Technical Architecture and Operations](/Users/jasoncurry/code/xerg/docs/xerg-technical-architecture-and-operations.md)
2. [Go-To-Market, Pricing, and Distribution](/Users/jasoncurry/code/xerg/docs/xerg-go-to-market-pricing-and-distribution.md)
3. [Decisions, Drift, and Open Questions](/Users/jasoncurry/code/xerg/docs/xerg-decisions-drift-and-open-questions.md)

## Included Documents

- [README.md](/Users/jasoncurry/code/xerg/docs/README.md)
- [xerg-overview.md](/Users/jasoncurry/code/xerg/docs/xerg-overview.md)
- [xerg-product-users-and-current-capabilities.md](/Users/jasoncurry/code/xerg/docs/xerg-product-users-and-current-capabilities.md)
- [xerg-technical-architecture-and-operations.md](/Users/jasoncurry/code/xerg/docs/xerg-technical-architecture-and-operations.md)
- [xerg-go-to-market-pricing-and-distribution.md](/Users/jasoncurry/code/xerg/docs/xerg-go-to-market-pricing-and-distribution.md)
- [xerg-roadmap-ecosystem-and-strategic-options.md](/Users/jasoncurry/code/xerg/docs/xerg-roadmap-ecosystem-and-strategic-options.md)
- [xerg-decisions-drift-and-open-questions.md](/Users/jasoncurry/code/xerg/docs/xerg-decisions-drift-and-open-questions.md)

## Status Labels Used In This Set

- `Current` means live and true in the repo or product today.
- `Ratified` means decided and intended unless replaced by a newer explicit decision.
- `Strategic` means a serious future direction, but not part of the current committed build.
- `Archived` means older planning context retained for reasoning, not for execution.
