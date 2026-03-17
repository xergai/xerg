# Xerg Site Rewrite Brief

**Date:** March 17, 2026
**Files to change:** `apps/site/app/page.tsx` (homepage), `apps/site/app/pilot/page.tsx` (pilot page)
**Source of truth:** `docs/` — specifically `xerg-overview.md`, `xerg-product-users-and-current-capabilities.md`, `xerg-go-to-market-pricing-and-distribution.md`, `xerg-technical-architecture-and-operations.md`, `xerg-decisions-drift-and-open-questions.md`

**The docs/ directory is flat (no v1/v2 subdirectories). These are the canonical governing documents.**

---

## Governing rules (apply to both pages)

Rules 1–4 are defensive guardrails. If you're unsure about a micro-decision (a transition sentence, a meta tag, alt text, a tooltip), check these first.

1. **Do not claim OTel support.** Remove every mention of "OTel," "OpenTelemetry," "OTel GenAI spans," and "multi-framework." The only working data source is OpenClaw gateway logs and session transcripts.

2. **Do not publish concrete pricing.** No "$199/mo." No "$499/mo." No "Enterprise — custom." No Stripe-related anything. Replace the pricing grid with a value-ladder narrative that describes future layers without attaching prices.

3. **Do not present future capabilities as current.** These do not exist today: CPO, Outcome Yield, WR-Outcome, dashboards, hosted API, team collaboration, policy-as-code, CI/CD gates, runtime gates, Jira/GitHub/Linear connectors, chargeback reporting, spend forecasting, Monte Carlo simulation. They can appear as "what comes next" — never as "what you get."

4. **Do not name competitors in a negative frame.** Reference categories ("observability tools," "spend dashboards," "model routers") without naming Langfuse, Arize, LangSmith, or other specific products.

The section-by-section spec below gives exact copy for everything else. Follow it literally. Additionally: keep all existing components and patterns (`SignupForm`, `SectionIntro`, `CopyCommand`, `CliPreview`, `cn()`, Lucide icons, CSS variables, Tailwind v4, dark theme).

---

## Part 1: Homepage (`apps/site/app/page.tsx`)

### Section-by-section spec

---

### Nav

**Keep as-is** except change the GitHub link from `https://github.com/xergai` to `https://github.com/xergai/xerg` (link directly to the repo when it goes public — or keep the org link for now since the repo is private).

Nav links: "How it works" · "What you see" · "Pricing" → rename to "Where it goes" · "GitHub" · "Get early access →"

No other changes to nav structure.

---

### Hero section

**Badge text:**
```
Unit economics engine for AI agents
```
(Currently says "Economic audit for AI agents." "Audit" narrows the product to a one-time action. "Unit economics engine" matches the canonical product subtitle from v2.)

**Headline:**
```
Your agents spent $148 this week. $43 was waste.
```
(Keep as-is. This is the "holy crap" moment. The dollar-denominated hook works.)

**Subhead:**
```
Xerg reads your OpenClaw logs and tells you exactly where money is leaking —
retries, bloated context, expensive models on cheap tasks, runaway loops.
In dollars, not tokens. One command. No account.
```
(Changed: "agent logs" → "OpenClaw logs" to be honest about current scope. Everything else stays.)

**CTA group:**
- Primary: `npx @xerg/cli audit →`
- Secondary: `Join the waitlist`
- Note below: `Works wherever your OpenClaw logs live. No config. No network after install. 30 seconds to first report.`

(Changed: "Runs locally" → "Works wherever your OpenClaw logs live" because Xerg also works on a VPS or any remote box where the logs are accessible — not just local machines. Also changed "No network" → "No network after install" because `npx` requires a network call on first run. A developer will notice.)

**CLI mock (CliPreview component):**
Keep the entire CLI mock as-is. It is accurate to what the product does today. The waste breakdown, the dollar amounts, the "Cost per Outcome: unlock with outcome tracking →" teaser — all correct per v2. Do not change.

---

### Problem section (`id="how-it-works"`)

**Section label:** `The problem`

**Heading:**
```
You can see what you spent. You can't see what you wasted.
```
(Keep as-is.)

**Subhead:**
```
Every tool in the market shows you a spend total. None of them classify where
dollars are leaking or tell you which fix to try first.
```
(Changed: removed "which dollars produced outcomes and which ones burned in retries" — that's outcome-adjusted language the product can't deliver yet. Replaced with waste-classification language that matches current capability.)

**Problem cards (3 cards):**

Card 1 — keep as-is:
- Title: `Spend dashboards show totals`
- Body: `"You spent $4,200 this month on Claude." Great. Was that good? Bad? Where did it go? They can't tell you.`
- Example: `Total: $4,200` / `(that's it)`

Card 2 — keep as-is:
- Title: `Routers optimize the wrong thing`
- Body: `Smart routing picks the cheapest model per call. But if the workflow is retrying 6 times, the cheap model is not saving you anything.`
- Example: `Haiku × 6 retries = more expensive than Sonnet × 1`

Card 3 — **rewrite to remove competitor names:**
- Title: `Observability stops at traces`
- Body: `Observability tools show you what happened. Xerg shows you where money leaked and what to fix. Different question, different altitude.`
- Example label: `Their layer → our layer`
- Example: `traces, evals, latency → waste taxonomy, dollar impact, savings tests`

(Changed: removed "Langfuse, Arize, and LangSmith" by name. Changed "CPO, waste rate, outcome yield" to "waste taxonomy, dollar impact, savings tests" — these are things the product actually computes today, not future metrics.)

---

### Waste taxonomy section (`id="what-you-see"`)

**Keep the entire section as-is.** The five waste categories, dollar amounts, descriptions, and color coding all match the v2 product definition and terminology docs exactly. No changes needed.

---

### Differentiators section

**Section label:** `What makes Xerg different`

**Heading:**
```
Not a dashboard. Not a router. An economic audit.
```
(Keep as-is.)

**Subhead:**
```
Four things no other tool does today.
```
(Changed: removed "in the market" — minor tightening.)

**Differentiator cards (4 cards):**

Card 1 — **Dollars, not tokens** — keep as-is. Accurate.

Card 2 — **Structural waste taxonomy** — keep as-is. Accurate.

Card 3 — **REWRITE.** Currently titled "Cost per outcome path" with body text that says "Add one line of code" and presents outcome tracking as something the user can do today. This is future-state. Replace:

- Title: `Built for agent loops`
- Body: `Agent workflows produce closed loops — goal, plan, call, retry, result. That structure makes waste measurable with precision that open-ended copilots can't match. Xerg starts where the economics are legible: agent execution loops on OpenClaw.`
- Contrast: `Others: Generic cost dashboards for any AI workload. No opinion on where the signal is.`
- Icon: suggestion — keep `ChartColumnIncreasing` or swap to `Waypoints`

(This replaces a future-state feature claim with the agent-first strategic narrative, which is the strongest differentiated position and is true today.)

Card 4 — **Local-first, zero friction** — keep as-is. Accurate.

---

### Value ladder section (currently `id="pricing"`)

**This section gets the biggest structural change.** The current version is a 3-column pricing grid with dollar amounts. Replace it with a narrative value ladder — no prices, no tier names that imply purchasable plans.

**Section label:** `Where it goes`

**Heading:**
```
Start with waste intelligence. The rest earns its way in.
```
(Changed from "Start with waste. Graduate to unit economics. Scale to governance." That implied all three are available now.)

**Subhead:**
```
Xerg is built in layers. Each one delivers value on its own. You're starting
with the first — the rest comes when the product earns it.
```

**Cards (3 cards, same visual layout, but reframed):**

Card 1:
- Label: `Today`
- Title: `Waste Intelligence`
- Price line: `Free — CLI + local`
- Body: `Know what your agents waste. No outcome data needed, no account, no cloud. Just your OpenClaw logs and an honest audit — on your local machine or over SSH on a VPS.`
- Items:
  - `Structural waste across all five categories, in dollars`
  - `Reports by workflow and model with observed vs. estimated cost`
  - `Savings recommendations with A/B test guidance`
  - `Before/after comparisons on re-audit`

Card 2:
- Label: `Next`
- Title: `Unit Economics`
- Price line: `Coming — team waitlist open`
- Body: `Connect spend to outcomes. Track cost per ticket, per PR, per resolved query. See which agents produce the most value per dollar — over time, across teams.`
- Items:
  - `Cost per Outcome (CPO) by workflow and agent`
  - `Outcome Yield — value produced per dollar of inference`
  - `Team dashboard with shared visibility and historical trends`
  - `One SDK call to tag outcomes: xerg.track(outcome="success")`
- Do NOT apply the `featured` highlight style. This tier is not available yet.

Card 3:
- Label: `Later`
- Title: `Economic Governance`
- Price line: `Future — enterprise`
- Body: `Enforce economic discipline. Policy-as-code rules that block wasteful deploys, cap spend per work unit, and escalate expensive calls to human review.`
- Items:
  - `Policy-as-code with CI/CD and runtime enforcement`
  - `Systems-of-record connectors for auto-outcome tagging`
  - `Chargeback reporting by team and business unit`
  - `Compliance audit trail with engine versioning`

---

### Getting started section (`id="start"`)

**Section label:** `Getting started`

**Heading:**
```
30 seconds to your first waste report.
```
(Keep as-is.)

**Subhead:**
```
No signup. No config file. No API key. If you have OpenClaw logs, you have
everything you need.
```
(Changed: "agent logs" → "OpenClaw logs.")

**Steps (3 cards):**

Step 01:
- Title: `Run the audit`
- Body: `Xerg auto-detects your OpenClaw gateway logs and session transcripts.`
- Code: `npx @xerg/cli audit`

(Changed: removed "Works with OTel GenAI spans too." — that's the OTel claim that must go.)

Step 02 — keep as-is. Accurate.

Step 03 — keep as-is. Accurate.

---

### Waitlist section (`id="waitlist"`)

**Section label:** `Early access`

**Heading:**
```
The CLI is live. Team features are next.
```
(Changed from "The CLI ships first. The dashboard follows." The CLI *has* shipped — it's on npm. "The dashboard follows" implies it's imminent and confirmed. This version is honest about state.)

**Subhead:**
```
Join the waitlist for team access, design partner invites, and launch updates.
```
(Tightened. Removed "where the economic signal is clean" — that's internal jargon.)

**Keep the `SignupForm` component with `source="website-homepage"`.** No changes to the form itself.

---

### Footer

**Change the tagline from:**
```
Xerg — local-first waste intelligence for AI agent workflows.
```
**To:**
```
Xerg — the unit economics engine for AI agents.
```

Keep the GitHub and email links. Keep the existing layout.

---

### Data arrays to update

Here's a summary of which data arrays in the file need changes:

| Array | Action |
|-------|--------|
| `problemCards` | Rewrite card 3 (observability) — remove competitor names, fix metrics |
| `wasteCategories` | No change |
| `differentiators` | Rewrite card 3 (cost per outcome path → built for agent loops) |
| `pricingLadder` | Full rewrite — remove prices, reframe as Today/Next/Later |
| `gettingStartedSteps` | Remove OTel claim from step 01 body text |

---

## Part 2: Pilot page (`apps/site/app/pilot/page.tsx`)

### Design goal

The person receiving this link already has context — you sent it to them personally. The page should be scannable in 15 seconds. Lead with a one-line value prop, show the commands, tell them what to send back and where, offer recognition. Cut everything else.

### Current state (what exists)

The pilot page currently has:
- Hero with lengthy intro paragraph
- "Pilot snapshot — What you are agreeing to" sidebar
- "What to expect" + "Best fit" two-column section
- Five step cards in a 2-column grid with icons, body text, commands, alt commands, and notes
- "What to send me" section with feedback items
- "What happens next" sidebar
- Footer callout about founding testers

The page is ~400 lines of TSX. Target: ~200 lines.

### New structure

---

#### Hero (simplified)

**Heading:**
```
Xerg Pilot — OpenClaw waste audit
```

**One-liner below heading:**
```
Install, run one audit, try one fix, share the result. That's it.
```

**Two CTAs, same as current:**
- Primary: `Start the pilot →` (anchors to #steps)
- Secondary: `View npm package` (links to npmjs.com/package/@xerg/cli)

**Subtext:**
```
Free. No account. Works wherever your OpenClaw logs live. ~10 minutes.
```

**Cut entirely:** the "Pilot snapshot — What you are agreeing to" sidebar, the "What to expect" section, and the "Best fit" section. All of this is context you provide in the message you send alongside the link.

---

#### Steps section (`id="steps"`)

**Section label:** `The five steps`

**Heading:**
```
Install, audit, compare, send.
```

**Cut the subhead** ("These are the exact commands I recommend..."). The commands speak for themselves.

**Steps — make these tighter.** Keep the same 5 steps but cut body text to one short sentence max. Keep commands and `CopyCommand` components. Cut `note` fields and `altCommand` fields — move those to a single "Tips" line if truly essential, otherwise drop.

Step 01:
- Title: `Install`
- Body: `Global install is easiest if you'll run it more than once.`
- Command: `npm install -g @xerg/cli`

Step 02:
- Title: `Check your data`
- Body: `Confirms Xerg can find your OpenClaw logs. Works on your local machine or over SSH on a VPS.`
- Command: `xerg doctor`

Step 03:
- Title: `Run the audit`
- Body: `Shows spend, structural waste, top drivers, and first recommended fix.`
- Command: `xerg audit`

Step 04:
- Title: `Export a report`
- Body: `Markdown is easiest to share. A terminal screenshot also works.`
- Command: `xerg audit --markdown > xerg-audit.md`

Step 05:
- Title: `Fix one thing and compare`
- Body: `Try one change — trim context, fix a retry, swap a model — then re-run.`
- Command: `xerg audit --compare`

**Layout:** switch from 2-column grid to a single-column stack or a tighter list. The current 2-column layout with large card padding wastes space for what are essentially five command-line instructions.

---

#### Send results section (`id="share"`)

**Simplify to a single compact block.**

**Heading:**
```
Send me the results
```

**Body (3 bullet points max):**
- The markdown report, a screenshot, or both
- Which workflow you tested and what felt right or off
- If Xerg missed something obvious, that's especially useful

**CTA:**
```
Email: jason@xerg.ai
```

**Cut entirely:** the "What happens next" sidebar. That's for your reply email, not the page.

---

#### Founding tester recognition (NEW — add as a small callout)

Add a brief callout block after the "Send results" section, before the footer. Use the accent-glow background style.

**Copy:**
```
Pilot participants will be credited as founding testers when Xerg goes public.
```

One sentence. No elaboration needed.

---

#### Footer

Same as homepage: `Xerg — the unit economics engine for AI agents.` with GitHub and email links.

---

### Pilot page data arrays to update

| Array | Action |
|-------|--------|
| `pilotHighlights` | Delete — this was the "what you are agreeing to" sidebar |
| `steps` | Rewrite all 5 — shorter body, remove note/altCommand fields |
| `feedbackItems` | Replace with 3 inline bullets in the Send Results section |
| metadata description | Update to something tighter: "Pilot invitation for OpenClaw users to test Xerg's local waste audit." |

---

## Components that do NOT change

- `SignupForm` (`components/signup-form.tsx`) — no changes
- `CopyCommand` (`components/copy-command.tsx`) — no changes
- `SectionIntro` (inline in page.tsx) — no changes to the component, just the props passed to it
- `CliPreview` (inline in page.tsx) — no changes
- `layout.tsx` — no changes
- `globals.css` — no changes
- `api/waitlist/route.ts` — no changes
- All `/components/ui/` shadcn components — no changes

---

## Validation checklist

After making the changes, verify:

- [ ] No mention of "OTel," "OpenTelemetry," or "OTel GenAI" anywhere on the site
- [ ] No dollar pricing ($199, $499, or any specific number) on any plan
- [ ] No CPO, Outcome Yield, or WR-Outcome presented as current features
- [ ] No competitor names (Langfuse, Arize, LangSmith) in any negative framing
- [ ] "OpenClaw" appears at least once in the hero and once in the getting-started section
- [ ] "Built for agent systems" or equivalent agent-first language appears on the homepage
- [ ] Footer says "the unit economics engine for AI agents"
- [ ] The site does not claim "local only" — VPS/remote is supported wherever OpenClaw logs are accessible
- [ ] The CLI mock is unchanged
- [ ] The waitlist form still works (source prop, Resend integration)
- [ ] Pilot page is scannable in under 15 seconds
- [ ] Pilot page step 02 mentions VPS/SSH as a supported path
- [ ] "Founding testers" recognition appears on the pilot page
- [ ] GitHub issue created via `gh issue create` for OTel adapter
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes

---

## GitHub issue to create via `gh` CLI

After completing the site changes, run this command in the repo root to create the OTel tracking issue:

```bash
gh issue create \
  --repo xergai/xerg \
  --title "feat: OTel GenAI adapter for multi-framework support" \
  --body "The normalizer architecture (packages/core/src/normalize/) is adapter-shaped and ready for a second adapter alongside openclaw.ts.

Build an otel.ts normalizer that reads OTel GenAI span exports (OTLP JSON) and maps them to NormalizedRun[]. Store semconv_version per source.

Blocked until the OpenClaw wedge is validated with pilot users.

Ref: docs/xerg-overview.md (OTel as future adapter), docs/xerg-technical-architecture-and-operations.md (normalizer architecture)" \
  --label "enhancement" \
  --label "deferred"
```

If the `deferred` label doesn't exist yet, create it first:

```bash
gh label create deferred --repo xergai/xerg --description "Intentionally deferred until current wedge is validated" --color ededed
```
