# Xerg — Changes From v1 to v2

This document records the deliberate deviations between the original planning docs in `docs/v1` and the current direction in `docs/v2`.

## 1. Scope is narrower

v1 described a broader company and platform plan:

- local CLI
- hosted API
- dashboard
- SDKs
- outcome tracking
- economic governance
- policy engine

v2 narrows the active build scope to two things only:

- a local CLI for OpenClaw waste intelligence
- a one-page marketing site with waitlist capture

The reason is simple: Xerg's primary early risk is not technical feasibility. It is trust. The fastest way to earn trust is to ship one local report that people believe.

## 2. The first product is local-first, not cloud-first

v1 allocated substantial early weight to cloud architecture, auth, payments, multi-tenant data models, and dashboard infrastructure.

v2 removes all of that from the critical path. There is no hosted product in the current build scope beyond the marketing site. The CLI is the product.

## 3. The first data contract is smaller

v1 introduced outcome events, work units, work-unit links, governance inputs, and broader platform abstractions from the start.

v2 keeps only the primitives required for local waste intelligence:

- source files
- runs
- calls
- findings
- pricing catalog
- audit snapshots

Outcome tracking is intentionally deferred.

## 4. The first metric set is more conservative

v1 centered Cost per Outcome, Outcome Yield, and Waste Rate as the governing metrics.

v2 keeps the long-term ambition but makes a sharper distinction between what can be measured now and what cannot.

What Xerg measures now:

- total spend
- observed versus estimated spend
- spend by workflow
- spend by model
- high-confidence waste findings
- lower-confidence optimization opportunities

What Xerg does not claim yet:

- cost per outcome
- ROI
- business value

## 5. Distribution is more focused

v1 implied a broader OSS and cloud launch surface.

v2 prioritizes distribution like this:

1. private repo through first CLI beta
2. npm package
3. OpenClaw Hub
4. `skills.sh`
5. hosted product later

The first audience is OpenClaw users because the report is concrete there today.

## 6. Infrastructure is intentionally boring

v1 proposed Cloudflare-first infrastructure, D1, and a wider hosted stack.

v2 chooses:

- Vercel for the marketing site
- Resend for waitlist capture and notifications
- Vercel Analytics for light site analytics
- local SQLite plus Drizzle for the CLI persistence layer

Cloudflare is not on the critical path.

## 7. Repo strategy changed

v1 described separate public and private repos.

v2 starts with one repo:

- `github.com/xergai/xerg`

The repo stays private through the first CLI beta. A second repo is deferred until a real hosted product needs separate velocity or private code boundaries.

## 8. Pricing is no longer treated as launch-ready

v1 proposed specific paid tiers early.

v2 treats pricing as provisional. The current product is still in pre-release validation, so the right move is:

- free local CLI first
- design partner conversations second
- hosted paid tiers only after the product earns trust

## 9. The product wedge is more explicit

v1 was architecturally horizontal very early.

v2 keeps the architecture horizontal but makes the go-to-market wedge narrow:

- agent systems first
- OpenClaw first
- support-like or operational workflows first

The goal is to prove an economic reporting wedge before broadening.

## 10. Documentation now distinguishes archive from source of truth

In v1, the original docs sat at the root of `docs/` and looked current by default.

In v2:

- `docs/v1` is the archive
- `docs/v2` is the current planning set

If the two disagree, `v2` wins.
