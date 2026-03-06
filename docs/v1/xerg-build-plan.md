# Xerg — Technical Build Plan

**xerg.ai · Derived from the Xerg Product Definition**

*This build plan implements the product definition. Every technical decision traces back to a product requirement. If this plan contradicts the product definition, the product definition wins.*

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | OpenClaw ecosystem is Node/TS; fastest iteration on waste heuristics; enables `npx xerg` zero-install experience |
| CLI framework | `commander` | Lightweight, well-documented, no magic. Oclif is overkill for v0. |
| Local database | SQLite via `better-sqlite3` | Local-first, no server, schema-compatible with D1 for cloud migration |
| Cloud database | Cloudflare D1 | SQLite-at-edge, covered by credits, schema ports directly from local |
| ORM | Drizzle | Native D1 support, edge-runtime compatible, excellent TS DX. Not Prisma (edge runtime issues). |
| API framework | Hono | Lightweight, runs natively on Workers, familiar Express-like API |
| Dashboard frontend | Next.js on Cloudflare Pages | React ecosystem, SSR on edge, good with Clerk |
| Auth | Clerk | User + org/team management out of the box, edge-compatible, maps directly to Team/Business/Enterprise tiers |
| Payments | Stripe Checkout + Billing Portal | Simple subscription management, self-serve upgrades/cancellations |
| Error tracking | Sentry | CLI (opt-in) + Workers (always-on) |
| Product analytics | PostHog | Dashboard only, never on CLI |
| Transactional email | Resend | Alerts, budget notifications, weekly reports |
| AI inference | Cloudflare Workers AI | Task complexity classification, waste pattern detection, covered by credits |
| Package registry | npm | Primary distribution, enables `npx xerg audit` |
| Secondary distribution | Homebrew | `brew install xerg` for macOS devs |
| Tertiary distribution | GitHub Releases | Binary downloads |
| Monorepo tool | Turborepo | Manages CLI, SDK, shared packages within each repo |
| Testing | Vitest | Fast, native TS, works with Workers |
| CI/CD | GitHub Actions | Lint/test/build on PR, npm publish on tag, Workers deploy on merge to main |
| Documentation | Mintlify | docs.xerg.ai — versioned API docs, guides, SDK reference |
| Status page | Cloudflare Health Checks | status.xerg.ai — uptime monitoring for API and dashboard |

---

## Repository Structure

**Two repos, clean open-core split:**

### Public repo: `github.com/xerg/xerg` (MIT license)

Everything that runs on the user's machine. The distribution engine and trust foundation.

```
xerg/
├── packages/
│   ├── cli/                    # The `xerg` CLI tool
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point, commander setup
│   │   │   ├── commands/
│   │   │   │   ├── audit.ts    # xerg audit — the core command
│   │   │   │   ├── track.ts    # xerg track — manual outcome tagging
│   │   │   │   └── config.ts   # xerg config — settings management
│   │   │   ├── adapters/
│   │   │   │   ├── openclaw.ts # OpenClaw gateway log + session JSONL parser
│   │   │   │   └── otel.ts     # OTel GenAI span ingestion (local file import)
│   │   │   ├── engine/
│   │   │   │   ├── waste.ts    # WR-Structural waste taxonomy engine
│   │   │   │   ├── cost.ts     # Cost computation (observed vs estimated)
│   │   │   │   ├── pricing.ts  # PricingCatalog management
│   │   │   │   └── version.ts  # Engine versioning (xerg_engine_v0.1)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts   # Drizzle schema (imports from shared)
│   │   │   │   ├── local.ts    # SQLite connection via better-sqlite3
│   │   │   │   └── migrate.ts  # Schema migrations
│   │   │   ├── output/
│   │   │   │   ├── terminal.ts # Rich terminal output formatting
│   │   │   │   ├── json.ts     # JSON output for piping
│   │   │   │   └── markdown.ts # Markdown export for sharing
│   │   │   └── pricing/
│   │   │       └── catalog.json # Default pricing table (all major providers)
│   │   ├── tests/
│   │   │   ├── waste.test.ts   # Unit tests for waste taxonomy
│   │   │   ├── cost.test.ts    # Unit tests for cost computation
│   │   │   ├── adapters/       # Integration tests for each adapter
│   │   │   └── snapshots/      # CLI output snapshot tests
│   │   └── package.json
│   │
│   ├── sdk/                    # The `@xerg/sdk` package
│   │   ├── src/
│   │   │   ├── index.ts        # Main exports
│   │   │   ├── wrap.ts         # Client wrapper (wrap(openai.Client()))
│   │   │   ├── run.ts          # Run context manager
│   │   │   ├── outcome.ts      # OutcomeEvent emission
│   │   │   ├── workunit.ts     # WorkUnit + WorkUnitRunLink management
│   │   │   └── transport.ts    # Local (SQLite) or remote (xerg.ai API) transport
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── shared/                 # Shared types and schemas
│       ├── src/
│       │   ├── schema.ts       # Canonical Drizzle schema (single source of truth)
│       │   ├── types.ts        # TypeScript types for Run, OutcomeEvent, etc.
│       │   ├── pricing.ts      # PricingCatalog types and helpers
│       │   └── engine.ts       # Engine version constants
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + test + build on PR
│       ├── publish-cli.yml     # Publish CLI to npm on version tag
│       └── publish-sdk.yml     # Publish SDK to npm on version tag
│
├── turbo.json
├── package.json
├── README.md                   # Security section, quick start, architecture
└── LICENSE                     # MIT
```

### Private repo: `github.com/xerg/xerg-cloud` (proprietary)

Everything that runs on xerg.ai. The paid product. Imports `@xerg/shared` as a dependency from the public repo's npm package.

```
xerg-cloud/
├── apps/
│   ├── api/                    # Cloudflare Workers API (xerg.ai backend)
│   │   ├── src/
│   │   │   ├── index.ts        # Hono app entry point
│   │   │   ├── routes/
│   │   │   │   ├── runs.ts     # POST /v1/runs — Run ingestion
│   │   │   │   ├── outcomes.ts # POST /v1/outcomes — OutcomeEvent ingestion
│   │   │   │   ├── reports.ts  # GET /v1/reports — CPO, OY, WR queries
│   │   │   │   ├── policies.ts # CRUD for policy definitions
│   │   │   │   └── webhooks.ts # Jira/GitHub/Linear incoming webhooks
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts     # Clerk JWT verification
│   │   │   │   ├── ratelimit.ts # Rate limiting per API key
│   │   │   │   └── apikey.ts   # API key validation for SDK ingestion
│   │   │   ├── services/
│   │   │   │   ├── engine.ts   # WR/CPO/OY computation (uses @xerg/shared)
│   │   │   │   ├── alerts.ts   # Budget alerts, policy violations → Resend/Slack
│   │   │   │   └── ai.ts      # Workers AI for complexity classification
│   │   │   └── db/
│   │   │       └── d1.ts       # D1 connection using shared Drizzle schema
│   │   ├── wrangler.toml       # Workers configuration
│   │   └── package.json
│   │
│   └── dashboard/              # Next.js dashboard (xerg.ai frontend)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx  # Root layout with Clerk provider
│       │   │   ├── page.tsx    # Landing page / marketing
│       │   │   ├── sign-in/    # Clerk sign-in
│       │   │   ├── sign-up/    # Clerk sign-up
│       │   │   ├── dashboard/  # Authenticated dashboard routes
│       │   │   │   ├── page.tsx        # Overview (total spend, WR, top workflows)
│       │   │   │   ├── workflows/      # Per-workflow CPO/OY drill-down
│       │   │   │   ├── workunits/      # WorkUnit-level economics
│       │   │   │   ├── waste/          # WR-Structural + WR-Outcome detail
│       │   │   │   ├── policies/       # Policy editor + enforcement log
│       │   │   │   ├── alerts/         # Alert configuration
│       │   │   │   ├── team/           # Team management (Clerk orgs)
│       │   │   │   └── settings/       # API keys, integrations, billing (Stripe portal)
│       │   │   └── api/
│       │   │       └── stripe/         # Stripe webhook handler
│       │   ├── components/
│       │   └── lib/
│       ├── next.config.js
│       └── package.json
│
├── docs/                       # Mintlify docs (docs.xerg.ai)
│   ├── mint.json               # Mintlify config
│   ├── introduction.mdx
│   ├── quickstart.mdx
│   ├── cli/
│   │   ├── audit.mdx
│   │   ├── track.mdx
│   │   └── config.mdx
│   ├── sdk/
│   │   ├── getting-started.mdx
│   │   ├── wrap.mdx
│   │   ├── outcomes.mdx
│   │   └── workunits.mdx
│   ├── api-reference/
│   │   ├── runs.mdx
│   │   ├── outcomes.mdx
│   │   └── reports.mdx
│   ├── concepts/
│   │   ├── run.mdx
│   │   ├── workunit.mdx
│   │   ├── waste-rate.mdx
│   │   ├── cpo.mdx
│   │   └── outcome-yield.mdx
│   └── guides/
│       ├── openclaw.mdx
│       ├── langchain.mdx
│       └── policy-as-code.mdx
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + test + build on PR
│       ├── deploy-api.yml      # Deploy Workers on merge to main
│       ├── deploy-dashboard.yml # Deploy Pages on merge to main
│       └── deploy-docs.yml     # Deploy Mintlify on merge to main
│
├── turbo.json
└── package.json
```

---

## Database Schema

Single Drizzle schema shared between local SQLite (CLI) and Cloudflare D1 (API). Defined in `packages/shared/src/schema.ts`.

```typescript
// packages/shared/src/schema.ts

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// === IMMUTABLE EXECUTION RECORDS ===

export const runs = sqliteTable('runs', {
  id:              text('id').primaryKey(),
  timestamp:       text('timestamp').notNull(),
  traceId:         text('trace_id'),
  spanId:          text('span_id'),
  parentRunId:     text('parent_run_id'),
  semconvVersion:  text('semconv_version'),
  workflow:        text('workflow').notNull(),
  environment:     text('environment').default('production'),
  team:            text('team'),
  tags:            text('tags', { mode: 'json' }),   // JSON map
  totalCostUsd:    real('total_cost_usd').notNull(),
  totalTokens:     integer('total_tokens').notNull(),
  // Clerk org ID — null for local CLI usage
  orgId:           text('org_id'),
}, (table) => ({
  timestampIdx: index('idx_runs_timestamp').on(table.timestamp),
  workflowIdx:  index('idx_runs_workflow').on(table.workflow),
  traceIdx:     index('idx_runs_trace_id').on(table.traceId),
  orgIdx:       index('idx_runs_org_id').on(table.orgId),
}));

export const calls = sqliteTable('calls', {
  id:              text('id').primaryKey(),
  runId:           text('run_id').notNull().references(() => runs.id),
  model:           text('model').notNull(),
  provider:        text('provider'),
  inputTokens:     integer('input_tokens').notNull(),
  outputTokens:    integer('output_tokens').notNull(),
  costUsd:         real('cost_usd').notNull(),
  costSource:      text('cost_source').notNull(), // 'observed' | 'estimated'
  latencyMs:       integer('latency_ms'),
  toolCalls:       integer('tool_calls').default(0),
  retries:         integer('retries').default(0),
  cacheHit:        integer('cache_hit', { mode: 'boolean' }).default(false),
  cacheCostUsd:    real('cache_cost_usd'),
});

// === APPEND-ONLY OUTCOME STREAM ===

export const outcomeEvents = sqliteTable('outcome_events', {
  id:              text('id').primaryKey(),
  timestamp:       text('timestamp').notNull(),
  workUnitId:      text('work_unit_id'),
  runId:           text('run_id'),
  outcome:         text('outcome').notNull(),     // success|failure|partial|unknown|reopened
  outcomeType:     text('outcome_type'),          // ticket_closed, pr_merged, etc.
  value:           real('value'),
  valueModel:      text('value_model'),
  source:          text('source').notNull(),       // sdk|jira|github|zendesk|manual|batch
  actor:           text('actor'),
}, (table) => ({
  workUnitIdx: index('idx_outcome_work_unit').on(table.workUnitId),
  runIdx:      index('idx_outcome_run').on(table.runId),
}));

// === BUSINESS OBJECTS ===

export const workUnits = sqliteTable('work_units', {
  id:              text('id').primaryKey(),
  type:            text('type').notNull(),         // ticket, pr, query, etc.
  createdAt:       text('created_at').notNull(),
  currentOutcome:  text('current_outcome'),
  resolvedAt:      text('resolved_at'),
  currentValue:    real('current_value'),
  valueModel:      text('value_model'),
  orgId:           text('org_id'),
});

// === MANY-TO-MANY RUN ↔ WORKUNIT ===

export const workUnitRunLinks = sqliteTable('work_unit_run_links', {
  workUnitId:      text('work_unit_id').notNull().references(() => workUnits.id),
  runId:           text('run_id').notNull().references(() => runs.id),
  allocation:      real('allocation').notNull().default(1.0), // 0.0–1.0
  reason:          text('reason').notNull(),       // direct|shared_overhead|batch
}, (table) => ({
  workUnitIdx: index('idx_link_work_unit').on(table.workUnitId),
  runIdx:      index('idx_link_run').on(table.runId),
}));

// === PRICING ===

export const pricingCatalog = sqliteTable('pricing_catalog', {
  id:              text('id').primaryKey(),
  provider:        text('provider').notNull(),
  model:           text('model').notNull(),
  effectiveDate:   text('effective_date').notNull(),
  inputPer1m:      real('input_per_1m').notNull(),
  outputPer1m:     real('output_per_1m').notNull(),
  cachedInputPer1m: real('cached_input_per_1m'),
  orgOverride:     integer('org_override', { mode: 'boolean' }).default(false),
});

// === DERIVED METRICS (materialized, versioned) ===

export const derivedMetrics = sqliteTable('derived_metrics', {
  id:              text('id').primaryKey(),
  entityType:      text('entity_type').notNull(),  // run|work_unit|workflow
  entityId:        text('entity_id').notNull(),
  engineVersion:   text('engine_version').notNull(), // xerg_engine_v0.1
  computedAt:      text('computed_at').notNull(),
  metrics:         text('metrics', { mode: 'json' }).notNull(), // CPO, OY, WR, waste_flags, etc.
}, (table) => ({
  entityIdx: index('idx_derived_entity').on(table.entityType, table.entityId),
  versionIdx: index('idx_derived_version').on(table.engineVersion),
}));

// === API KEYS (cloud only) ===

export const apiKeys = sqliteTable('api_keys', {
  id:              text('id').primaryKey(),
  orgId:           text('org_id').notNull(),
  keyHash:         text('key_hash').notNull(),      // SHA-256 of the key
  keyPrefix:       text('key_prefix').notNull(),     // first 8 chars for identification
  name:            text('name').notNull(),
  createdAt:       text('created_at').notNull(),
  lastUsedAt:      text('last_used_at'),
  revokedAt:       text('revoked_at'),
});
```

---

## Auth Model

Clerk provides three primitives that map directly to Xerg's product tiers:

| Clerk concept | Xerg concept | Tier |
|---------------|-------------|------|
| User | Individual developer | Free (CLI only, no Clerk needed) |
| Organization (small) | Team account | Team ($199/mo) |
| Organization (large) | Business/Enterprise account | Business ($499/mo) / Enterprise |

Sign-in methods (configured in Clerk):

- **GitHub OAuth** — primary. Your users are developers.
- **Google OAuth** — secondary. For non-technical stakeholders viewing dashboards.
- **Email magic link** — fallback. No passwords. Passwordless is better UX and more secure.

The CLI never requires auth. It's local-only. Auth is only required when a user connects to xerg.ai (dashboard, SDK telemetry to cloud, team features).

SDK telemetry to xerg.ai authenticates via API keys (not Clerk JWTs). Users generate API keys in the dashboard settings page. Keys are hashed (SHA-256) before storage. The unhashed key is shown once at creation.

---

## Payments

Stripe products mapping to tiers:

| Tier | Stripe Product | Price |
|------|---------------|-------|
| Free | No Stripe involvement | $0 |
| Team | `prod_xerg_team` | $199/mo recurring |
| Business | `prod_xerg_business` | $499/mo recurring |
| Enterprise | Custom quote / manual invoice | $2,000-10,000+/mo |

Implementation:

- **Stripe Checkout** for initial subscription (redirect from dashboard pricing page)
- **Stripe Billing Portal** for self-serve upgrades, downgrades, cancellations, payment method updates
- **Stripe Webhooks** to Workers API — update Clerk org metadata with current plan tier
- **Entitlement check** in API middleware: read org's plan tier from Clerk metadata, enforce limits (team members, request volume, data retention)

Plan limits enforced server-side:

| Limit | Team | Business | Enterprise |
|-------|------|----------|-----------|
| Team members | 10 | Unlimited | Unlimited |
| Tracked requests/mo | 1M | 10M | Custom |
| Data retention | 30 days | 90 days | Unlimited |
| Policy enforcement | Post-run alerts only | + CI/CD + runtime gates | + custom |
| Connectors | Slack, email | + Jira, GitHub, Linear | + custom |

---

## CI/CD (GitHub Actions)

### Public repo (`xerg/xerg`)

**On Pull Request (`ci.yml`):**
```yaml
- Checkout
- Install dependencies (pnpm)
- Turbo lint (ESLint + Prettier check)
- Turbo typecheck (tsc --noEmit)
- Turbo test (vitest run)
- Build all packages
```

**Publish CLI to npm (`publish-cli.yml`)** — triggered on version tag `cli-v*`:
```yaml
- Build packages/cli
- npm publish (xerg)
- Create GitHub Release with changelog
- Update Homebrew formula (tap repo)
```

**Publish SDK to npm (`publish-sdk.yml`)** — triggered on version tag `sdk-v*`:
```yaml
- Build packages/sdk
- npm publish (@xerg/sdk)
```

### Private repo (`xerg/xerg-cloud`)

**On Pull Request (`ci.yml`):**
```yaml
- Checkout
- Install dependencies (pnpm, including @xerg/shared from npm)
- Turbo lint + typecheck + test
- Build all apps
```

**Deploy API (`deploy-api.yml`)** — triggered on merge to main (changes in `apps/api/`):
```yaml
- Build apps/api
- wrangler deploy (production)
- Run smoke tests against production
- Notify Sentry of release
```

**Deploy Dashboard (`deploy-dashboard.yml`)** — triggered on merge to main (changes in `apps/dashboard/`):
```yaml
- Build apps/dashboard
- wrangler pages deploy (production)
- Notify Sentry of release
```

**Deploy Docs (`deploy-docs.yml`)** — triggered on merge to main (changes in `docs/`):
```yaml
- Mintlify deploy (docs.xerg.ai)
```

---

## Testing Strategy

| Layer | Tool | What's tested |
|-------|------|---------------|
| Unit | Vitest | Waste taxonomy engine, cost computation (observed vs estimated), PricingCatalog lookups, engine versioning, WR-Structural heuristics |
| Integration | Vitest | OpenClaw adapter (against fixture JSONL files), OTel adapter (against fixture spans), SDK → local SQLite round-trip |
| Snapshot | Vitest | CLI output formatting (terminal, JSON, markdown exports) — ensures "holy crap" moment doesn't regress |
| API | Vitest + Miniflare | Workers API routes (Run ingestion, OutcomeEvent processing, report queries), auth middleware, rate limiting |
| E2E | Playwright | Dashboard critical paths (sign in, view report, create API key, configure alert) |
| Schema | Drizzle migration tests | Schema migrations apply cleanly to both SQLite and D1 |

Test fixtures include:

- Sample OpenClaw session JSONL files (various sizes, edge cases)
- Sample OTel GenAI spans (multiple semconv versions)
- Synthetic Run + OutcomeEvent data for metric computation validation
- Known-answer waste detection scenarios (verified expected WR-Structural output)

---

## Observability & Monitoring

| Tool | Scope | Purpose |
|------|-------|---------|
| Sentry | CLI (opt-in), API (always), Dashboard (always) | Error tracking, performance monitoring, release tracking |
| PostHog | Dashboard only | Product analytics (feature usage, conversion funnels, retention). Never on CLI. |
| Cloudflare Analytics | API, Dashboard | Request volume, latency, error rates (free with Workers/Pages) |
| Uptime monitoring | API health endpoint | Status page (Openstatus on Workers, or Cloudflare Health Checks) |

CLI telemetry is strictly opt-in. First run shows a one-time prompt: "Send anonymous crash reports to help improve Xerg? (y/n)". Default is no. Respects `DO_NOT_TRACK` environment variable.

---

## Cloudflare Setup Checklist

Everything below must be provisioned before the SaaS (API + dashboard) can deploy. Not needed for CLI-only Phase 1.

### Via Wrangler CLI or Cloudflare MCP Server

- [ ] **Set active Cloudflare account** (the one with $250K credits)
- [ ] **Create D1 database:** `xerg-production`
- [ ] **Create D1 database:** `xerg-staging`
- [ ] **Run Drizzle migrations** against both D1 databases
- [ ] **Create KV namespace:** `xerg-ratelimits` (API rate limiting)
- [ ] **Create KV namespace:** `xerg-cache` (PricingCatalog cache, session cache)
- [ ] **Create R2 bucket:** `xerg-exports` (batch imports, exported reports, audit artifacts)
- [ ] **Create Workers project:** `xerg-api` (Hono API backend)
- [ ] **Configure Workers bindings** in `wrangler.toml`:
  - D1 binding → `xerg-production`
  - KV bindings → `xerg-ratelimits`, `xerg-cache`
  - R2 binding → `xerg-exports`
  - Workers AI binding (for complexity classification)
- [ ] **Create Pages project:** `xerg-dashboard` (Next.js frontend)
- [ ] **Enable Workers AI** on the account (for task complexity classification)

### Via Cloudflare Dashboard (manual)

- [ ] **Add domain:** `xerg.ai`
- [ ] **Configure DNS:** A/AAAA records pointing to Workers (API), CNAME for Pages (dashboard)
- [ ] **DNS routing:**
  - `api.xerg.ai` → Workers
  - `xerg.ai` / `www.xerg.ai` → Pages
  - `docs.xerg.ai` → Mintlify (CNAME per Mintlify setup)
  - `status.xerg.ai` → Cloudflare Health Checks status page
- [ ] **Enable SSL:** Full (strict) mode
- [ ] **Configure Cloudflare Health Checks** for `api.xerg.ai` and `xerg.ai` — powers status.xerg.ai
- [ ] **Configure Cloudflare Email Routing** (if using for receiving — e.g., support@xerg.ai)

### Third-Party Service Setup

- [ ] **Clerk:** Create application, configure GitHub + Google + email magic link sign-in, create organization settings for team/business tiers
- [ ] **Stripe:** Create products (`xerg_team`, `xerg_business`), configure Checkout sessions, set up Billing Portal, add webhook endpoint (`api.xerg.ai/webhooks/stripe`)
- [ ] **Sentry:** Create projects for `xerg-cli`, `xerg-api`, `xerg-dashboard`, configure source maps upload in CI
- [ ] **PostHog:** Create project for dashboard analytics, configure proxy through Workers to avoid ad blockers
- [ ] **Resend:** Verify `xerg.ai` domain (DNS records), create API key, configure for transactional email (alerts, reports, budget notifications)
- [ ] **Mintlify:** Create project for `docs.xerg.ai`, connect to `xerg/xerg-cloud` repo `docs/` directory, configure custom domain
- [ ] **npm:** Verify `xerg` package ownership, create `@xerg` org for scoped packages (`@xerg/sdk`, `@xerg/shared`), configure publish tokens in GitHub Actions secrets
- [ ] **Homebrew:** Create `homebrew-tap` repo at `github.com/xerg/homebrew-tap`

### GitHub Setup

- [ ] **Create GitHub org:** `xerg`
- [ ] **Create public repo:** `github.com/xerg/xerg` (MIT license)
- [ ] **Create private repo:** `github.com/xerg/xerg-cloud`
- [ ] **Configure branch protection:** require CI pass on main (both repos)
- [ ] **Add secrets to public repo:** npm token, Sentry DSN (CLI)
- [ ] **Add secrets to private repo:** npm token (for @xerg/shared dependency), Cloudflare API token, Sentry DSN, Clerk keys, Stripe keys, Resend API key, PostHog key
- [ ] **Create GitHub App** (for xerg.ai → GitHub connector: PR outcome webhooks)

---

## Build Phases

### Phase 1: CLI + OpenClaw Adapter (Level 1 — Free, Local-Only)

This is the wedge. The "30-second first experience." No cloud, no accounts, no network.

**Deliverable:** `npx xerg audit --openclaw` produces a waste intelligence report from local OpenClaw logs.

What gets built:

- `packages/shared` — Drizzle schema (all tables from Section above), TypeScript types, PricingCatalog with current list prices for Anthropic, OpenAI, Google, DeepSeek, Meta
- `packages/cli` — Commander-based CLI with `xerg audit` command
- OpenClaw adapter — Parses gateway logs and session JSONL files, normalizes to Run schema. Detects log location automatically (`~/.openclaw/logs/` default, configurable). Handles both OTel-formatted logs and raw session JSONL as fallback.
- Cost computation engine — Calculates cost per call. Uses observed `cost_usd` from telemetry when present, falls back to PricingCatalog estimation. Labels every cost as `observed` or `estimated`.
- WR-Structural waste taxonomy engine — Implements all five structural waste categories: retry waste (detect failed+retried calls), context bloat (flag sessions with input tokens >2σ above workflow mean), candidate downgrade opportunities (flag expensive models on low-complexity task classes with A/B test recommendation), loop waste (detect iteration counts exceeding workflow-typical bounds), idle waste (heartbeat/cron cost with no triggered action).
- Engine versioning — All derived metrics tagged with `xerg_engine_v0.1`.
- Output formatting — Rich terminal output (the "holy crap" screenshot), JSON export, Markdown export. Terminal output includes: total spend summary, WR-Structural percentage with dollar amount, top 5 waste drivers ranked by dollar impact, "Cost per Outcome: N/A (enable outcome tracking to unlock)" teaser, and per-workflow breakdown.
- Local SQLite storage — Runs + calls + derived metrics persisted to `~/.xerg/xerg.db`. Enables `xerg audit --compare` to show before/after when optimizations are applied.
- `xerg config` — Set OpenClaw log path, toggle crash reporting, customize PricingCatalog overrides.
- Tests — Unit tests for waste engine + cost computation, integration tests for OpenClaw adapter against fixture files, snapshot tests for CLI output.
- README — Quick start, architecture, security section ("metadata-only by default, no network access, no prompts or responses ingested"), sample output screenshot.
- npm publish — Package as `xerg`, verify `npx xerg audit --openclaw` works from clean install.
- Homebrew formula — Tap repo with formula pointing to GitHub Release tarball.

What explicitly does NOT get built in Phase 1:

- No xerg.ai API or dashboard
- No auth, no accounts, no Clerk
- No Stripe, no payments
- No Cloudflare infrastructure
- No SDK (comes in Phase 2)
- No OTel OTLP ingestion endpoint (comes in Phase 2)
- No outcome tracking analytics (schema exists, computation doesn't)
- No policy engine

### Phase 2: SDK + Cloud API + Dashboard (Levels 1-2 — Free + Paid)

**Deliverable:** `xerg.ai` is live with dashboard, SDK sends telemetry to cloud, teams can see CPO/OY.

What gets built:

- `packages/sdk` — `@xerg/sdk` npm package. `wrap(openai.Client())` one-line integration. `xerg.run()` context manager. `xerg.track(outcome=..., work_unit=...)` emitting OutcomeEvents + WorkUnitRunLinks. Transport layer: local SQLite (default) or remote xerg.ai API (when API key configured).
- `apps/api` — Hono on Workers. Routes: `POST /v1/runs` (Run + calls ingestion), `POST /v1/outcomes` (OutcomeEvent ingestion, creates/updates WorkUnit state), `GET /v1/reports` (CPO, OY, WR queries with filters), `POST /v1/apikeys` (create/revoke). Middleware: Clerk JWT auth (dashboard), API key auth (SDK), rate limiting (KV-backed).
- `apps/dashboard` — Next.js on Pages. Clerk-authenticated. Pages: overview (total spend, WR, top workflows), workflow drill-down (CPO/OY per workflow), waste detail (WR-Structural + WR-Outcome breakdown), alert configuration (budget thresholds → Resend/Slack), team management (Clerk orgs), settings (API keys, integrations, Stripe billing portal embed).
- OTel OTLP ingestion — Workers endpoint accepting OTel GenAI spans. Parses multiple semconv versions. Normalizes to Run schema. This makes any OTel-instrumented framework a data source.
- OutcomeEvent processing — When an OutcomeEvent arrives, materialize WorkUnit state (latest outcome, resolved_at, current_value). Recompute CPO/OY for affected WorkUnits. Handle reopened/reverted outcomes naturally.
- CPO/OY computation — Aggregate cost across WorkUnitRunLinks (weighted by allocation), divide by successful WorkUnits. Historical trend computation. Cost regression detection.
- WR-Outcome — Compute failure cost and partial cost at WorkUnit level when outcome data is available.
- Workers AI integration — Task complexity classification to power "candidate downgrade opportunities" heuristic with higher accuracy than rule-based approach.
- Stripe integration — Checkout sessions for Team/Business, Billing Portal for self-serve, webhooks to update Clerk org metadata with plan tier.
- Transactional email — Resend integration for budget alerts, weekly cost reports, policy violation notifications.
- PostHog — Dashboard product analytics.
- Sentry — Error tracking across API + dashboard.

### Phase 3: Policy Engine + Connectors + Enterprise (Level 3)

**Deliverable:** Policy-as-code enforcement, systems-of-record connectors, enterprise features.

What gets built:

- Policy engine — YAML/JSON policy definitions stored per org. Three enforcement points:
  - Post-run alerting (evaluate policy after Run completion, fire alerts via Resend/Slack, auto-create remediation issues)
  - CI/CD gate (GitHub Action that replays recent WorkUnit traffic against staging, blocks deploy if CPO regresses beyond threshold)
  - Runtime policy gate (SDK middleware that evaluates policy before/during Run, can deny/route/escalate)
- Systems-of-record connectors — Incoming webhooks from Jira, GitHub, Linear, Zendesk. When business objects resolve (ticket closed, PR merged), emit OutcomeEvent automatically. Map external IDs to WorkUnit IDs.
- GitHub App — Monitor PR lifecycle for code review agent WorkUnits. Auto-tag merged/reverted/closed outcomes.
- Chargeback reporting — Cost attribution by team/business-unit/product. Exportable for finance.
- Compliance + audit — Immutable Run log with engine version provenance. Exportable audit trail.
- SSO/SAML — Via Clerk enterprise features.
- Advanced analytics — Monte Carlo simulation for spend volatility, portfolio-level allocation guidance, forecasting.

---

## Launch Distribution

| Channel | Asset | Notes |
|---------|-------|-------|
| npm | `xerg` package | `npx xerg audit --openclaw` must work from clean install |
| Homebrew | `xerg-ai/tap/xerg` | macOS/Linux binary |
| GitHub | Release with changelog | Binary artifacts + source tarball |
| ClawHub | `xerg` skill listing | Update existing reserved listing with real SKILL.md |
| OpenClaw Discord | #skills-showcase post | Screenshot of audit report |
| X / Twitter | Thread with real $ numbers | "My OpenClaw costs $X/day. Xerg found $Y in waste. One command." |
| Hacker News | Show HN post | "Show HN: Xerg — unit economics for AI agents" |
| LinkedIn | Case study post | Real numbers from your own usage |
| xerg.ai | Landing page + waitlist | "Coming soon: team dashboard" email capture |
| Blog | xerg.ai/blog | "What my AI agents actually cost (and how I found out)" |

---

## Legal / Compliance Checklist

- [ ] **Terms of Service** for xerg.ai (required before accepting payments)
- [ ] **Privacy Policy** (required, must address: metadata-only default, optional crash reporting, what Clerk/Stripe/PostHog process)
- [ ] **MIT License** in public repo
- [ ] **Cookie consent** on dashboard (PostHog sets cookies)
- [ ] **Stripe tax configuration** (if selling to EU customers, VAT handling)
- [ ] **SOC 2 planning** (not needed at launch, but enterprise tier promises it — start the conversation with a compliance platform like Vanta once revenue justifies it)
