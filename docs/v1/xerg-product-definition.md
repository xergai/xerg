# Xerg — Product Definition

**xerg.ai · The Unit Economics Engine for AI Agents**

*This document defines what Xerg is, what it measures, how it integrates, and what value it delivers. Everything we build — code, pricing, GTM, fundraising — derives from this definition. If it contradicts this document, it's wrong.*

---

## 1. What Xerg Is

Xerg is an economic intelligence layer for AI agent systems.

It answers one question no existing tool answers well:

**"What is the cost per outcome of my AI agents, and how do I improve it?"**

Every other tool in this space stops at cost visibility or model routing. Xerg continues into economics: connecting inference spend to business outcomes, computing unit economics per workflow, and providing the decision intelligence to allocate AI capital efficiently.

The thermodynamic analogy is precise: most tools measure energy (tokens, dollars). Xerg measures *exergy* — the fraction of that energy that produces usable work.

---

## 2. What Xerg Is Not

Xerg is **not** a cost tracker. Cost tracking is a byproduct, not the product. If we're building dashboards that show "you spent $47 today," we're building a commodity. Forty-plus skills on ClawHub already do that.

Xerg is **not** an observability platform. We don't compete with Langfuse, Arize, LangSmith, or Datadog. They instrument quality, latency, and traces. We sit on top of their data (or alongside it) and compute economics. They are potential data sources, not competitors.

Xerg is **not** a model router. Smart routing (Haiku → Sonnet → Opus) is a tactic we may employ inside the optimization engine, but it's not the product. Routers optimize cost without knowing value. We optimize cost *relative to value*.

### Strategic Focus: Agent Systems First

Xerg targets **agent execution loops**, not developer copilots.

When an agent runs, the structure is a closed loop: goal → plan → model call → tool call → retry → result. Every step burns measurable resources. That means cost per task, cost per successful task, cost per retry, and cost per tool call are all computable with physics-like precision. If an agent costs $0.42 to complete a task today and $0.19 tomorrow, the improvement is measurable. Organizations understand that immediately.

Coding copilots are different. A developer asks for a code suggestion, edits it, maybe deletes it, maybe it ships months later. The causal chain between inference cost and business outcome is fuzzy. Measuring "cost per useful software artifact" requires IDE telemetry, Git history, CI/CD pipelines, issue trackers, and developer intent — a much thicker integration stack that produces noisier signal.

Agent systems have a property that makes them ideal for economic measurement: **a closed loop.** Like a thermostat (measure → compare to goal → adjust), agent systems produce measurable outcomes cycle by cycle. This is a dream for an economics tool.

The agent ecosystem is also fragmented — LangGraph, CrewAI, AutoGen, OpenClaw, OpenAI Agents SDK, and others evolving in parallel. Fragmented ecosystems create room for a horizontal control layer. Stripe succeeded partly because payment processors were fragmented. Datadog grew because infrastructure stacks were fragmented. Xerg sits above the runtimes and says: "I don't care which agent framework you use. I measure the economics of the work they do."

This focus is a guardrail, not a permanent limitation. Once Xerg owns "agent economics," expansion to developer workflows, support bots, research copilots, and other AI use cases becomes natural. But the wedge is agents — where the signal is cleanest, the loops are closed, and the economic measurement is precise.

---

## 3. The Core Primitives

Xerg has four core data structures: **Run**, **OutcomeEvent**, **WorkUnit**, and **PricingCatalog**.

A **Run** is a single, immutable execution record — one invocation of an agent, one pass through a pipeline. It records what happened and what it cost. Runs are never edited after creation.

An **OutcomeEvent** is an append-only event that records what happened to a business outcome. Outcomes arrive asynchronously (via SDK, webhook, batch import, or manual override), may be revised (tickets reopen, PRs get reverted), and must be auditable. Outcomes reference either a Run or a WorkUnit — never stored inside the Run itself.

A **WorkUnit** is the business object that one or more Runs contribute to — the ticket, the PR, the customer query, the compliance check. It's the level at which CPO is properly computed. WorkUnit state is a materialized view over its linked OutcomeEvents.

A **PricingCatalog** is the source of truth for model costs. When telemetry includes observed cost, Xerg stores it as-is. When only token counts are available, Xerg computes estimated cost from the catalog. The distinction between observed and estimated cost is preserved and surfaced to users — CFOs will ask.

This separation matters because real agent workflows are multi-step and outcomes are mutable. Resolving a support ticket might involve a planner Run, a retrieval Run, a generation Run, and a retry Run. The ticket might later reopen. CPO for "ticket resolved" is the total allocated cost of all contributing Runs at the time of resolution — and that number updates if the outcome changes.

```
Run {
  // — IMMUTABLE EXECUTION FACTS —
  id:               string       // unique identifier
  timestamp:        datetime     // when the run started
  trace_id:         string       // OTel trace ID for cross-system correlation
  span_id:          string       // OTel span ID
  parent_run_id:    string       // for nested runs (subagent calls, retries)
  semconv_version:  string       // OTel GenAI semconv version of the source
  
  // — IDENTITY —
  workflow:         string       // what workflow/agent/skill produced this
  environment:      string       // dev, staging, production
  tags:             map          // arbitrary key-value metadata
  team:             string       // team/business-unit attribution
  
  // — COST —
  calls: [{
    model:            string
    provider:         string
    input_tokens:     int
    output_tokens:    int
    cost_usd:         float       // observed (from telemetry) or estimated (from catalog)
    cost_source:      enum        // observed | estimated
    latency_ms:       int
    tool_calls:       int
    retries:          int
    cache_hit:        bool
    cache_cost_usd:   float       // if cached tokens have a different rate
  }]
  total_cost_usd:     float      // sum of all calls
  total_tokens:       int        // sum of all tokens
}
```

```
OutcomeEvent {
  id:               string       // unique event identifier
  timestamp:        datetime     // when this outcome was recorded
  work_unit_id:     string       // which business object this outcome applies to
  run_id:           string       // optional: specific run if outcome is run-level
  outcome:          enum         // success | failure | partial | unknown | reopened
  outcome_type:     string       // e.g., "ticket_closed", "pr_merged", "pr_reverted"
  value:            float        // relative points or dollar value
  value_model:      string       // which valuation model produced this number
  source:           enum         // sdk | jira | github | zendesk | manual | batch
  actor:            string       // who/what recorded this (system, user, webhook)
}
```

```
WorkUnit {
  // — IDENTITY —
  id:               string       // business object ID (ticket #4521, PR #892)
  type:             string       // "ticket", "pr", "query", "compliance_check"
  created_at:       datetime

  // — CURRENT STATE (materialized from OutcomeEvents) —
  current_outcome:  enum         // latest outcome from the event stream
  resolved_at:      datetime     // timestamp of latest resolution event
  current_value:    float        // latest value from the event stream
  value_model:      string       // which valuation model is active
}
```

```
WorkUnitRunLink {
  work_unit_id:     string       // the business object
  run_id:           string       // the execution that contributed
  allocation:       float        // 0.0–1.0, portion of this Run's cost attributed
  reason:           enum         // direct | shared_overhead | batch
}
```

The many-to-many link between WorkUnits and Runs is necessary because real systems have shared overhead. A retrieval/indexing job may serve many tickets. A memory refresh agent benefits multiple workflows. A bulk triage Run touches multiple work objects. The `allocation` weight lets Xerg attribute cost proportionally rather than double-counting or ignoring shared infrastructure.

```
PricingCatalog {
  provider:         string       // "anthropic", "openai", "google", etc.
  model:            string       // "claude-sonnet-4-5", "gpt-4o", etc.
  effective_date:   datetime     // when this pricing took effect
  input_per_1m:     float        // $ per 1M input tokens (list price)
  output_per_1m:    float        // $ per 1M output tokens (list price)
  cached_input_per_1m: float     // $ per 1M cached input tokens (if different)
  org_override:     bool         // true if this is a contract/negotiated rate
}
```

Xerg maintains a default PricingCatalog with current list prices (updated weekly). Organizations can override with their contracted rates. When computing cost: if the telemetry includes observed `cost_usd`, use it and label it "observed." If only tokens are present, compute from the catalog and label it "estimated." This distinction is always visible in reports and APIs.

**Derived metrics** — CPO, OY, WR, efficiency scores, waste flags — are computed by the Xerg engine as **materialized views** over Runs, OutcomeEvents, WorkUnits, and WorkUnitRunLinks. Derivations are versioned separately from facts: when we improve our waste taxonomy or efficiency heuristics, metrics recompute under a new engine version (`xerg_engine_v0.3`), and customers can see what changed and why. This is non-negotiable for "system of record" credibility — the same raw data must produce reproducible, explainable metrics.

---

## 4. The Three Metrics That Matter

Traditional AI tooling tracks dozens of metrics. Xerg focuses on three that executives, engineers, and finance all understand:

### 4.1 Cost per Outcome (CPO)

**Definition:** Total allocated inference cost of all Runs linked to a WorkUnit (via WorkUnitRunLinks, weighted by allocation), divided by the number of successful WorkUnits of a given type. Computed at the WorkUnit level, not the individual Run level, to capture the full cost of multi-step agent workflows including proportionally attributed shared overhead.

**Example:** "Our support agent resolves tickets at $1.23 per ticket (across an average of 3.2 Runs per ticket). Last month it was $1.87. The Sonnet → Haiku routing change saved $0.64 per resolution."

**Why it matters:** This is the metric that connects AI spend to business value. It's the "cost per acquisition" of AI operations. When a CFO asks "what are we getting for our AI spend," CPO is the answer. Computing it at the WorkUnit level — not per-call — is what makes it a true business metric.

### 4.2 Outcome Yield (OY)

**Definition:** Outcome value produced per dollar of inference spend.

**Example:** "For every $1 spent on inference, our code review agent produces $14.30 of engineering time savings. Our data entry agent produces $6.20."

**Why it matters:** This is the ROI metric. It tells you which agents are capital-efficient and which are burning money. It's the equivalent of "return on invested capital" for AI operations.

### 4.3 Waste Rate (WR)

Waste Rate has two layers, each with different data requirements:

**WR-Structural (no outcome data needed):** The percentage of inference spend flagged as likely waste via heuristics. This is what Level 1 users see.

Structural waste categories:
- **Retry waste:** Cost of calls that failed and were retried
- **Context bloat:** Excess input tokens beyond what was needed (measured against compacted baselines)
- **Candidate downgrade opportunities:** Expensive models used for task classes where cheaper models are likely sufficient based on task complexity heuristics — flagged as opportunities with a recommended A/B test, not asserted as proven waste
- **Loop waste:** Agentic reasoning loops that exceed efficient bounds (e.g., 15+ iterations for a task class that typically resolves in 3-5)
- **Idle waste:** Heartbeat, cron, and monitoring costs with no triggered action

**WR-Outcome (requires outcome data):** The percentage of spend attributable to failed runs vs. successful runs, computed at the WorkUnit level from the latest OutcomeEvent state. This is a Level 2+ metric.

WR-Outcome adds:
- **Failure cost:** Total cost of Runs linked to WorkUnits with `outcome = failure`
- **Partial cost:** Cost of Runs on WorkUnits that succeeded but required retries or fallbacks (excess cost beyond the efficient path)

**Example (Level 1):** "We estimate 28% of your inference spend is structural waste. The biggest driver is context bloat ($312/week). You also have 4 candidate downgrade opportunities that could save an estimated $89/week — we recommend A/B testing Haiku on your heartbeat workflows."

**Example (Level 2):** "38% of your inference spend did not contribute to successful outcomes. Failed WorkUnits cost you $1,430 last month. Structural waste on successful WorkUnits added another $890."

**Why it matters:** WR-Structural is the most immediately actionable metric — it requires zero user input beyond cost logs and creates the "holy crap" moment. WR-Outcome is the more precise metric that becomes available when users add outcome tracking. The split ensures we never claim more than the data supports at any level.

---

## 5. The Value Ladder

Xerg delivers value at three altitudes. Users can get value at each level without reaching the next, but the product gets dramatically more powerful as they climb.

### Level 1: Waste Intelligence (no outcome data needed)

**What it requires:** Cost data only (tokens, models, pricing).

**What it computes:**
- Total spend by model, workflow, time period
- WR-Structural with categorized waste drivers
- Candidate downgrade opportunities with recommended A/B tests
- Optimization recommendations with estimated dollar savings
- Budget alerts, anomaly detection, runaway loop detection
- Before/after comparisons when optimizations are applied

**Value delivered:** "You're spending $X. Here's where you're wasting money and exactly how to fix it."

**This is the free tier.** This is what we ship first. This is what creates installs, screenshots, tweets, and case studies. Every user gets this without providing outcome data.

### Level 2: Unit Economics (requires outcome tagging)

**What it requires:** Cost data + outcome flag (success/failure) + outcome type label. Optionally: WorkUnit linkage (connecting Runs to business objects).

**What it computes:**
- Cost per Outcome by workflow, agent, model, time period (at WorkUnit level when linked)
- Outcome Yield rankings across workflows
- WR-Outcome: spend on failed vs. successful WorkUnits
- Trend analysis: is CPO improving or degrading?
- Cost regression detection: "This PR increased CPO by 34%"
- Comparative analysis: "Agent A vs Agent B for the same task type"

**Value delivered:** "Your support agent costs $1.23/ticket. Your code agent costs $4.50/PR. Here's how each compares to last month and how to improve."

**Outcome valuation progression:** Users don't need dollar-accurate values on day one. Xerg supports a progression: start with relative points (ticket_closed = 5, pr_merged = 20), evolve to time-saved estimates via connectors (Jira time tracking, GitHub cycle time), eventually reach dollar values via custom models. Multiple value models can coexist per org/team.

**This is the team/paid tier.** Users opt in to outcome tagging with a single SDK call or webhook. The minimum viable input is `xerg.track(outcome="success", type="ticket_closed")`.

### Level 3: Economic Governance (requires outcome valuation + policy)

**What it requires:** Cost data + outcomes + value weights + policy definitions.

**What it computes:**
- Portfolio-level AI capital allocation guidance
- Forecasting: projected spend and CPO for next period
- Chargeback reports by business unit, team, product
- Compliance and audit reporting
- Monte Carlo simulation for spend volatility

**Economic Policy as Code** — the core defensibility of Level 3. Organizations encode governance rules that enforce economic discipline:

- "Don't use Opus unless expected outcome value exceeds $X"
- "Cap spend per ticket at $5 — escalate to human if exceeded"
- "Block runaway loops that exceed $Y in Z minutes"
- "Require outcome tagging on all production workflows"
- "Alert if CPO for workflow X degrades by more than 15% week-over-week"

These policies integrate into CI/CD (block deploys that regress CPO), approval workflows (require sign-off for high-cost model changes), and runtime enforcement (circuit-breakers on spend). Once an organization encodes its AI economic policies in Xerg, it's deeply integrated and hard to rip out.

**Policy enforcement points** — where governance actually runs:

- **CI/CD gate:** Before deploy, replay recent WorkUnit traffic against the new code/config on staging. If CPO regresses beyond the policy threshold, block the deploy. This is a GitHub Action / CI step that calls the Xerg API.
- **Runtime policy gate:** An optional lightweight check (SDK middleware, gateway sidecar, or API call) that evaluates policy before or during a Run. Can deny, route to a cheaper model, or escalate to human. Example: "this ticket has already consumed $4.80 of its $5.00 cap — escalate."
- **Post-run alerting + remediation:** The lowest-stakes entry point. After Runs complete, Xerg evaluates policy violations and fires alerts (Slack, email, PagerDuty). Can auto-create remediation issues (GitHub Issues, Jira tickets) with specific recommendations. This ships first because it's non-blocking and easy to adopt.

Investors don't need us to build all three today. They need to see that the architecture makes enforcement *inevitable* — the data model, the WorkUnit linkage, and the policy definitions are the foundation. The enforcement points are the delivery mechanisms.

**Optional: Anonymized cohort benchmarking.** Teams can opt in to share anonymized, aggregated metrics for cross-org benchmarking ("your CPO for support agents is $1.23; the cohort median is $0.87"). This is valuable but not the core moat — many orgs won't opt in, and representativeness takes time. It's future upside, not the foundation.

**Value delivered:** "Your AI portfolio has a blended Outcome Yield of 8.2x. Marketing agents are at 14x, support is at 6x, and your compliance agent is at 2.1x — below the governance threshold. Here's a reallocation recommendation."

**This is enterprise.** This is the Bloomberg Terminal. This is where Xerg becomes a strategic decision-making tool, not a monitoring product.

### The Open-Core Boundary

The value ladder maps directly to a clean open-source / proprietary split:

**Open source (MIT license, public repo, free forever):**
- The `xerg` CLI (audit reports, waste taxonomy, optimization recommendations)
- All adapters (OpenClaw, OTel GenAI ingestion)
- The SDK wrapper (`xerg.track()`, `xerg.run()`)
- The full data schema (Run, OutcomeEvent, WorkUnit, WorkUnitRunLink, PricingCatalog)
- WR-Structural computation engine
- Local SQLite storage
- All of Level 1

**Proprietary (xerg.ai, paid tiers):**
- Hosted dashboard with persistence and historical trends
- CPO/OY computation at scale (Level 2 analytics)
- Policy-as-code engine with CI/CD, runtime, and post-run enforcement
- Systems-of-record connectors (Jira, GitHub, Linear, Zendesk webhooks)
- Multi-team governance, chargeback reporting
- Anonymized cohort benchmarking (if offered)
- All of Level 3

The boundary in plain language: **"Free: know what your AI wastes, locally. Paid: know what your AI is worth, as a team."**

This boundary is non-negotiable. The open-source tool is the distribution engine and trust foundation. Charging for local analysis or gating WR-Structural behind a paywall would optimize for short-term revenue at the expense of adoption. The paid product earns its price by providing collaboration, governance, and enforcement that only make sense in a team/org context.

---

## 6. How Xerg Gets Data

Xerg needs two data streams: **Cost** (automatic) and **Outcomes** (user-provided). The architecture is designed to make Cost zero-friction and Outcomes as easy as possible.

### 6.1 Cost Ingestion (automatic)

Xerg ingests cost data through multiple channels, prioritized by ease of adoption:

**Channel 1: OpenClaw Gateway Logs (Adapter #1 — ships first)**
OpenClaw already emits structured logs with model, tokens, cost, latency, and session metadata via its `diagnostics-otel` plugin. Xerg reads these with one-command enablement. As a fallback for environments where OTLP export is flaky, Xerg also supports direct session log import (parsing JSONL files). This is the beachhead.

**Channel 2: OpenTelemetry GenAI Ingestion (standards-based — ships second)**
The OTel GenAI semantic conventions define standardized spans and metrics for model calls, agent operations, and tool executions. Any framework that emits OTel GenAI telemetry can feed Xerg. This includes instrumented versions of LangChain, CrewAI, OpenAI Agents SDK, and others through the `opentelemetry-instrumentation-genai` ecosystem. Xerg exposes an OTLP endpoint that receives these signals and computes economics. Because the GenAI semantic conventions are still in "Development" status with an explicit opt-in mechanism (`OTEL_SEMCONV_STABILITY_OPT_IN`), **Xerg stores the semconv version per source and supports multiple versions concurrently.** This is non-optional for a cross-platform ingestion layer — version churn is real and Xerg must be tolerant of it.

**Channel 3: Xerg SDK (lightweight wrapper — ships in parallel)**
For teams not using OTel, Xerg provides a thin SDK that wraps LLM client calls:

```python
from xerg import wrap
import openai

client = wrap(openai.Client())
# Every call is now tracked automatically
```

The SDK emits Xerg Run events (which are OTel-compatible) without requiring the user to configure an OTel pipeline. It's the "one-line integration" path.

**Channel 4: Direct API (for custom stacks)**
POST a Run object to `api.xerg.ai/v1/runs` with cost data. For teams with their own telemetry.

### 6.2 Outcome Ingestion (user-provided)

This is the hard part — and the moat. Every outcome signal creates an OutcomeEvent in the append-only event stream. Outcomes are never "edited" — if a ticket reopens, that's a new OutcomeEvent with `outcome = reopened`. WorkUnit state is always a materialized view of the latest event.

Xerg makes outcome capture as frictionless as possible:

**Method 1: SDK Inline**
```python
with xerg.run(workflow="support_agent", work_unit="ticket:4521") as run:
    result = agent.execute(ticket)
    run.outcome("success" if result.resolved else "failure",
                type="ticket_closed",
                value=5.0)
```

Under the hood, this creates a WorkUnitRunLink (with `allocation=1.0, reason=direct`) and emits an OutcomeEvent. Multiple Runs can reference the same work_unit ID — Xerg aggregates them automatically via the linking table.

**Method 2: Async Webhook / Systems of Record**
Connect Xerg to business systems (Jira, Linear, GitHub, Zendesk, custom) via webhooks. When a ticket closes — or reopens — Xerg emits an OutcomeEvent and updates the WorkUnit's materialized state. Late-arriving outcomes are handled naturally because the event stream is append-only.

```
POST api.xerg.ai/v1/outcomes
{
  "work_unit_id": "ticket:4521",
  "work_unit_type": "ticket",
  "outcome": "success",
  "value": 5.0,
  "source": "jira"
}
```

**Method 3: Batch Import**
Upload a CSV mapping work_unit_ids (or run_ids, or time windows + workflow names) to outcomes. Each row creates an OutcomeEvent with `source = batch`. For teams that want to retroactively compute unit economics on existing data.

**Method 4: Heuristic Inference (Level 1 only)**
When no outcome data is provided, Xerg still computes WR-Structural using heuristics: retry detection, context size analysis, task-class complexity scoring, loop detection. This means the free tier works with zero user input beyond having cost logs.

---

## 7. Integration Architecture

Xerg is not a platform plugin. It's a cross-platform economic layer. The architecture has three parts:

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ OpenClaw │ │ LangChain│ │ CrewAI   │ │ OpenAI    │  │
│  │ Gateway  │ │ /Graph   │ │          │ │ Agents    │  │
│  │ Logs     │ │ Traces   │ │ Traces   │ │ SDK       │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘  │
│       │             │            │             │         │
│       ▼             ▼            ▼             ▼         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           ADAPTERS / IMPORTERS                   │    │
│  │  OpenClaw → Xerg Run                            │    │
│  │  OTel GenAI OTLP → Xerg Run                    │    │
│  │  Xerg SDK (Python/TS) → Xerg Run               │    │
│  │  Direct API → Xerg Run                          │    │
│  └───────────────────┬─────────────────────────────┘    │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   XERG CORE                              │
│                                                          │
│  ┌──────────────┐ ┌───────────────┐ ┌────────────────┐  │
│  │ Economic     │ │ Waste         │ │ Optimization   │  │
│  │ Ledger       │ │ Taxonomy      │ │ Engine         │  │
│  │              │ │               │ │                │  │
│  │ Stores Runs, │ │ Classifies    │ │ Generates      │  │
│  │ computes     │ │ spend into    │ │ actionable     │  │
│  │ CPO, OY, WR  │ │ productive    │ │ recommendations│  │
│  │ over time    │ │ vs. waste     │ │ with $ impact  │  │
│  └──────────────┘ └───────────────┘ └────────────────┘  │
│                                                          │
│  ┌──────────────┐ ┌───────────────┐ ┌────────────────┐  │
│  │ Policy       │ │ Forecasting   │ │ Benchmarks     │  │
│  │ Engine       │ │ Engine        │ │ (anonymized    │  │
│  │ (enterprise) │ │ (enterprise)  │ │  cohort data)  │  │
│  └──────────────┘ └───────────────┘ └────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   DELIVERY                               │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ CLI      │ │ Dashboard│ │ Chat     │ │ API       │  │
│  │ (xerg    │ │ (xerg.ai)│ │ Reports  │ │ (CI/CD,   │  │
│  │  audit)  │ │          │ │ (Slack,  │ │  webhooks,│  │
│  │          │ │          │ │  etc.)   │ │  internal)│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key architectural principles:

1. **Adapters are thin.** Each adapter's only job is to convert a platform's native telemetry into Xerg Run events. The economics engine is platform-agnostic.

2. **OTel GenAI is the standard path.** The OpenTelemetry GenAI semantic conventions already define spans for model calls (`gen_ai.chat`), agent invocations (`invoke_agent`), tool executions (`execute_tool`), and metrics for token usage and cost. Xerg's OTLP ingestion endpoint accepts these signals natively. Any framework that instruments with OTel GenAI becomes a Xerg data source without a custom adapter. Because these conventions are still maturing, Xerg stores the semconv version per source and handles multiple versions concurrently.

3. **Outcome data is additive, not required.** Level 1 (Waste Intelligence) works with cost data alone. Outcome data unlocks Level 2 and 3 but is never a gate to getting started.

4. **Local-first for individuals, cloud for teams.** The free tier (CLI + OpenClaw skill) runs entirely locally with SQLite. The paid tiers use xerg.ai (Cloudflare Workers + D1) for persistence, dashboards, and team features.

5. **Metadata-only by default. No prompts, no responses, no content.** Xerg operates on economic metadata: model names, token counts, costs, latency, workflow tags, outcome labels. It never requires — and by default never ingests — prompt content, response content, or user data. OTel GenAI events can include input/output content depending on instrumentation settings; Xerg strips or redacts this before storage unless the customer explicitly opts in. For enterprise, Xerg supports hashing modes, redaction rules, and a local-only collector option where no data leaves the customer's infrastructure. This posture is non-negotiable for enterprise adoption and differentiated from observability tools that need content for debugging.

---

## 8. What Customers Provide (The Data Contract)

### Minimum (Level 1 — Waste Intelligence):
- **Nothing.** If they use OpenClaw or any OTel-instrumented framework, Xerg reads the existing telemetry. If they use the SDK, it auto-captures cost data.

### For Level 2 — Unit Economics:
- A success/failure flag per run or per work unit (emitted as an OutcomeEvent)
- An outcome type label (string)
- Optionally: a work_unit_id linking Runs to business objects (ticket_id, pr_id, case_id)
- Optionally: a numeric value weight per outcome type (relative points to start, dollars later)
- Optionally: allocation weights for shared-overhead Runs that serve multiple WorkUnits

This is one SDK call: `run.outcome("success", type="ticket_closed", value=5.0)`

Or one webhook from their ticketing/PM system when a business object resolves (or reopens — the OutcomeEvent stream handles state changes naturally).

### For Level 3 — Economic Governance:
- Outcome definitions with dollar or relative values (supporting multiple value models per team)
- Team/project/business-unit tags on runs
- Policy definitions as code (acceptable CPO ranges, model governance rules, spend caps)
- Integration credentials for systems of record (Jira, GitHub, etc.)
- WorkUnit linkage for full multi-step attribution

---

## 9. Competitive Positioning

### What exists today:

| Category | Examples | What they do | What they don't do |
|----------|----------|--------------|--------------------|
| Cost trackers | 40+ ClawHub skills, Helicone | Show token spend by model/time. Helicone's docs use the phrase "unit economics" but mean per-request cost breakdowns, not outcome-adjusted economics. | No outcome linkage, no WorkUnit-level CPO, no waste taxonomy |
| Model routers | Smart Model Switching, ClawRouter | Route to cheapest model per task complexity | No outcome awareness, optimize cost without knowing value |
| Observability | Langfuse (acquired by ClickHouse at $15B), Arize ($70M Series C), LangSmith | Traces, quality evals, latency, debugging | Stop at performance; don't compute economics |
| Cloud FinOps | CloudZero ($56M Series C, positioning around "tying cloud decisions to business outcomes"), Datadog ($2B+ rev) | Infrastructure cost attribution. CloudZero is explicitly moving toward outcomes language but at cloud infra level, not per-inference agent level. | Not designed for run-level, per-outcome AI agent economics |
| AI control planes | Portkey ($15M Series A, Feb 2026) | API gateway sitting in the request path with cost tracking, caching, fallbacks. Already has distribution and could expand into governance. | Currently focused on reliability + cost, not outcome-adjusted economics or policy-as-code |

### Where Xerg sits:

**Xerg occupies the empty space between observability and FinOps: outcome-adjusted unit economics + economic policy.**

Observability tools tell you *what happened* (traces, evals). FinOps tools tell you *what it cost* (spend dashboards). AI control planes manage *how requests flow* (routing, caching). Xerg tells you *what it was worth* (outcome-adjusted economics) and *enforces economic discipline* (policy-as-code governance).

The differentiation line that must survive every investor conversation: **"Outcome-adjusted unit economics + policy. Not cost. Not routing. Not observability."**

### The "feature of Datadog / Portkey / CloudZero" objection:

Investors will ask: "Won't incumbents just add this?"

Answer: They might add cost dashboards — several already have. But outcome-adjusted economics requires three things incumbents are poorly positioned to build: (1) deep integration with business systems of record (Jira, GitHub, CRMs) for WorkUnit resolution, (2) domain-specific outcome modeling and valuation, and (3) an economic policy engine that integrates into CI/CD and approval workflows. That's a different product, different buyer, different sales motion.

Portkey is the most credible adjacent threat because they sit in the request path and have engineering distribution. But their value prop is reliability and cost optimization — they're an API gateway, not an economic ledger. Expanding from "route requests cheaply" to "compute the unit economics of business outcomes" is a category change, not a feature add.

CloudZero is moving toward "outcomes" language but at the cloud infrastructure level (cost per customer, cost per environment). They don't have per-inference, per-agent-run, per-WorkUnit economics. Getting there from cloud cost attribution requires rebuilding their data model.

The observability incumbents (ClickHouse/Langfuse, Arize) view AI as another telemetry source. Xerg views AI as a capital allocation problem. Different altitude, different buyer.

---

## 10. Market Timing

The timing is not just good — it's structurally aligned:

- **FinOps Foundation State of FinOps 2026:** 98% of respondents manage AI spend. Unit economics and AI value quantification are among the fastest-rising priorities. The exact language used is "cost per unit of work" and "measuring AI's business impact."

- **"Inference Economics" is now a named discipline:** Industry analysts are writing about the shift from "does AI work?" to "is AI profitable?" The specific metrics being called for — cost per resolved ticket, human-equivalent hourly rate, revenue velocity — are precisely what Xerg computes.

- **Consolidation validates the layer below:** ClickHouse acquiring Langfuse at a $15B valuation, Arize raising $70M, Cast AI raising $108M — this tells us the telemetry and infrastructure layers are consolidating. The economics layer on top is still wide open.

- **Standards are ready:** OTel GenAI semantic conventions are maturing, with defined spans for model calls, agent operations, and tool executions. This means Xerg can build a cross-platform ingestion layer on real standards, not heroic bespoke integrations.

- **Agent spend is exploding:** Agentic loops hit an LLM 10-20x per task. RAG context creates a "context tax." Always-on monitoring agents consume compute 24/7. Deloitte estimates inference workloads will account for roughly two-thirds of all AI compute in 2026 (up from a third in 2023), and industry analyses consistently find that inference represents 80-90% of total compute costs over a model's production lifecycle. The problem Xerg solves is the dominant and fastest-growing cost driver in enterprise AI.

---

## 11. The $1B Question

Xerg becomes a $1B company if it becomes the **economic system of record + control plane for AI agent operations** — the place where organizations go to understand whether their AI investment is producing returns, and to enforce economic discipline on how it's spent.

The path:

1. **Wedge:** Free waste intelligence for individual developers via OpenClaw skill + CLI. Creates installs, screenshots, case studies, bottom-up adoption.

2. **Expand:** Paid unit economics for teams that need to justify or optimize AI spend. Cost per outcome becomes the metric engineering leaders report to finance.

3. **Platform:** Economic governance for enterprises with $100K+/month AI spend. Policy-as-code, chargeback, compliance, forecasting. This is the Bloomberg Terminal layer — it's not optional tooling, it's required infrastructure for AI capital allocation.

The moat is not a single feature. It's the accumulation of:

- **Economic ledger standardization:** Once an organization's AI spend history, outcome data, and WorkUnit economics live in Xerg, migrating that data and those computations is painful. This is the "system of record" lock-in.
- **Policy-as-code integrations:** Once CI/CD pipelines, approval workflows, and runtime circuit-breakers reference Xerg policies, ripping it out breaks operational processes.
- **Systems-of-record connectors:** The Jira/GitHub/Linear/Zendesk integrations that auto-resolve WorkUnit outcomes are integration work that customers don't want to redo.
- **Outcome taxonomy:** The standardized way an organization defines and values its AI outcomes (ticket_closed = $X, pr_merged = $Y) becomes institutional knowledge encoded in Xerg.

Optional future upside: anonymized cohort benchmarking across the customer base. Powerful if achieved, but not the foundation — many orgs won't opt in, and representativeness takes time to build.

The ceiling is not "cost savings tool" (that's $100-300M). The ceiling is "AI capital efficiency platform" — the financial control plane for how organizations invest in AI. That market scales with AI spend itself — and enterprise AI spending more than tripled from 2024 to 2025, with AI cloud infrastructure doubling year-over-year. The cost problem is accelerating faster than the tooling to manage it.

---

## 12. What We Ship First

Given everything above, the v0 must demonstrate the *altitude* of the product even if the initial *scope* is narrow.

**v0 delivers Level 1 (Waste Intelligence) with the schema and interfaces designed for Level 2 and 3.**

**The 30-second first experience is a non-negotiable design constraint.** A developer who has never heard of Xerg must be able to go from zero to seeing their first waste report in under 30 seconds. No account creation, no configuration file, no API key, no network access. One command, one output, one "holy crap" moment. If the onboarding path requires more than that, we've failed the distribution test — because every second of friction between "heard about it" and "saw the report" is a lost install, a lost screenshot, a lost tweet. This constraint governs CLI design, packaging, adapter defaults, and output formatting.

Concretely:

- The Run, OutcomeEvent, WorkUnit, WorkUnitRunLink, and PricingCatalog schemas exist from day one with all fields, even if outcome and work_unit fields are unused for v0 users
- The PricingCatalog ships with current list prices for all major providers; `cost_source` is labeled "observed" or "estimated" from the start
- The CLI output format shows "Cost per Outcome: N/A (enable outcome tracking to unlock)" — making the upgrade path visible
- The WR-Structural waste taxonomy produces the "holy crap" screenshot moment, with honest language: "candidate downgrade opportunities" not "proven waste"
- The OpenClaw adapter is Adapter #1 (with session log fallback), but the architecture is clearly adapter-based with trace_id/span_id/semconv_version correlation ready for OTel
- The SDK includes `xerg.track(outcome=..., work_unit=...)` from the first release — under the hood emitting OutcomeEvents and WorkUnitRunLinks, even if the analytics for them are basic
- Derived metrics are versioned (`xerg_engine_v0.1`) from day one — even if there's only one version, the pattern is established
- Post-run alerting ships as the first policy enforcement point (non-blocking, easy to adopt)

This way, nothing is vestigial. The free cost features serve the economics vision. The schema supports the full product. And the first screenshot an angel investor sees includes "Cost per Outcome" as a metric — even if it says "enable to unlock" for some users.

---

## 13. What This Document Governs

Every subsequent document — technical build plan, pricing strategy, GTM plan, pitch deck, SDK spec, UI mockups — must be consistent with this definition.

Specifically:

- **If a feature doesn't connect to CPO, OY, or WR**, question whether it belongs.
- **If a dashboard shows spend without waste classification**, it's incomplete.
- **If we describe Xerg as a "cost tracker"**, we've lost the plot.
- **If the pricing page says "save money on AI"**, rewrite it. We say "understand the unit economics of your AI agents."
- **If the SDK doesn't include outcome tracking (OutcomeEvent emission) and work_unit linkage (WorkUnitRunLink) primitives**, it's shipping incomplete.
- **If an adapter doesn't normalize to the Run schema with trace_id correlation and semconv_version tagging**, it doesn't ship.
- **If cost is computed without labeling observed vs estimated**, it's misleading.
- **If WR claims "model mismatch is waste" without outcome data**, reframe as "candidate downgrade opportunity."
- **If Level 3 features don't include policy-as-code**, they're missing the defensibility story.
- **If the first experience takes more than 30 seconds from zero to first report**, we've failed the distribution test.
- **If any Level 1 feature requires an account, API key, or network access**, it violates the open-core boundary.

The tagline is not "see what your AI costs."

The tagline is: **"Know what your AI is worth."**
