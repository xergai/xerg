# Xerg Go-To-Market, Pricing, and Distribution

Status: current with directional future packaging notes

## Positioning

Xerg should be positioned as:

- the economic intelligence layer for AI agent work
- a product that starts with waste intelligence
- a product that reports in dollars, not just tokens

The current site and CLI should reinforce a simple narrative:

> Spend dashboards show totals. Xerg shows where money is leaking and what to change next.

## Current Wedge

The active wedge is:

- OpenClaw users first
- local analysis first
- CLI first
- waste intelligence first

This wedge matters because it keeps Xerg in a problem space where:

- the data is relatively accessible
- the feedback loop is short
- the report can be trusted quickly
- users can test one fix and re-run compare

## Current Public Entry Points

### Website

- `xerg.ai`

Purpose:

- explain the wedge quickly
- position Xerg against dashboards, routers, and observability tools
- capture demand

### Pilot page

- `xerg.ai/pilot`

Purpose:

- invite OpenClaw users into a lightweight real-world test
- show exact install and audit commands
- make feedback easy

### npm package

- `@xerg/cli`

Purpose:

- real product distribution
- low-friction install path
- early proof that Xerg is usable without a hosted account

## Current Messaging Truth

### Strong current messages

- Xerg finds agent spend leaks
- Xerg classifies structural waste
- Xerg shows before/after change after a fix
- Xerg is local-first and no-account

### Messages that are only directional today

- cost per outcome
- outcome yield / ROI
- governance and policy
- multi-framework support beyond OpenClaw

These are valuable strategic directions, but not current shipped truth.

## Pricing Posture

### Current pricing truth

- CLI beta is free
- site is free
- there is no billing in the repo
- there is no public pricing page with hardened tiers

### Why pricing is not hardened yet

The key reason is product truth:

- the audit still needs broader real-world validation
- users must first trust the report
- the CLI is currently the adoption wedge, not the monetization surface

### Directional future packaging

These are still useful internal shapes, but not public commitments:

- Free: local CLI, local history, local reports
- Team: hosted history, shared reporting, team visibility
- Business: broader controls, more history, decision support
- Enterprise: governance, policy, and custom support

### Governing pricing principle

Charge later for:

- durable value
- shared visibility
- retained history
- outcome-aware economics
- governance

Do not charge now for:

- access to the command-line wedge
- raw volume of tracked runs

## Distribution Order

The current intended order is:

1. private repo and private beta
2. public npm distribution
3. pilot demand and feedback
4. OpenClaw Hub
5. `skills.sh`
6. hosted team product later

## Current Distribution Actions

The current distribution work should be operational, not abstract.

### Outreach cadence per meaningful push

- 15 developer messages
- 10 investor awareness messages
- 1 public post

This cadence is meant to create learning and conversations, not vanity.

### Developer outreach template

Use for OpenClaw users, GitHub issues, Discord, X, or warm technical contacts:

> Hey, quick question. I built a CLI called Xerg that analyzes the economics of AI agent workflows. It shows cost, retry waste, loop waste, and before/after improvements. It works with OpenClaw. I’m looking for a few early users who are actively running agent workflows to test it for 10 minutes and tell me if the report is useful. No signup, just npm install. Trying to figure out if this solves a real problem.

### Investor awareness template

Use for warm investor, founder, or operator relationships before an actual raise:

> Working on something in the AI agent infrastructure space. Short version: Xerg is building economic observability for agent systems, starting with a CLI that shows where workflow spend is leaking and how it changes after a fix. The first package is live, and early OpenClaw users are testing it now. I’d love to show you a 5-minute demo and get your reaction. No pitch, just signal gathering.

### Public post template

Use for X or other public channels:

> I built a CLI that answers a question I couldn’t find a tool for: where is my AI agent workflow actually wasting money? Xerg analyzes OpenClaw runs, shows retry waste, loop waste, context bloat, and before/after changes after a fix. Looking for a few people running real agent workflows who want to test it.

### Operating discipline rule

No new feature work until 10 external users have installed the CLI. Bug fixes are allowed. Feature work is not.

This rule exists because the current risk is not insufficient product. It is insufficient distribution. The natural founder instinct is to retreat into code when outreach feels uncertain. This rule prevents that. The CLI is shippable now. The work that matters is getting it into hands and learning from real usage.

## Current Support and Feedback Paths

- Waitlist and pilot traffic to `xerg.ai`
- Email support and pilot feedback to `query@xerg.ai`

This is enough for the current stage, but public beta will still need a more explicit intake rhythm and response commitment.

## Public Beta Gate

The current public-beta-ready definition is not "the package exists."

It is:

- clean install path
- useful first audit
- useful compare flow
- believable findings on real OpenClaw data
- support and feedback path live
- docs and site not overpromising

## Current Beta Gaps

The big remaining gap is still real-log validation:

- run Xerg on multiple real OpenClaw datasets
- verify findings quality on real data
- verify pricing coverage against real models observed
- verify install and report usefulness outside the repo author environment

## Marketing Implications

Marketing should emphasize:

- dollars, not tokens
- local-first trust
- before/after proof
- real workflow waste

Marketing should not emphasize:

- dashboards
- governance
- enterprise controls
- broad runtime support

until those things actually exist.

## Positioning Line Bank

These lines are intentionally split between current-safe messaging and strategic future messaging.

### Current-safe lines

- `Know what your AI is worth.`
- `Spend dashboards show totals. Xerg shows where money is leaking and what to change next.`
- `Audit OpenClaw agent spend, waste, and before/after improvements.`
- `Dollars, not tokens.`
- `One command. No account.`
- `Start with waste intelligence. Earn the right to talk about unit economics later.`

### Strategic future lines

Use only when the context is clearly strategic, investor-facing, or roadmap-oriented:

- `XergLedger tracks what happened. XergCore measures whether it was worth it.`
- `XergLedger is to XergCore what LangChain is to LangSmith.`
- `Vector databases store what you know. XergLedger stores what you did.`
- `Operational intelligence is free and local. Economic intelligence is paid and hosted.`
- `The unit economics engine for AI agents.`

## Investor Narrative

The strongest investor-friendly narrative that remains compatible with current reality is:

- AI agents are becoming operational systems
- current tooling measures usage and traces, not economics
- Xerg starts at the lowest credible layer of that stack: waste intelligence
- if Xerg wins trust there, it grows upward into unit economics and governance

This is stronger than pretending the hosted platform already exists.

## Strategic Precedent References

These references are not product truth. They are strategic context for GTM and investor conversations.

- LangChain / LangSmith is the closest open-core precedent for the XergCore / XergLedger shape
- HashiCorp is the strongest infrastructure precedent for open-source distribution leading into paid control planes
- Vercel shows how a strong open-source distribution surface can amplify a commercial platform
- Grafana Labs shows the durability of observability-style open-core ecosystems with paid hosted value on top

Working benchmark references used in internal strategy conversations:

- LangChain is often referenced internally around `$1.25B` valuation on approximately `$12M-$16M ARR`
- HashiCorp is often referenced as the strongest infrastructure precedent, culminating in a roughly `$6.4B` acquisition
- Grafana Labs is often referenced as an observability precedent at `$300M+ ARR`
- Vercel is used more as a product and ecosystem precedent than a direct financial benchmark in the current Xerg docs

These references are useful because they give stakeholders shorthand for the model Xerg may evolve into later, without pretending Xerg is already there now.
