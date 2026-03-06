# Xerg — Product Definition (v2)

Status: current working product definition

Date: March 6, 2026

## 1. What Xerg Is

Xerg is a local-first economics layer for AI agent workflows.

It starts by helping teams answer a simple question:

> Where is our agent spend going, and how much of it is waste?

The first product is a CLI that audits OpenClaw logs and session transcripts, computes spend, and reports:

- total spend
- observed versus estimated cost
- spend by workflow
- spend by model
- high-confidence waste findings
- lower-confidence optimization opportunities

## 2. What Xerg Is Not Yet

Xerg is not yet:

- a hosted dashboard
- an SDK product
- a policy engine
- a runtime control plane
- an outcome-tracking system
- a cost-per-outcome product
- a general-purpose observability layer

Those may come later. They do not govern the current build.

## 3. The Wedge

The first wedge is:

- OpenClaw users
- local analysis
- waste intelligence

This wedge is intentionally narrow because it shortens the trust loop. The first thing Xerg has to earn is belief in the report.

## 4. Product Principles

### 4.1 Local-first before cloud-first

The first meaningful report should not require sign-up, billing, dashboards, or hosted ingestion.

### 4.2 Honest before impressive

Xerg must clearly separate:

- confirmed cost
- estimated cost
- high-confidence waste
- lower-confidence opportunities

The product should never label speculation as proof.

### 4.3 Economic framing over token framing

The report should help a technical buyer reason in dollars, workflows, and operational waste, not only in tokens and traces.

### 4.4 Horizontal architecture, vertical go-to-market

The internal data model can stay general. The first distribution and product story should stay narrow.

## 5. The Core Primitives Now

The current product only needs these primitives:

- `source_file`: an imported log or session file
- `run`: one normalized workflow execution
- `call`: one model invocation inside a run
- `finding`: one waste or opportunity insight
- `pricing_catalog`: the pricing basis used for estimates
- `audit_snapshot`: one persisted report summary

These primitives are enough to support the v0 CLI.

## 6. What Xerg Measures Now

### 6.1 Spend

Xerg reports:

- total spend
- observed spend
- estimated spend
- spend by workflow
- spend by model

### 6.2 Findings

Each finding has:

- classification: `waste` or `opportunity`
- confidence: `high`, `medium`, or `low`
- scope: run, workflow, or global
- cost impact
- short explanation

### 6.3 High-confidence findings now

Current examples:

- retry waste
- repeated-error spend
- explicit loop waste when directly observable

### 6.4 Opportunities now

Current examples:

- context outliers
- candidate downgrade opportunities
- likely idle or monitoring spend

## 7. What Xerg Intentionally Does Not Measure Yet

Xerg does not currently claim:

- cost per outcome
- outcome yield
- ROI
- business value realization

Those require outcome and value data that the current product does not ingest.

## 8. Data Sources Now

The active data sources are:

- OpenClaw gateway JSONL logs
- OpenClaw session JSONL transcripts as fallback

Detection order:

1. explicit CLI flags
2. configured overrides later if needed
3. default OpenClaw gateway path
4. default OpenClaw session path

## 9. Privacy Model

The CLI should persist only the economic metadata required for reporting.

The product should not store:

- prompt content
- response content

unless that becomes an explicit future feature with a new privacy contract.

## 10. Distribution

Current planned order:

1. private beta in `github.com/xergai/xerg`
2. npm package
3. OpenClaw Hub
4. `skills.sh`

The repo remains private through the first CLI beta.

## 11. Open-Core Boundary

The long-term intention is still open-core, but the repository is private during the current validation phase.

The active question is not licensing yet. It is whether the CLI report is useful enough to deserve broader distribution.

## 12. Current Product Surface

The current user-facing surface is:

- `xerg doctor`
- `xerg audit`
- the marketing site at `xerg.ai`
- the waitlist form

That is the full active product surface for now.

## 13. What Governs Decisions

If a proposed feature does not make the local audit more trustworthy, easier to adopt, or easier to distribute, it is probably not part of the current build.
