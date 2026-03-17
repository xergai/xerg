# Xerg Decisions, Drift, and Open Questions

Status: current

## Ratified Current Decisions

### Product scope

- The current product is a local-first CLI plus public site.
- The current wedge is OpenClaw first.
- Waste intelligence is the current product layer.
- Cost per outcome and governance are future layers, not current claims.

### Infrastructure and tooling

- Vercel is the current site host.
- Resend is the current email and waitlist provider.
- GitHub Actions Trusted Publishing is the current npm publish path.
- The repo remains private through the first CLI beta.
- npm is the current public package distribution channel.

### Packaging and naming

- The live package is `@xerg/cli`.
- The command after global install is `xerg`.
- The unscoped package name `xerg` is not the current live package path.

### GitHub operations

- `main` is protected.
- PRs and required checks are part of the current operating model.

### Waitlist

- double opt-in is required
- Resend confirmed segment support is active
- rate limiting is active

### Knowledge management

- Notion is the recommended shared, editable source of truth for company/product docs
- repo docs remain the executable and implementation-aligned source of truth
- NotebookLM is better treated as an analysis layer than the writable system of record

## Ratified Strategic Sequencing

These are not current build items, but they are more committed than general exploration.

### XergCore before XergLedger

- The current product validates the XergCore-style waste intelligence wedge first.
- XergLedger is the planned second major product, not the first.
- XergLedger is the planned open-source distribution engine for the longer-term Xerg architecture.
- The trigger is real-user validation of the Core wedge, not abstract enthusiasm for the Ledger concept.

### Why this sequence is deliberate

- If Ledger ships first and takes off without Core conversion, Xerg risks building a beloved free tool without a revenue engine.
- If Core validates first, Ledger becomes an accelerant for an already-proven business.
- This sequence preserves focus and reduces solo-founder fragmentation risk.

### What this means operationally

- XergLedger should stay visible in strategy and investor conversations.
- XergLedger should not displace current OpenClaw CLI quality work.
- XergLedger is planned, but time-gated by validation rather than enthusiasm.

## Superseded or Archived Decisions

These were useful at the time, but are no longer current execution truth.

### Cloudflare-first hosted build

Older docs assumed:

- Cloudflare D1
- Cloudflare Workers
- Cloudflare Pages
- early hosted multi-tenant architecture

Current truth:

- not on the critical path
- not part of the active build

### Two-repo public/private split

Older docs assumed:

- separate public and private repos

Current truth:

- one repo: `xergai/xerg`

### Immediate SDK and hosted API work

Older docs assumed:

- SDK
- outcome tracking
- hosted ingestion
- dashboards

Current truth:

- deferred

## Strategic But Not Yet Ratified As Build Scope

These ideas are real and strategically important, but not yet current build commitments.

- runtime routing
- context-card style context discipline
- OpenAI Agents SDK adapter
- LangGraph adapter
- OpenInference / OTel ingestion
- Vercel AI stack integration

## Known Drift To Fix

These are places where the current repo and current messaging do not fully align.

### Site claims OTel support the product does not yet ship

The homepage currently says the audit works with OTel GenAI spans too.

Current code truth:

- the CLI only supports OpenClaw local logs and session transcripts
- there is no OTel ingestion path in the shipped code

This should be corrected in the product messaging or implemented later.

### Some older docs say npm is still future work

Current truth:

- `@xerg/cli` is already live on npm
- GitHub Actions Trusted Publishing is already working

### Some older docs say Trusted Publishing is only the intended future state

Current truth:

- it is already active and used for release

### The ecosystem plan overstates current build scope for XergLedger

Current truth:

- XergLedger is not active product scope today
- XergLedger is still planned as the second major product after validation
- the overstatement is about timing and current execution, not about whether it matters strategically

## Open Questions That Still Matter

### Real-data validation

- How believable are findings across multiple real OpenClaw datasets?
- Which waste categories survive real-world usage intact?
- Which heuristics need tuning?

### Cloud and remote usage

- What is the best first import format for Railway and other remote OpenClaw installs?
- Should Xerg support a direct OpenClaw export JSON path next?

### Runtime expansion

- Should the next adapter be OpenAI Agents SDK or LangGraph?
- When should generic OpenInference / OTel ingestion land relative to native adapters?

### Hosted product timing

- What is the minimum evidence needed before building hosted shared history or dashboards?

### Public repo timing

- When is the repo ready to go public without creating more support and scrutiny cost than it returns?

## What Stakeholders Should Treat As Non-Negotiable

- Do not describe Xerg today as a hosted economic governance platform.
- Do not claim cost per outcome exists today.
- Do not claim broad runtime support exists today.
- Do not let future architecture documents override current shipped truth.
- Do preserve the long-term category ambition while being precise about current product scope.
