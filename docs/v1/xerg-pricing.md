# Xerg — Pricing Strategy

**xerg.ai**

---

## Pricing Philosophy

Xerg shows organizations the unit economics of their AI agents. Pricing must reflect that value proposition — not "we save you money" but "we show you what your AI is worth, and help you make it worth more."

Three principles govern every pricing decision:

**1. Free users are the distribution channel, not the product.** Every individual developer running `npx xerg audit` is a future employee at a company spending $50K/month on AI agents. Charging individuals creates friction where you need virality. The open-source CLI is the top of the funnel. This is non-negotiable.

**2. Charge for economic intelligence and governance, not volume.** Never charge per Run tracked. That punishes your best customers and creates anxiety about the economics tool itself. Instead, charge for the *altitude of intelligence*: waste detection is free, unit economics and team visibility are paid, governance and policy enforcement are enterprise.

**3. Maintain 10x+ value-to-price ratio at every tier.** If a customer pays us $199/month, the economic intelligence they gain (waste identified, CPO improvements, outcome-adjusted optimization) should be worth $2,000+/month in operational clarity and savings. When the ratio is 10x, pricing is never a sales objection.

---

## Tier Structure

### Free — $0/month, forever

**Who:** Individual developers, solo builders, anyone running AI agents.

**What they get (Level 1 — Waste Intelligence):**
- WR-Structural analysis: all five waste categories (retry waste, context bloat, candidate downgrade opportunities, loop waste, idle waste) with dollar amounts
- Full cost reports: by model, by workflow, by time period, with observed vs. estimated cost distinction
- Optimization recommendations with estimated dollar savings and A/B test suggestions
- Budget alerts, anomaly detection, runaway loop detection
- Before/after comparisons when optimizations are applied
- CLI output in terminal, JSON, and Markdown (shareable)
- 100% local — no data leaves their machine, no account required, no network access

**What it is:** The `xerg` CLI published on npm and Homebrew, plus the OpenClaw skill on ClawHub. It never costs money. Every install is a potential future team account.

**Conversion trigger:** Developer shows their waste report to their engineering lead. Lead says "I want this for the whole team — and I want to know our cost per ticket."

---

### Team — $199/month

**Who:** Engineering teams (2-10 people) at startups and mid-size companies spending $1K-50K/month on AI agents.

**What they get (Levels 1-2 — Waste Intelligence + Unit Economics):**
- Everything in Free, plus:
- Hosted dashboard at xerg.ai with historical trends, charts, exportable reports
- Up to 10 team members with shared visibility (Clerk org)
- **Cost per Outcome (CPO)** by workflow, agent, model, time period — computed at the WorkUnit level
- **Outcome Yield (OY)** rankings across workflows — which agents produce the most value per dollar
- **WR-Outcome** — spend on failed vs. successful WorkUnits (requires outcome tagging)
- Outcome valuation: start with relative points, evolve to dollar values
- Cost regression detection: "This deploy increased CPO by 34%"
- Slack and email alerts on budget thresholds and CPO degradation (via Resend)
- SDK telemetry: `@xerg/sdk` sends Runs to xerg.ai for team-wide analysis
- OTel GenAI ingestion endpoint for multi-framework support
- 1M tracked Runs/month
- 30-day data retention

**Target customer value:** $2,000-15,000/month in economic intelligence (waste reduction + outcome-adjusted optimization decisions)

**Conversion trigger:** Finance asks engineering "what are we spending on AI and what are we getting for it?" and nobody can answer with unit economics. Or: an engineering lead sees individual team members using the free CLI and wants a unified view with CPO.

**Why $199:** Low enough to go on a credit card without procurement approval at most startups. High enough to signal real product. The jump from Free reflects the shift from local analysis to team collaboration + unit economics — not just "more of the same in a browser."

---

### Business — $499/month

**Who:** Engineering orgs (10-50 people) at companies spending $10K-100K/month on AI agents, with multiple teams or products.

**What they get (Levels 1-3 — Waste Intelligence + Unit Economics + Economic Governance):**
- Everything in Team, plus:
- Unlimited team members
- **Policy-as-code:** define economic governance rules (CPO caps per workflow, model governance, spend limits per WorkUnit)
- **Post-run policy enforcement:** alerts on violations, auto-created remediation issues (Jira, GitHub Issues)
- **CI/CD policy gates:** block deploys that regress CPO beyond thresholds (GitHub Action)
- Systems-of-record connectors: Jira, GitHub, Linear webhooks for automatic outcome tagging
- WorkUnit many-to-many attribution with allocation weights for shared overhead
- Cross-team cost attribution and chargeback reporting
- API access for internal dashboards, CI/CD integration, automated reporting
- Multi-framework support (OpenClaw + LangChain + CrewAI + OpenAI Agents SDK + direct API)
- 10M tracked Runs/month
- 90-day data retention
- Priority support (24hr response)

**Target customer value:** $5,000-50,000/month in economic intelligence + governance (CPO optimization + policy-driven waste elimination + outcome-adjusted resource allocation)

**Conversion trigger:** Company has multiple AI products or teams, no centralized unit economics, and increasing pressure from finance to justify the AI budget line item. The policy enforcement is the key differentiator from Team — it doesn't just show you the economics, it enforces economic discipline.

**Why $499:** Still self-serve purchasable by an engineering VP without a full procurement cycle. The jump from $199 reflects the shift from visibility to governance — the product is actively enforcing economic discipline, not just reporting.

---

### Enterprise — Custom ($2,000-10,000+/month)

**Who:** Organizations spending $100K+/month on AI agents with dedicated platform engineering or FinOps teams.

**What they get (Full Level 3 — Economic Governance + Enterprise):**
- Everything in Business, plus:
- SSO/SAML authentication (Clerk enterprise)
- **Runtime policy gates:** SDK middleware that evaluates policy before/during Runs (deny, route, escalate)
- Business-unit cost allocation and chargeback reporting for finance
- Compliance and audit reporting (immutable Run log with engine version provenance)
- Portfolio-level AI capital allocation guidance
- Forecasting: projected spend and CPO for next period
- Monte Carlo simulation for spend volatility
- Custom outcome valuation models per team
- Dedicated customer success manager
- Custom onboarding and integration support
- SLA (99.9% uptime)
- Unlimited data retention
- Custom connectors for internal systems
- Volume-based pricing for 100M+ Runs/month

**Target customer value:** $50,000-500,000+/month in economic intelligence + governance + capital efficiency

**Conversion trigger:** Procurement requires vendor evaluation, security review, and an enterprise agreement. Often enters from the bottom up — a developer or team was already using Free or Team tier and championed the tool internally.

**Why custom pricing:** Enterprise deals are inherently bespoke. The $2K-10K range accounts for different organization sizes, compliance needs, and deployment models. Anchor on economic value delivered (CPO improvement, waste reduction, governance compliance), not Runs consumed.

---

## What We Don't Do

**We don't charge per Run tracked.** Punishes power users, creates cost anxiety about the economics tool, and incentivizes customers to track less (which makes our unit economics computations worse). Volume limits exist per tier but they're generous enough that 95%+ of customers in each tier never hit them.

**We don't charge a percentage of savings.** Sounds elegant, fails in practice. Proving the counterfactual is endlessly debatable. Enterprise procurement hates variable pricing. And it creates a perverse incentive where we benefit from their costs staying high. Use the value ratio as a *sales narrative*, not a billing model. "Xerg customers typically improve CPO by 30-50% — at $199/month, the dashboard pays for itself before lunch on day one."

**We don't charge individuals. Ever.** The open-source CLI is the top of the funnel. Throttling it or gating WR-Structural behind a paywall optimizes for short-term revenue at the expense of long-term distribution. Datadog didn't charge individual developers to install their agent. Neither do we.

**We don't charge for outcome tracking primitives.** The SDK's `xerg.track(outcome=...)` ships in the open-source package. The *computation* of CPO/OY/WR-Outcome at team scale is what's paid — not the act of tagging outcomes.

---

## Pricing Rollout

| Phase | Action |
|-------|--------|
| **Launch** | Everything free. No pricing page. Just a "Teams waitlist" email capture on xerg.ai. Focus on installs, waste reports, case studies. |
| **Validate** | Launch Team tier at $199/month via Stripe Checkout. Goal: 5-10 paying teams in the first batch. If conversion rate from free users is <1%, the product isn't ready — iterate on features, not pricing. |
| **Expand** | Launch Business tier at $499/month. This requires policy engine and systems-of-record connectors to be production-ready. The governance is what justifies the price jump. |
| **Enterprise** | Begin enterprise conversations. These will happen organically — someone at a large company used the free CLI, loved it, brought it to their platform team. Have a "Contact Sales" option on the pricing page. |
| **Revisit** | With real data on customer CPO improvements and willingness to pay, consider whether tiers need adjustment. The most common change at this stage: Team price goes up (because it's underpriced relative to value) and a new "Starter" tier fills the $49-99/month gap for very small teams. |

---

## Revenue Modeling

**Conservative scenario (early):**
- 1,000 free users (CLI + SDK)
- 30 Team accounts × $199 = $5,970/month
- 5 Business accounts × $499 = $2,495/month
- 0 Enterprise accounts
- **Total MRR: ~$8,500**

**Moderate scenario (growth):**
- 5,000 free users
- 100 Team accounts × $199 = $19,900/month
- 25 Business accounts × $499 = $12,475/month
- 3 Enterprise accounts × $5,000 = $15,000/month
- **Total MRR: ~$47,000**

**Aggressive scenario (breakout):**
- 10,000+ free users
- 200 Team accounts × $199 = $39,800/month
- 50 Business accounts × $499 = $24,950/month
- 8 Enterprise accounts × $7,500 = $60,000/month
- **Total MRR: ~$125,000**

Key assumptions: 3-5% free-to-paid conversion rate (industry standard for PLG dev tools), 120% net revenue retention (teams expand usage over time), 2% monthly churn on Team tier, <1% on Business/Enterprise.

---

## Competitive Pricing Context

| Competitor | Pricing Model | Our Position |
|-----------|---------------|-------------|
| **Portkey** ($15M Series A) | Usage-based: starts free, scales with API calls | We're simpler (flat monthly) and we compute unit economics, not just cost |
| **Helicone** (YC W23) | Free tier + $20/month Pro + custom Enterprise | Similar structure, but they charge individuals and don't compute outcome-adjusted economics |
| **Langfuse** (acquired by ClickHouse) | Free self-hosted, cloud starts at $59/month | They charge for hosting observability. We charge for economic intelligence. Different value prop. |
| **CloudZero** ($56M Series C) | Custom enterprise pricing (typically $3K-20K/month) | We start where they can't reach (individual devs) and grow into their territory. They do cloud infra cost, not agent-level unit economics. |
| **Datadog** (public, $2B+ revenue) | Per-host, per-metric pricing. Notoriously expensive at scale. | Our cautionary tale. Don't build pricing that customers hate. Stay flat and predictable. |

---

## The Metric That Governs All Pricing Decisions

**Value-to-price ratio. Keep it above 10x at every tier.**

| Tier | Price | Target Value Delivered | Ratio |
|------|-------|----------------------|-------|
| Free | $0 | WR-Structural waste identification ($30-500/month in actionable savings) | ∞ |
| Team | $199 | CPO visibility + waste reduction ($2,000-15,000/month) | 10-75x |
| Business | $499 | Economic governance + policy enforcement ($5,000-50,000/month) | 10-100x |
| Enterprise | $2K-10K | Full capital efficiency platform ($50K-500K/month) | 25-50x |

"Value delivered" is measured by: waste identified and eliminated (WR reduction), CPO improvement (before/after), and governance compliance (policy violations caught and remediated). When this ratio drops below 10x for any tier, either the product isn't delivering enough value (fix the product) or the price is too high (fix the price). Never ship a price increase without validating the value ratio first.
