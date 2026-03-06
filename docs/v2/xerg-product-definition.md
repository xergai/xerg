# Xerg — Product Definition (v2)

Status: current working product definition

Date: March 6, 2026

## 1. What Xerg Is

Xerg is an economic intelligence layer for AI agent systems.

It is built around one question that most current AI tooling does not answer well:

> What is this AI workflow costing us, where is value leaking, and what should we change next?

The long-term ambition is bigger:

> What is the cost per outcome of our AI systems, and how do we improve it?

But Xerg does not earn the right to answer that by hand-waving. It earns it in stages.

Today, Xerg starts with a local-first CLI that audits OpenClaw logs and session transcripts, computes spend, surfaces structural waste, and points to the next savings tests worth running.

That is the first product.

## 2. The Category Claim

Most AI tools in this market stop in one of three places:

- spend visibility
- tracing and observability
- model routing

Those are useful, but they are not the same thing as economic intelligence.

Spend visibility tells you what you spent.
Tracing tells you what happened.
Routing tells you how to pay less for a call.

Xerg sits one layer higher:

- it turns spend into operational decisions
- it identifies where money is leaking
- it distinguishes confirmed waste from directional opportunities
- it gives teams a path from raw spend to unit economics

That is the unique value.

## 3. What Xerg Does Today

Today Xerg answers a tighter, lower-altitude question:

> Where is our agent spend going, how much of it looks wasteful, and what should we test next?

The current product:

- reads OpenClaw gateway logs and session transcripts locally
- computes total, observed, and estimated spend
- breaks spend down by workflow and model
- flags high-confidence waste
- flags lower-confidence optimization opportunities
- preserves the difference between measured facts and recommendations

This is intentionally narrower than the long-term vision. It is also much more credible.

## 4. What Xerg Ultimately Aims To Do

Xerg is being built in layers.

### Layer 1: Waste intelligence

This is the current layer.

It answers:

- where money is leaking
- which workflows look structurally inefficient
- which model choices deserve testing

### Layer 2: Unit economics

This comes later, after the audit earns trust.

It answers:

- cost per successful workflow outcome
- comparative efficiency across workflows or teams
- whether improvements are real over time

### Layer 3: Economic governance

This comes after outcome-aware reporting exists.

It answers:

- how AI spend should be governed
- which changes should be blocked or escalated
- where AI capital should be allocated

## 5. Why Agent Systems First

Xerg targets agent execution loops first, not general-purpose copilots.

Agent systems are a better first wedge because they produce closed loops:

- goal
- plan
- model call
- tool call
- retry
- result

That makes them more economically legible.

You can observe loop waste, retry waste, context bloat, and idle spend in ways that are much harder to prove for open-ended copilots.

This is why the wedge is:

- agent systems first
- OpenClaw first
- local analysis first

## 6. What Makes Xerg Different

### 6.1 Not another spend dashboard

If a tool ends at "you spent $47 today," it is not enough.

Xerg has to answer:

- why the spend happened
- which parts look wasteful
- what is worth changing first

### 6.2 Not another observability layer

Xerg is not competing to be the best trace viewer or evaluation product.

Observability tools help teams inspect runtime behavior.
Xerg uses economic framing to help teams decide what to fix.

### 6.3 Not just a router

Routing is a tactic, not the product.

A router can lower cost per call.
Xerg is trying to improve cost relative to useful work.

## 7. The Current Product Surface

The active user-facing product surface is small by design:

- `xerg doctor`
- `xerg audit`
- the marketing site at `xerg.ai`
- the waitlist flow

There is no dashboard, billing, auth system, or hosted ingestion path in the current build scope.

## 8. The Current Core Primitives

The v0 CLI only needs these primitives:

- `source_file`
- `run`
- `call`
- `finding`
- `pricing_catalog`
- `audit_snapshot`

Those are enough to build a trustworthy waste-intelligence report without pretending the full hosted product already exists.

## 9. What Xerg Measures Now

Current metrics:

- total spend
- observed spend
- estimated spend
- spend by workflow
- spend by model
- high-confidence waste
- lower-confidence opportunities

Examples of high-confidence waste:

- retry waste
- repeated-error spend
- explicit loop waste

Examples of opportunities:

- context outliers
- candidate downgrade tests
- likely idle or monitoring spend

## 10. What Xerg Does Not Claim Yet

Xerg does not currently claim:

- cost per outcome
- ROI
- outcome yield
- business value realization

Those require outcome and valuation data that the current product does not ingest.

The point of the current product is to earn trust first, then expand upward.

## 11. The Product Promise

The promise of Xerg is not "we show your AI spend."

The promise is:

> We help you understand what your AI workflows are worth by starting with the part you can verify today: where spend is leaking and what to do next.

That is the narrative the current product needs to reinforce everywhere:

- docs
- site
- CLI output
- future distribution

## 12. Distribution Posture

Current order of operations:

1. private repo and private beta
2. npm distribution
3. OpenClaw Hub
4. `skills.sh`

The repo remains private through the first CLI beta because the main question is still validation, not maximum distribution.

## 13. What Governs Decisions

If a proposed feature does not improve one of these, it is probably not part of the current build:

- audit trust
- audit usefulness
- time to first value
- distribution of the CLI

Xerg should feel like a focused product with a strong point of view, not a half-built platform.
