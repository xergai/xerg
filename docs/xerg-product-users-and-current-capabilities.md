# Xerg Product, Users, and Current Capabilities

Status: current with explicit future-state notes

## What Xerg Does For Users Today

- `Find spend` — Xerg shows how much an OpenClaw workflow spent in dollars.
- `Separate measured from estimated cost` — It preserves the difference between observed spend and estimated spend.
- `Group spend into operational views` — It breaks spend down by workflow and model so the report is usable, not just raw call data.
- `Classify waste` — It separates confirmed high-confidence waste from lower-confidence opportunities.
- `Recommend a first savings test` — It does not stop at totals; it tells the user what to try first.
- `Show before/after change` — It can compare a new audit to the latest compatible prior audit using local snapshots.
- `Stay local` — It runs on local logs and stores only economic metadata and audit summaries locally.

## What Xerg Does Not Do Yet

- `No cost per outcome` — Xerg does not yet ingest outcome or valuation data.
- `No ROI claims` — It does not yet compute outcome yield or business-value ROI.
- `No hosted collaboration` — There is no dashboard, team history, or account system.
- `No runtime control` — Xerg does not currently sit inside an agent runtime and enforce routing or policy.
- `No direct cloud connectors` — There are no Railway, Fly, GCP, or Hetzner-specific integrations.
- `No generic telemetry path yet` — OTel / OpenInference support is still future work.

## Current Inputs

Today the CLI supports:

- OpenClaw gateway logs
- OpenClaw session transcript JSONL files

Default detection paths:

- `/tmp/openclaw/openclaw-*.log`
- `~/.openclaw/agents/*/sessions/*.jsonl`

Explicit overrides:

- `--log-file`
- `--sessions-dir`

Important current limitation:

- OpenClaw cloud/export JSON like the `api-usage-7d.json` sample discussed during product work is not yet supported in code.
- Remote/cloud users currently need to run Xerg where the logs live, or export logs/transcripts into the supported file forms.

## Current CLI Commands

### `xerg doctor`

Purpose:

- inspect the machine for OpenClaw sources
- report defaults, detected sources, and notes

### `xerg audit`

Purpose:

- detect sources
- normalize calls and runs
- compute spend
- compute findings
- optionally persist a local audit snapshot
- render terminal, JSON, or Markdown output

Flags currently supported:

- `--log-file`
- `--sessions-dir`
- `--since`
- `--compare`
- `--json`
- `--markdown`
- `--db`
- `--no-db`

### `xerg audit --compare`

Purpose:

- compare the newest audit against the latest compatible prior snapshot
- show before/after spend and structural waste changes
- highlight biggest improvement and biggest regression

Important behavior:

- compare requires local snapshot history
- `--compare --no-db` fails by design

## Current Data Model

The live product uses a deliberately small local data model:

- `source_files`
- `runs`
- `calls`
- `findings`
- `pricing_catalog`
- `audit_snapshots`

This is enough for local waste intelligence.

It does not yet include:

- outcome events
- work units
- allocation links
- team or org records
- policy definitions

## Current Findings Model

### High-confidence waste

These are treated as confirmed or close to confirmed:

- retry waste
- repeated-error spend
- explicit loop waste

### Lower-confidence opportunities

These are directional, not asserted as proven waste:

- context outliers / context bloat
- candidate downgrade opportunities
- idle or monitoring spend

### Current taxonomy labels in reports

- Retry waste
- Context bloat
- Loop waste
- Downgrade candidates
- Idle waste

## Current Pricing Behavior

The current local pricing catalog includes a small set of models:

- Anthropic Claude Haiku 4.5
- Anthropic Claude Sonnet 4.5
- Anthropic Claude Opus 4
- OpenAI GPT-4o
- OpenAI GPT-4.1 mini
- Google Gemini 2.0 Flash
- Meta Llama 3.3 70B Instruct

Behavior:

- If observed cost is present in telemetry, Xerg uses it.
- If observed cost is missing and the model exists in the pricing catalog, Xerg estimates cost.
- If neither exists, cost can only be represented from what the source provides.

## Current Outputs

### Terminal

The terminal report currently includes:

- headline metrics
- waste taxonomy
- top workflows
- top models
- high-confidence waste
- opportunities
- first savings test
- before/after block if available
- notes

### JSON

The JSON output includes the audit summary object, including comparison data when available.

### Markdown

The Markdown output is designed to be easy to share by email or in chat.

## Current User Journey

### Ideal local path

1. Install `@xerg/cli`
2. Run `xerg doctor`
3. Run `xerg audit`
4. Make one workflow or model fix
5. Run `xerg audit --compare`
6. Share the result

### Current pilot path

The public pilot page asks OpenClaw users to:

1. install Xerg
2. run doctor
3. run an audit
4. export Markdown or a screenshot
5. make one fix
6. rerun compare
7. email results to `query@xerg.ai`

## Current Best-Fit Users

### Strong fit now

- OpenClaw users running repeated workflows
- technical users comfortable with CLI tools
- people who can access the machine or files where OpenClaw data lives
- users who care about wasted spend more than dashboards

### Weaker fit now

- users wanting browser-only setup
- teams needing hosted dashboards immediately
- users whose workloads run remotely with no accessible logs or exports
- users wanting direct support for non-OpenClaw frameworks today

## What The Product Is Building Toward

### Layer 1: Waste intelligence

Current.

### Layer 2: Unit economics

Future.
Would require outcome tagging and valuation.

### Layer 3: Economic governance

Future.
Would require policy, shared visibility, and controls.

## Runtime Injection and Optimization Direction

This is not the current product, but it is a real design direction that came out of product work:

- model routing at the workflow-step level, not generic cheapest-model routing
- context-discipline mechanisms like a "context card" that carries forward only what is necessary
- policy-based spend controls after Xerg first earns trust as an audit product

The important current rule is:

- Xerg should become trustworthy as an economic intelligence layer before it tries to become an in-path control layer.
