# PRD: Remote Audit, Team Dashboard, and Agent Platform

**Product:** Xerg
**Author:** Jason Curry
**Status:** Draft
**Version:** 6
**Date:** March 21, 2026
**Revision basis:** PRD v5 (March 21, 2026), GPT-5.4 architectural review, founder decisions on repo structure, domain strategy, and site strategy
**Scope:** Four features shipping across four phases — CLI remote audit (Free tier, Phase 1), Team Dashboard with push ingestion (Team tier, Phase 2a + 2b), agent-as-consumer support (cross-cutting), and agent discovery via `llms.txt` (site infrastructure, Phase 1)

---

## What changed from v5 and why

PRD v5 consolidated the entire platform onto Cloudflare and replaced Next.js with Astro (marketing site) and Vite + React SPA (dashboard). Those decisions were sound and are preserved. This revision tightens execution strategy, fixes correctness issues, and incorporates structural decisions made after v5.

### Changes in v6

**1. Marketing site: greenfield replacement, not migration.** v5 framed the Astro site as a content migration of the existing Next.js/Vercel implementation. That was wrong. The existing site has API routes, HMAC-based waitlist token logic, Resend integrations, in-memory rate limiting, and Vercel analytics — it is not "just copy content and styles." But more importantly, the intent is not to preserve any of that. The plan is to build a new Astro site from new designs with two pages and a Resend-backed submission flow. The old site is reference material, not a migration source. v6 says this plainly.

**2. Marketing site is explicitly non-blocking for Team tier.** The critical path to first revenue is: CLI remote audit → hosted ingest API → dashboard → billing loop. The marketing site can ship in parallel or after Phase 2a. v6 removes any wording that makes the site look like a prerequisite for the Team tier launch.

**3. KV quota enforcement removed from v0.** v5 introduced Cloudflare KV as a counter cache for push quota. This was premature optimization that added correctness risk. KV is eventually consistent — concurrent writes to the same key can overwrite each other, and writes to the same key are limited to 1/second. For a free tier capped at 10 pushes/month, a D1 count query is correct, simple, and will not be a bottleneck until volumes far exceed early-stage reality. v6 uses D1 as the sole quota authority in v0. If a faster counter is ever needed, a Durable Object or D1-backed rollup row is the right path for an authoritative counter — not KV.

**4. No subdomain for the dashboard.** The dashboard is served at `xerg.ai/dashboard/*`, not `dashboard.xerg.ai`. Docs are served at `xerg.ai/docs/*`. A single edge routing Worker at `xerg.ai` dispatches requests by path to the correct origin: `/dashboard/*` → dashboard Pages project, `/docs/*` → Mintlify proxy, everything else → Astro marketing site Pages project. This eliminates cross-subdomain CORS issues, simplifies Clerk origin configuration, and gives a cleaner URL structure.

**5. Two-repo structure.** The codebase splits into two GitHub repos along the trust boundary: `xergai/xerg` (public, MIT) for CLI, core, schemas, skills, and fixtures; `xergai/xerg-cloud` (private) for the hosted API, dashboard, marketing site, Workers, and infrastructure. This supports a clean open-source story without mixed-visibility problems in a single repo.

**6. Public wire schemas in the OSS repo.** `AuditPushPayload`, `WireFinding`, `WireComparison`, and `XergRecommendation` types live in the public `xergai/xerg` repo under `packages/schemas`. This lets third-party tools and agents build against Xerg's machine-readable output formats without depending on private code.

**7. Explicit preview, auth, and environment model.** v5 gave per-PR Pages previews for frontend but a vague single `api-preview.xerg.ai` for the API, with no specification of CORS policy, Clerk domain handling, or Stripe test behavior. v6 adds a dedicated section that defines the complete auth flow, CORS rules, staging model, and environment boundaries.

**8. Host/source terminology cleaned up.** `source_id` is the durable grouping key. "Source" is used throughout when referring to a logical deployment. "Host" is used only when referring to the SSH/network host. `/dashboard/hosts` becomes `/dashboard/sources`.

**9. sourceId semantics tightened.** The `name` field in the remote config is the durable identity for a source. Renaming it creates a new source in the dashboard — this is documented as intentional behavior. A `displayName` override (rename without splitting history) is deferred to a later phase.

**10. Factual errors fixed.** `Finding.details` replaces stale references to `Finding.details_json`. The false claim that "file count and total size can be derived from `runCount`/`callCount`" is removed.

### What did NOT change

The CLI remote audit feature, the push ingestion protocol, the wire schema types, the D1 data model, the API specification, the agent-as-consumer features, the `llms.txt` implementation, the phasing logic, the open-core boundary, and the billing model are all carried forward from v5.

---

## Repository structure

Xerg uses two GitHub repos, split along the trust boundary between open-source distribution and private hosted product.

### `xergai/xerg` — public, MIT

```
xerg/
├── packages/
│   ├── core/              # Analysis engine: detection, normalization, pricing, findings
│   ├── cli/               # CLI entrypoint, commands, remote transport, output formatting
│   └── schemas/           # Public wire types: AuditPushPayload, WireFinding,
│                          #   WireComparison, XergRecommendation
├── skills/xerg/           # SKILL.md for Claude Code, Cursor, and agent ecosystems
├── fixtures/              # Test fixtures (OpenClaw sample data)
├── docs/                  # Internal design notes, architecture docs (if public)
└── .github/workflows/     # CI: test, lint, publish to npm
```

The `packages/schemas` package is independently importable (`@xerg/schemas`) so that third-party tools, agents, and integrations can consume Xerg's machine-readable output formats without depending on `@xerg/core` or `@xerg/cli`. This strengthens the ecosystem story: Xerg publishes the diagnostic format; anyone can build on it.

### `xergai/xerg-cloud` — private

```
xerg-cloud/
├── apps/
│   ├── api/               # Hono on Cloudflare Workers (REST API)
│   ├── dashboard/         # Vite + React SPA (team dashboard)
│   └── site/              # Astro on Cloudflare Pages (marketing site)
├── workers/
│   ├── router/            # Edge routing Worker for xerg.ai path dispatch
│   └── docs-proxy/        # Mintlify proxy Worker
├── infra/                 # Wrangler configs, D1 migrations, deployment scripts
└── .github/workflows/     # CI: build, preview deploy, production deploy
```

### Why two repos

GitHub does not support per-directory visibility within a single repo. If CLI and core are MIT open-source, they cannot live in the same repo as private dashboard, API, and billing code without making everything public or everything private. The two-repo split preserves monorepo DX on both sides while maintaining a clean open/private boundary.

### Cross-repo dependency

`xerg-cloud` depends on `@xerg/schemas` from npm (published from the public repo). This is the only cross-repo dependency. The dashboard and API import wire types from `@xerg/schemas` to validate and render pushed audit data. Changes to the wire schema are versioned and published like any npm package — the hosted product pins a specific version and upgrades deliberately.

---

## Infrastructure map

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cloudflare                                                         │
│                                                                     │
│  DNS          xerg.ai (authoritative), api.xerg.ai                  │
│                                                                     │
│  Workers      xerg.ai              → Edge router (path dispatch)    │
│               api.xerg.ai          → Hono REST API                  │
│                                                                     │
│  Pages        xerg-site.pages.dev  → Astro marketing site           │
│               xerg-dash.pages.dev  → Vite + React SPA dashboard     │
│                                                                     │
│  D1           teams, team_members, pushed_audits                    │
│                                                                     │
│  R2           Future: PDF exports, data export files                │
│  Queues       Future: webhook delivery (Phase 3)                    │
│  Cron Triggers  Future: scheduled digests                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  External services                                                  │
│                                                                     │
│  npm           CLI + schemas distribution (@xerg/cli, @xerg/schemas)│
│  Mintlify      docs.xerg.ai content + llms.txt generation           │
│  Clerk         Auth (GitHub OAuth, org management, API keys, JWT)    │
│  Stripe        Billing (Checkout, Billing Portal, webhooks)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Edge routing Worker

All traffic to `xerg.ai` hits a single Cloudflare Worker that dispatches by path:

| Path pattern | Origin | Notes |
|-------------|--------|-------|
| `/dashboard/*` | Dashboard Pages project (`xerg-dash.pages.dev`) | SPA — all sub-paths serve `index.html` for client-side routing |
| `/docs/*` | Mintlify (`docs.xerg.ai`) | Proxy, strip `/docs` prefix |
| `/*` (everything else) | Marketing site Pages project (`xerg-site.pages.dev`) | Astro static site, including `/llms.txt`, `/skill.md`, `/pilot` |

The router Worker is minimal — roughly 30 lines of fetch-and-forward logic. It adds no compute overhead beyond a single `fetch()` to the correct origin. Both Pages projects deploy independently; the router never changes unless a new top-level path prefix is added.

This architecture means:

- The dashboard SPA is served from `xerg.ai/dashboard/*` — no subdomain, no CORS between dashboard and marketing site.
- Clerk only needs to allow-list one origin (`xerg.ai`) plus `localhost` for development.
- The API remains on `api.xerg.ai` — a separate subdomain is correct here because the API is a different service with different caching, rate limiting, and auth requirements.

### Deployment topology

| Surface | Cloudflare service | URL path | Build tool | Framework | Repo |
|---------|-------------------|----------|------------|-----------|------|
| Edge router | Workers | `xerg.ai/*` | Wrangler | Minimal Worker | `xerg-cloud` |
| Marketing site | Pages | `xerg.ai/*` (default) | Astro CLI | Astro 5.x + React islands | `xerg-cloud` |
| Dashboard SPA | Pages | `xerg.ai/dashboard/*` | Vite | React 19 + Vite 6.x | `xerg-cloud` |
| REST API | Workers | `api.xerg.ai` | Wrangler | Hono | `xerg-cloud` |
| Docs proxy | Workers | `xerg.ai/docs/*` | Wrangler | Minimal Worker | `xerg-cloud` |
| Database | D1 | — | Wrangler migrations | — | `xerg-cloud` |
| CLI | npm | — | tsup | TypeScript | `xerg` |
| Schemas | npm | — | tsup | TypeScript | `xerg` |

---

## Preview, auth, and environment model

This section defines how authentication, previews, and environment isolation work across the platform. These decisions must be made before implementation begins.

### Auth flow: dashboard → API

1. User visits `xerg.ai/dashboard`. The SPA loads.
2. Clerk's `@clerk/clerk-react` provider checks for an active session. If none, redirect to Clerk-hosted sign-in (GitHub OAuth).
3. On authenticated pages, the SPA calls `clerk.session.getToken()` to obtain a short-lived JWT.
4. The SPA sends `Authorization: Bearer {jwt}` on every request to `api.xerg.ai`.
5. The Hono API Worker uses Clerk's JWT verification middleware to validate the token, extract `org_id`, and resolve the team.
6. For CLI push (`xerg audit --push`), the CLI sends `Authorization: Bearer {api_key}` where the API key is a Clerk-issued long-lived key tied to an org.
7. The API Worker accepts both JWT (dashboard) and API key (CLI) auth, resolving both to the same team identity.

### Auth flow: CLI

Phase 2a: user creates an API key in `xerg.ai/dashboard/settings` and sets `XERG_API_KEY` env var or `~/.xerg/config.json`.

Phase 2b: `xerg login` opens a browser to Clerk's device auth flow, receives a token, and stores it locally. After login, the CLI uses the stored token for all API requests.

### CORS policy

The API Worker sets CORS headers based on the request's `Origin`:

| Environment | Allowed origins |
|-------------|----------------|
| Production | `https://xerg.ai` |
| Staging | `https://xerg-dash-staging.pages.dev`, `https://staging.xerg.ai` |
| Local dev | `http://localhost:5173` (Vite dev server) |

The allowed origins list is configured via environment variables in `wrangler.toml`, not hardcoded. The Worker returns `Access-Control-Allow-Origin` matching the request origin if it appears in the allowed list, plus `Access-Control-Allow-Headers: Authorization, Content-Type` and `Access-Control-Allow-Methods: GET, POST, OPTIONS`.

### Environment model

| Environment | API | D1 | Clerk | Stripe | Dashboard |
|-------------|-----|-----|-------|--------|-----------|
| **Production** | `api.xerg.ai` | `xerg-production` | Production instance | Live mode | `xerg.ai/dashboard` |
| **Staging** | `api-staging.xerg.ai` | `xerg-staging` | Development instance | Test mode | `xerg-dash-staging.pages.dev` or `staging.xerg.ai/dashboard` |
| **Local dev** | `localhost:8787` (Wrangler dev) | Local D1 (Wrangler dev) | Development instance | Test mode (or disabled) | `localhost:5173` (Vite dev) |

### Preview strategy

**Shared staging API, per-PR frontend previews.** This is the chosen model.

- Cloudflare Pages generates automatic per-PR preview URLs for both the marketing site and the dashboard. These are useful for visual review of frontend changes.
- The API does **not** get per-PR preview deployments. All frontend previews and staging environments talk to the shared staging API at `api-staging.xerg.ai`, backed by `xerg-staging` D1.
- This is simpler to operate and sufficient for a small team. The trade-off: if two PRs change the API simultaneously, the staging API reflects whichever was deployed last. This is acceptable at current team size. If it becomes a problem, per-PR API Workers can be added later via Wrangler environment naming.

**Why shared staging wins now:**

- Fewer Workers to manage and clean up.
- Clerk and Stripe only need one staging configuration.
- D1 staging data is shared and predictable.
- Reviewers test frontend changes against a stable backend, which is what matters most during frontend-heavy iteration.

### Stripe preview behavior

- **Production:** Stripe live mode. Real charges, real subscriptions.
- **Staging / local dev:** Stripe test mode. Test card numbers, no real charges. Webhook endpoints configured separately for staging.
- The API Worker reads `STRIPE_SECRET_KEY` from environment — production config has the live key, staging has the test key. No conditional logic in code.

### Clerk preview-domain handling

- Clerk's development instance allows localhost and `*.pages.dev` redirect URLs.
- Clerk's production instance allows only `xerg.ai`.
- Per-PR Pages preview URLs (`{hash}.xerg-dash.pages.dev`) work with the Clerk development instance for visual review. Auth will function on preview deploys pointed at the staging API.

---

## Feature 1: CLI Remote Audit via SSH

### Tier

Free (MIT, ships in `@xerg/cli`)

### One-line summary

`xerg audit --remote user@vps.example.com` pulls OpenClaw logs from a remote host over SSH and runs the full local audit against them.

### User story

As a developer running OpenClaw on a VPS, I want to audit my agent spend from my local machine without installing Xerg on the server, so that I can keep my production environment clean and my audit tooling in one place.

### Design principles

- The CLI still does all analysis locally. The remote flag only changes where files come from.
- Zero server-side installation required. Only SSH access.
- The trust model does not change: Xerg never sends data anywhere. It pulls raw files to a local temp directory and processes them the same way it processes local files.
- The 30-second constraint still applies. First remote audit should take under 60 seconds including transfer on a typical VPS.

### CLI interface

```bash
# Basic remote audit — uses default OpenClaw paths on the remote host
xerg audit --remote user@vps.example.com

# Remote audit with time window
xerg audit --remote user@vps.example.com --since 24h

# Remote audit with custom remote paths
xerg audit --remote user@vps.example.com \
  --remote-log-file /opt/openclaw/logs/openclaw.log \
  --remote-sessions-dir /opt/openclaw/sessions

# Remote audit with comparison against local history
xerg audit --remote user@vps.example.com --since 24h --compare

# Remote doctor — check what Xerg can find on the remote host
xerg doctor --remote user@vps.example.com

# Multi-source audit from a config file
xerg audit --remote-config ~/.xerg/remotes.json
```

### New CLI flags

| Flag | Type | Description |
|------|------|-------------|
| `--remote` | `string` | SSH target in `user@host` or `user@host:port` format |
| `--remote-log-file` | `string` | Override the default gateway log path on the remote host |
| `--remote-sessions-dir` | `string` | Override the default sessions directory on the remote host |
| `--remote-config` | `string` | Path to a JSON file defining multiple remote sources |
| `--keep-remote-files` | `boolean` | Retain pulled files in `~/.xerg/remote-cache/` instead of using a temp directory. Default: `false` |

### Remote comparison identity

The current local comparison logic derives `comparisonKey` from source file paths. This breaks for remote audits where files land in different temp directories on each run. For remote audits, the comparison key is overridden to use **logical source identity**: `{remote_host}:{remote_log_path}:{remote_sessions_path}`. This means:

- Two remote audits against the same source with the same paths are comparable regardless of local cache path
- `--compare` works with both temp and cached modes — the identity comes from the remote, not the local filesystem
- The `comparisonKey` override is passed to `packages/core` via the existing `AuditOptions` without changing the core comparison algorithm

This requires a small change in `packages/core`: `AuditOptions` gains an optional `comparisonKeyOverride: string` field. When set, it replaces the path-derived key. The CLI sets this for all `--remote` audits.

### Source identity model

Every audit has a `sourceId` that identifies the logical deployment it came from. This is the durable grouping key used in `/dashboard/sources` and trend queries.

**`name` is the durable identity.** In the remote config, the `name` field is the `sourceId`. Renaming it creates a new source in the dashboard — this is intentional and documented. If a team renames `"production"` to `"prod"`, the dashboard will show two separate sources. A display name override (renaming without splitting history) is deferred to a later phase.

**Fallback generation for `--remote` without config:** When using `--remote user@host` without `--remote-config`, the CLI derives `sourceId` from the host portion of the SSH target (e.g., `prod.example.com`). This is stable and deterministic for the common case.

**Local audits:** `sourceId` defaults to the machine hostname.

### Remote config file format

```json
{
  "remotes": [
    {
      "name": "production",
      "host": "user@prod.example.com",
      "logFile": "/opt/openclaw/logs/openclaw.log",
      "sessionsDir": "/opt/openclaw/sessions"
    },
    {
      "name": "canary",
      "host": "user@prod.example.com",
      "logFile": "/opt/openclaw-canary/logs/openclaw.log",
      "sessionsDir": "/opt/openclaw-canary/sessions",
      "identityFile": "~/.ssh/staging_key"
    }
  ]
}
```

The `name` field flows through as `sourceId` in the push payload, the D1 schema, and all dashboard views. This is what prevents two deployments on the same host (e.g., `production` and `canary` both on `prod.example.com`) from collapsing into one source in the dashboard.

The optional `identityFile` field passes `-i` to SSH/rsync. This is primarily for CI environments where there's no SSH agent — the key is stored as a secret and written to a path before the audit runs.

When `--remote-config` is used without `--remote`, Xerg audits all defined remotes and renders a combined report with per-source breakdown.

### Implementation approach

**Transport: `rsync` over SSH (primary), `tar | ssh` fallback**

The CLI (not core — SSH shell-outs are orchestration, not analysis) shells out to `rsync` to pull files from the remote host into a local temp directory (or `~/.xerg/remote-cache/{source}/` when `--keep-remote-files` is set). If `rsync` is not available locally, the fallback is `tar | ssh` which works on every POSIX system without additional dependencies:

```bash
# Primary: rsync
rsync -avz --include='openclaw-*.log' --exclude='*' \
  user@host:/tmp/openclaw/ /tmp/xerg-remote-{hash}/gateway/

rsync -avz --include='*.jsonl' --exclude='*' \
  user@host:~/.openclaw/agents/*/sessions/ /tmp/xerg-remote-{hash}/sessions/

# Fallback: tar over SSH (no rsync required on either end)
ssh user@host 'tar -czf - -C /tmp/openclaw .' | tar -xzf - -C /tmp/xerg-remote-{hash}/gateway/
```

When `--since` is provided, the CLI computes a cutoff timestamp and uses `rsync --files-from` with a remote `find` to filter files by mtime, avoiding transfer of historical data outside the window.

**After transfer, the existing audit pipeline runs unchanged.** The pulled files are passed to the same `detectOpenClawSources` → `normalizeOpenClawData` → `computeFindings` → `renderReport` flow. The only change to `packages/core` is the `comparisonKeyOverride` field on `AuditOptions`.

### Temp vs. persistent cache

| Mode | Behavior | Use case |
|------|----------|----------|
| Default (temp) | Files pulled to `/tmp/xerg-remote-{hash}/`, deleted after audit | One-off audits, CI pipelines |
| `--keep-remote-files` | Files cached at `~/.xerg/remote-cache/{source}/` | Repeated audits with `--compare`, multi-run tracking |

The cache directory structure mirrors the remote paths:

```
~/.xerg/remote-cache/
  production/
    gateway/
      openclaw-2026-03-18.log
    sessions/
      triage-agent/
        session-1.jsonl
```

### Doctor integration

`xerg doctor --remote user@host` runs the following checks:

1. SSH connectivity (can we reach the host?)
2. Default path existence (do `/tmp/openclaw/` and `~/.openclaw/` exist?)
3. File count and total size at detected paths
4. `rsync` availability on both ends

Output follows the existing doctor format with a `[remote]` prefix on each line.

### Error handling

| Condition | Behavior |
|-----------|----------|
| SSH connection fails | Exit with clear error: "Cannot connect to {host}. Check SSH config and key access." |
| No files found at remote paths | Exit with: "No OpenClaw data found at default paths on {host}. Use --remote-log-file or --remote-sessions-dir." |
| rsync not available | Fall back to `tar | ssh` with a note: "rsync not found, using tar over ssh" |
| Partial transfer (network interruption) | rsync handles resume natively; tar fallback retries the full transfer once |
| Permission denied on remote files | Exit with specific path that failed |

### Security considerations

- Xerg does not store or manage SSH keys. It uses the user's existing SSH agent and config.
- Xerg does not open any ports on the remote host.
- Xerg does not install anything on the remote host.
- Transferred data is OpenClaw telemetry (model names, token counts, costs, timestamps). No prompt or response content crosses the wire — the same as local audit.

### Scope exclusions for v0

- No built-in SSH key management or generation
- No tunnel/proxy support (users can configure this in `~/.ssh/config`)
- No streaming audit (pull then analyze, not analyze during transfer)
- No Windows native support (WSL works; native Windows SSH is a later concern)

### Implementation plan

| Step | Package | Repo | Work |
|------|---------|------|------|
| 1 | `packages/cli` | `xerg` | Extract remote transfer module: `src/transport/ssh.ts` with `pullRemoteFiles(config): Promise<string>` returning a local temp path. Transport is orchestration, not analysis — it stays in CLI. |
| 2 | `packages/core` | `xerg` | Add `comparisonKeyOverride?: string` to `AuditOptions` in `types.ts`. When set, it replaces the path-derived comparison key. |
| 3 | `packages/cli` | `xerg` | Add `--remote`, `--remote-log-file`, `--remote-sessions-dir`, `--remote-config`, `--keep-remote-files` flags to audit and doctor commands |
| 4 | `packages/cli` | `xerg` | Wire remote transport into audit flow: if `--remote` is set, pull first, compute logical comparison key, then pass local temp path + `comparisonKeyOverride` to existing `auditOptions` |
| 5 | `packages/cli` | `xerg` | Add `--since` filtering on the remote side via `find -mmin` before rsync |
| 6 | Tests | `xerg` | Add integration tests with mock SSH (using local directory as fake remote) |
| 7 | Docs | `xerg` | Update CLI README and SKILL.md |

### Success criteria

- `xerg audit --remote user@host` produces the same report as running `xerg audit` locally on that host
- `xerg audit --remote user@host --compare` correctly matches against prior audits from the same remote source, regardless of local temp path
- Transfer of 24h of typical OpenClaw logs (< 50MB) completes in under 10 seconds on a reasonable connection
- `xerg doctor --remote user@host` clearly reports connectivity and file availability
- Only change to `packages/core` is the `comparisonKeyOverride` field on `AuditOptions` — no audit logic changes. Transport lives entirely in `packages/cli`.

---

## Feature 2: Team Dashboard with Push Ingestion

### Tier

Team ($199/mo)

### One-line summary

A hosted web dashboard where teams see aggregated waste intelligence across environments, powered by the CLI pushing audit summaries to a Xerg API.

### User story

As a team lead running OpenClaw agents across multiple VPS instances, I want to see waste trends, compare environments, and share audit results with my team in a persistent dashboard, so that I can track whether our optimization work is actually reducing spend over time.

### Design principles

- **Push, not pull.** The CLI pushes completed audit summaries to the Xerg API. The dashboard never reaches into user infrastructure. Users control exactly what data leaves their environment.
- **Separate wire schema, not raw AuditSummary.** The API receives a versioned `AuditPushPayload` with explicit `WireFinding` and `WireComparison` types — not the internal `Finding` and `AuditComparison` types from core. Local-only fields (`sourceFiles`, `dbPath`, `Finding.details`) are absent from the wire schema entirely, not stripped at serialization time. This decouples internal type evolution from the hosted API contract.
- **The CLI remains the analysis engine.** The hosted backend is a storage and rendering layer, not a compute layer. All waste classification, cost estimation, and findings generation happens locally in the CLI.
- **Clerk for auth, Stripe for billing.** No new auth provider. GitHub OAuth as the primary sign-in method via Clerk.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User's infrastructure (VPS, local, CI)                 │
│                                                         │
│  OpenClaw ──► logs ──► xerg audit --push ──► HTTPS POST │
│                                          (authenticated) │
└──────────────────────────────┬──────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│  Xerg Cloud (Cloudflare — everything)                    │
│                                                          │
│  Workers API (Hono)         api.xerg.ai                  │
│    POST /v1/audits       ← receives AuditPushPayload     │
│    GET  /v1/audits       ← list audits for team          │
│    GET  /v1/audits/:id   ← single audit detail           │
│    GET  /v1/trends       ← waste rate over time          │
│                                                          │
│  Clerk ← auth (JWT from dashboard, API key from CLI)     │
│  D1    ← persistent storage + quota enforcement          │
│                                                          │
│  Edge router Worker         xerg.ai                      │
│    /dashboard/* → Pages (Vite + React SPA)               │
│    /docs/*      → Mintlify proxy                         │
│    /*           → Pages (Astro marketing site)           │
└──────────────────────────────────────────────────────────┘
```

### Data flow

1. User runs `xerg audit --push` (or `xerg audit --remote user@host --push`)
2. CLI computes the full `AuditSummary` locally as it does today
3. CLI runs `toWirePayload(summary)` which maps internal types to wire types (`Finding` → `WireFinding`, `AuditComparison` → `WireComparison`), omits local-only fields (`sourceFiles`, `dbPath`, `Finding.details`), and produces a versioned `AuditPushPayload`
4. CLI reads the API key from `~/.xerg/config.json` or `XERG_API_KEY` env var
5. CLI POSTs the `AuditPushPayload` to `https://api.xerg.ai/v1/audits`
6. Workers API validates auth (Clerk JWT or API key), checks push quota against D1, extracts materialized metrics, associates the audit with the team, stores in D1
7. Dashboard SPA reads from Workers API and renders

Users can inspect exactly what will be sent by running `xerg audit --push --dry-run`, which prints the `AuditPushPayload` to stdout without sending it.

### New CLI additions

**Phase 2a:**

| Flag / Command | Description |
|----------------|-------------|
| `--push` | After computing the audit, run `toWirePayload()` and push to the Xerg API |
| `--push --dry-run` | Print the `AuditPushPayload` to stdout without sending — lets users verify what crosses the wire |

**Phase 2b:**

| Flag / Command | Description |
|----------------|-------------|
| `xerg login` | Authenticate via browser OAuth flow (Clerk), store API key locally |
| `xerg logout` | Remove stored credentials |
| `xerg push` | Push the most recent local audit snapshot without re-running the audit |

### Config file: `~/.xerg/config.json`

```json
{
  "apiKey": "sk_live_...",
  "apiUrl": "https://api.xerg.ai",
  "teamId": "team_..."
}
```

`XERG_API_KEY` and `XERG_API_URL` env vars override the config file (CI-friendly). API keys are Clerk-native — revocation, rotation, and org scoping are handled by Clerk.

### Phase 2a onboarding path

In Phase 2a there is no `xerg login` command. The onboarding flow is:

1. Sign up at `xerg.ai/dashboard` (Clerk OAuth via GitHub)
2. Create or join a team (Clerk org)
3. Go to `xerg.ai/dashboard/settings` → generate an API key
4. Set the key locally: `export XERG_API_KEY=sk_live_...` (or add to `~/.xerg/config.json`)
5. Run `xerg audit --push` (or `xerg audit --remote user@host --push`)
6. View the result at `xerg.ai/dashboard/audits`

For CI, step 4 is `XERG_API_KEY` stored as a GitHub Actions / Railway / etc. secret. Phase 2b adds `xerg login` which automates steps 3-4 via browser OAuth redirect.

### API specification

**Base URL:** `https://api.xerg.ai`

**Authentication:** Bearer token (Clerk-issued JWT or team API key) on every request.

**`POST /v1/audits`**

Request body: `AuditPushPayload` — a versioned, privacy-safe wire schema derived from `AuditSummary`. These types are defined in `@xerg/schemas` (public repo) and imported by both the CLI and the API.

```typescript
// --- Wire types: public, versioned, decoupled from internal AuditSummary ---
// Package: @xerg/schemas (xergai/xerg repo)

interface WireFinding {
  id: string;
  classification: "waste" | "opportunity";
  confidence: "high" | "medium" | "low";
  kind: string;
  title: string;
  summary: string;
  scope: string;
  scopeId: string;
  costImpactUsd: number;
  // Finding.details is intentionally omitted from the wire schema.
  // It's open-ended internally and may contain local-only debug info.
  // If structured details are needed on the dashboard, define explicit
  // wire-safe fields here rather than passing the raw blob.
}

interface WireComparison {
  baselineAuditId: string;
  baselineGeneratedAt: string;
  baselineTotalSpendUsd: number;
  baselineWasteSpendUsd: number;
  baselineStructuralWasteRate: number;
  deltaTotalSpendUsd: number;
  deltaWasteSpendUsd: number;
  deltaStructuralWasteRate: number;
  deltaRunCount: number;
  deltaCallCount: number;
  // workflowDeltas, modelDeltas, findingChanges are omitted from v1.
  // They can be added in a future wire version if the dashboard needs them.
}

interface AuditPushPayload {
  version: 1;
  summary: {
    auditId: string;
    generatedAt: string;
    comparisonKey: string;
    runCount: number;
    callCount: number;
    totalSpendUsd: number;
    observedSpendUsd: number;
    estimatedSpendUsd: number;
    wasteSpendUsd: number;
    opportunitySpendUsd: number;
    structuralWasteRate: number;
    wasteByKind: FindingTaxonomyBucket[];
    opportunityByKind: FindingTaxonomyBucket[];
    spendByWorkflow: SpendBreakdown[];
    spendByModel: SpendBreakdown[];
    findings: WireFinding[];
    notes: string[];
    comparison?: WireComparison | null;
    // sourceFiles is intentionally absent. Local file paths are private.
    // dbPath is intentionally absent. Local SQLite path is private.
  };
  meta: {
    cliVersion: string;
    sourceId: string;        // durable source identity (remote name, or hostname for local)
    sourceHost: string;      // SSH host or machine hostname — display only, not identity
    environment: string;     // "local" | "remote" | "ci"
    pushedAt: string;        // ISO timestamp
  };
}
```

**Key design decisions in the wire schema:**

- `WireFinding` omits `Finding.details` entirely. If specific detail fields are needed in the dashboard, they should be added as named fields on `WireFinding`, not passed through as raw JSON.
- `WireComparison` includes only the top-level deltas. Per-workflow and per-model deltas are omitted in v1 — they can be added in a future wire version if the dashboard needs drill-down comparison.
- `sourceFiles` is absent (not "reduced"). Local file paths never cross the wire.
- `meta.sourceId` is the durable identity for grouping audits by source in `/dashboard/sources` and trend queries. `meta.sourceHost` is retained for display only.

The `toWirePayload()` function lives in `packages/core` (public repo) and is the single enforcement point for mapping internal types to wire types. Any new field added to `AuditSummary`, `Finding`, or `AuditComparison` is private-by-default until explicitly mapped into the corresponding wire type.

Response: `201 Created` with the stored audit ID.

**`GET /v1/audits`**

Query params: `?since=24h`, `?source=production`, `?limit=50`, `?offset=0`

Returns: paginated list of audit summaries with metadata. The `source` filter matches against `source_id`.

**`GET /v1/audits/:id`**

Returns: full audit summary for a single audit.

**`GET /v1/trends`**

Query params: `?since=30d`, `?source=production`, `?metric=wasteRate`

Returns: time-series data for the requested metric, suitable for charting. The `source` filter matches against `source_id`.

Supported metrics: `totalSpend`, `wasteSpend`, `wasteRate`, `runCount`, `callCount`

### D1 schema

These tables live in the hosted D1 database, separate from the local SQLite schema.

```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clerk_org_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL
);

-- API keys are managed by Clerk (creation, revocation, org scoping).
-- The Workers middleware verifies Clerk JWTs/keys and extracts org_id.
-- No separate api_keys table needed — Clerk is the source of truth.

CREATE TABLE pushed_audits (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  audit_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_host TEXT NOT NULL,
  environment TEXT NOT NULL,
  cli_version TEXT NOT NULL,
  pushed_at TEXT NOT NULL,
  -- Materialized metric columns for trends, filters, and quota checks.
  -- Extracted from summary at write time so queries never parse the blob.
  total_spend_usd REAL NOT NULL,
  waste_spend_usd REAL NOT NULL,
  opportunity_spend_usd REAL NOT NULL,
  waste_rate REAL NOT NULL,
  run_count INTEGER NOT NULL,
  call_count INTEGER NOT NULL,
  window_since TEXT,
  -- Full summary retained as opaque blob for detail views only.
  summary_json TEXT NOT NULL,
  UNIQUE(team_id, audit_id)
);

CREATE INDEX idx_pushed_audits_team_pushed
  ON pushed_audits(team_id, pushed_at DESC);

CREATE INDEX idx_pushed_audits_team_source
  ON pushed_audits(team_id, source_id, pushed_at DESC);
```

### Dashboard pages

**Phase 2a:**

| Route | Content |
|-------|---------|
| `/dashboard` | Overview: total spend trend, waste rate trend, latest audits across all sources |
| `/dashboard/audits` | Paginated audit list with filters (source, time range, environment) |
| `/dashboard/audits/:id` | Single audit detail — rendered visually from the stored `AuditPushPayload` |
| `/dashboard/settings` | Team management, Clerk-managed API keys, billing (Stripe portal link) |

**Phase 2b:**

| Route | Content |
|-------|---------|
| `/dashboard/compare` | Side-by-side comparison of two audits (source-to-source or time-to-time) |
| `/dashboard/sources` | Per-source view: each `source_id` with its latest audit and trend |

### Dashboard tech stack

| Concern | Choice |
|---------|--------|
| Framework | Vite + React 19 SPA on Cloudflare Pages |
| Auth | `@clerk/clerk-react` (pure React, no Next.js dependency) |
| Routing | React Router 7 (client-side only — pure SPA routing) |
| Data fetching | TanStack Query (React Query) — mutation support, devtools, explicit cache invalidation |
| Charts | Recharts |
| Styling | Tailwind CSS 4.x with Xerg brand palette (teal `#2dd4a8`, dark substrate `#0a0e14`, waste category colors) |
| UI primitives | shadcn-style local components (framework-independent React components) |
| Build | `vite build` → static files → Cloudflare Pages (no adapter needed) |
| Dev server | `vite dev` (instant HMR, sub-second startup) |

### Billing integration

- Stripe Checkout creates the subscription at Team tier ($199/mo)
- Clerk webhook fires on org creation → creates `teams` row in D1 with `plan: 'free'`
- Stripe webhook fires on subscription events → updates `plan` field on `teams`
- API key generation available on all tiers (free users get keys too — needed for push quota)
- Workers API enforces push quota on `POST /v1/audits`: free teams get 10 pushes/month, Team tier is unlimited
- Stripe Billing Portal linked from dashboard settings for self-service plan management

### Quota enforcement

D1 is the sole authority for push quota in v0. On every `POST /v1/audits` for a free-tier team, the API Worker executes:

```sql
SELECT COUNT(*) FROM pushed_audits
WHERE team_id = ? AND pushed_at >= ?
```

where the timestamp is the start of the current calendar month. If the count is ≥ 10, return 429 with a clear message and upgrade link. Otherwise, proceed with the insert.

This is the boring correct implementation. The free tier is capped at 10 pushes/month. Even at 1,000 free-tier teams pushing at maximum rate, the D1 read volume is trivially within free-tier limits (5 million reads/day). The count query uses the existing `idx_pushed_audits_team_pushed` index.

**Future optimization (not v0):** If ingest volume ever makes the per-push count query a bottleneck, the correct upgrade path is a D1-backed rollup row (a `team_push_counts` table with `team_id`, `month`, `count` updated atomically in the same transaction as the audit insert) or a Durable Object for per-team counters. KV is not suitable for authoritative counters due to eventual consistency and 1-write-per-second-per-key limits.

### What the push payload does NOT include

This is enforced structurally by `toWirePayload()` and the explicit `WireFinding`/`WireComparison` types, not by convention:

- No raw log file contents
- No prompt text
- No response text
- No API keys or credentials from the user's infrastructure
- No local file paths (`sourceFiles` is absent from the wire schema entirely; `dbPath` is absent)
- No `Finding.details` (open-ended internal object, omitted from `WireFinding`)

Users can inspect exactly what will be sent by running `xerg audit --push --dry-run`, which prints the `AuditPushPayload` to stdout without sending it. The wire schema is private-by-default: any new field added to `AuditSummary`, `Finding`, or `AuditComparison` in core is excluded from the push payload until explicitly mapped into the corresponding wire type (`WireFinding`, `WireComparison`).

### Cron and CI integration

For teams that want continuous waste tracking:

```bash
# Cron job on VPS — audit and push every 6 hours
0 */6 * * * xerg audit --since 6h --push

# GitHub Actions — audit after deploy
- name: Audit agent economics
  run: |
    npx @xerg/cli audit --remote ${{ secrets.VPS_HOST }} --since 24h --push
  env:
    XERG_API_KEY: ${{ secrets.XERG_API_KEY }}
```

### Scope exclusions for v0

**Not in Phase 2a (the shippable v0):**

- `/dashboard/compare` — side-by-side comparison (Phase 2b)
- `/dashboard/sources` — per-source view (Phase 2b)
- `xerg push` standalone command — push cached snapshots without re-auditing (Phase 2b)
- `xerg login` — interactive browser auth flow (Phase 2b; `XERG_API_KEY` env var covers CI and local use in 2a)
- No real-time streaming (audits are batch snapshots, not live dashboards)
- No alerting or notifications (Slack/email alerts are a fast-follow)
- No outcome tracking or CPO (this is the next tier, not the Team tier v0)
- No policy enforcement (Enterprise tier)
- No SSO/SAML (Enterprise tier via Clerk)
- No data export from dashboard (v0 is ingest + view; CSV/API export is fast-follow)
- No multi-team / multi-org (one team per Clerk org in v0)

### Implementation plan

**Phase 2a (the shippable v0):**

| Step | Surface | Repo | Work |
|------|---------|------|------|
| 1 | `packages/schemas` | `xerg` | Define `WireFinding`, `WireComparison`, `AuditPushPayload` types. Publish as `@xerg/schemas`. |
| 2 | `packages/core` | `xerg` | Implement `toWirePayload(summary: AuditSummary): AuditPushPayload` — the single enforcement point for mapping internal types to the versioned wire schema |
| 3 | `apps/api` | `xerg-cloud` | Scaffold Hono app on Cloudflare Workers with Clerk JWT verification middleware. Configure `wrangler.toml` with D1 binding. |
| 4 | `apps/api` | `xerg-cloud` | Implement `POST /v1/audits` (validate payload, D1 quota check, extract materialized metrics, insert with idempotency via unique constraint) and `GET /v1/audits` |
| 5 | `apps/api` | `xerg-cloud` | Implement `GET /v1/trends` with time-series aggregation queries against materialized metric columns |
| 6 | `packages/cli` | `xerg` | Add `--push` flag to audit command — run `toWirePayload()`, POST to API. Add `--push --dry-run` to inspect payload without sending. |
| 7 | `workers/router` | `xerg-cloud` | Build edge routing Worker for `xerg.ai` path dispatch (`/dashboard/*`, `/docs/*`, `/*`) |
| 8 | `apps/dashboard` | `xerg-cloud` | Scaffold Vite + React SPA with React Router 7, `@clerk/clerk-react` auth, TanStack Query, Tailwind CSS 4.x, Recharts. Configure Cloudflare Pages deployment. |
| 9 | `apps/dashboard` | `xerg-cloud` | Build `/dashboard` overview with spend and waste rate charts |
| 10 | `apps/dashboard` | `xerg-cloud` | Build `/dashboard/audits` list and `/dashboard/audits/:id` detail |
| 11 | `apps/dashboard` | `xerg-cloud` | Build `/dashboard/settings` with Clerk API key management and Stripe portal |
| 12 | `apps/api` | `xerg-cloud` | Stripe Checkout integration + webhook handlers for subscription lifecycle |
| 13 | Docs | — | API reference on docs.xerg.ai (Mintlify), update CLI README |

**Phase 2b (fast-follow after 2a validation):**

| Step | Surface | Repo | Work |
|------|---------|------|------|
| 1 | `packages/cli` | `xerg` | Add `xerg login` / `xerg logout` commands with Clerk device auth flow |
| 2 | `packages/cli` | `xerg` | Add `xerg push` standalone command for pushing cached snapshots |
| 3 | `apps/dashboard` | `xerg-cloud` | Build `/dashboard/sources` per-source view (grouped by `source_id`) |
| 4 | `apps/dashboard` | `xerg-cloud` | Build `/dashboard/compare` side-by-side comparison |

### Success criteria

- A team can go from setting `XERG_API_KEY` to seeing their first audit in the dashboard in under 5 minutes
- Dashboard renders audit history and waste trends for a team with multiple pushed audits
- Stripe subscription flow works end-to-end: signup → checkout → API key → push → dashboard
- Push payload is verifiable: `xerg audit --push --dry-run` output shows exactly what will be sent, with no local-only fields
- Dashboard loads in under 2 seconds on Cloudflare Pages
- Free tier quota works correctly: 10 pushes/month, 429 on the 11th push with clear upgrade messaging, counter resets on calendar month boundary

---

## Feature 3: Agent-as-Consumer Support

### Motivation

If agents are the ones generating spend, they should also be the ones monitoring and optimizing it. An orchestrator agent that can run `xerg audit --since 1h --json`, parse the output, identify that it's retrying excessively on a task class, and adjust its own behavior — that's the closed economic loop that makes Xerg's thesis real. This isn't a future concern. Agents are already the primary interface for developer tooling in 2026, and Xerg's outputs need to be consumable by them from day one.

### Use cases

- **CI/CD agents** run `xerg audit --push` after every deploy and gate the pipeline on waste rate thresholds
- **Orchestrator agents** periodically self-audit, read findings, and adjust model routing (e.g., "my last 50 Opus calls were classification tasks — downgrade to Haiku")
- **Ops agents** poll `GET /v1/trends` and `GET /v1/audits` to detect waste spikes and file tickets or Slack alerts
- **Coding agents** (Claude Code, Cursor) run `xerg audit --json` as part of their tool loop to understand the cost profile of the code they're writing

### What already works

The current architecture is largely agent-ready without changes:

- `xerg audit --json` outputs structured, machine-parseable `AuditSummary` JSON
- `xerg audit --remote` and `--push` compose cleanly in non-interactive pipelines
- `XERG_API_KEY` env var means no interactive login required
- The API returns JSON with consistent schemas
- Exit codes are meaningful and documented (0 = success, 1 = runtime error, 2 = no data found, 3 = threshold exceeded)

### What needs to be added

**1. Machine-readable recommendations: `xerg-recommendations` schema**

The current findings output is human-readable text. Agents need structured, actionable recommendations they can act on without parsing prose. The CLI should support a `--recommendations` flag (or include it in `--json` output) that emits a machine-readable array:

```typescript
// Package: @xerg/schemas (xergai/xerg repo — public)
interface XergRecommendation {
  id: string;
  action: "downgrade_model" | "reduce_retries" | "trim_context" | "collapse_loop" | "review_idle";
  severity: "high" | "medium" | "low";
  target: {
    workflow: string;
    model?: string;
    taskClass?: string;
  };
  currentCostUsd: number;
  estimatedSavingsUsd: number;
  suggestion: string;           // human-readable description
  testCommand?: string;         // suggested xerg command to verify the fix
}
```

This is the `xerg-recommendations` schema referenced in the ecosystem strategy — a machine-readable format that third-party tools and agents can consume. It lives in `@xerg/schemas` (public repo) so anyone can build on it. Xerg publishes the diagnostic; the agent (or another tool) executes the fix.

**2. Threshold-based exit codes for CI gating**

```bash
# Exit 3 if waste rate exceeds 30%
xerg audit --fail-above-waste-rate 0.30

# Exit 3 if total waste exceeds $50
xerg audit --fail-above-waste-usd 50

# Composable with --push
xerg audit --remote user@host --push --fail-above-waste-rate 0.25
```

This lets CI agents use Xerg as a gate without parsing JSON. The exit code is the signal. Threshold breaches return exit code 3 (not 1), so agents can distinguish "the audit worked but waste is too high" from "the audit itself failed." The full exit code contract: 0 = success, 1 = runtime error, 2 = no data found, 3 = threshold exceeded.

**3. API polling endpoint for ops agents**

The `GET /v1/trends` endpoint already supports this. Add a `GET /v1/alerts` endpoint (fast-follow, not v0) that returns audits where metrics crossed configurable thresholds, so an ops agent can poll a single endpoint instead of computing diffs itself.

**4. SKILL.md as the agent interface contract**

The existing `skills/xerg/SKILL.md` is already the primary way coding agents discover and use Xerg. It should be updated to include the `--recommendations` output format, the threshold flags, and examples of agent-driven optimization loops. This file serves Claude Code, Cursor, and any agent that reads SKILL.md files.

### Design principles for agent consumers

- **Structured output over prose.** Every CLI output mode should have a JSON equivalent. Agents should never need to regex-parse terminal output.
- **Composable flags over interactive flows.** Every action should be achievable in a single non-interactive command. `xerg login` (Phase 2b) is the only interactive command, and it's only needed once — after that, everything works via API key. In Phase 2a, `XERG_API_KEY` env var is the only auth path.
- **Exit codes are API.** Non-zero exit codes should have documented, stable meanings that agents can branch on.
- **Recommendations are suggestions, not commands.** Xerg tells the agent what to change and estimates the savings. The agent decides whether and how to act. Xerg never executes changes to the agent's configuration.

### Implementation plan

| Step | Package | Repo | Work |
|------|---------|------|------|
| 1 | `packages/schemas` | `xerg` | Define `XergRecommendation` type |
| 2 | `packages/core` | `xerg` | Implement `buildRecommendations(summary): XergRecommendation[]` |
| 3 | `packages/cli` | `xerg` | Add `--fail-above-waste-rate` and `--fail-above-waste-usd` threshold flags |
| 4 | `packages/cli` | `xerg` | Include `recommendations` array in `--json` output |
| 5 | `skills/xerg` | `xerg` | Update SKILL.md with recommendation schema, threshold flags, and agent loop examples |
| 6 | Docs | — | Document exit codes, recommendation schema, and CI integration patterns on docs.xerg.ai |

### Sequencing

Agent-as-consumer work is split across phases:

- **Phase 1 (ships with remote audit):** threshold exit codes (`--fail-above-*`), since these are simple flag additions to the existing CLI
- **Phase 2a (ships with dashboard v0):** `XergRecommendation` schema in `--json` output, SKILL.md updates, API documentation for agent polling
- **Phase 3 (fast-follow):** `GET /v1/alerts` endpoint, webhook support for push-based agent notification

---

## Feature 4: Agent Discovery via `llms.txt`

### Motivation

Xerg is a product built for agent economics. If an agent can't discover, understand, and start using Xerg without a human reading the docs first, that's a contradiction. The `llms.txt` standard — proposed by Jeremy Howard (Answer.AI) in September 2024 and adopted by Anthropic, Cloudflare, Stripe, Cursor, Vercel, and others — solves exactly this problem: a machine-readable markdown file at the domain root that gives agents a structured map of the site's most important content.

For Xerg specifically this is more than infrastructure hygiene. It's a brand statement: "we built this for agents, and we made it agent-discoverable from the start." The docs are already on Mintlify, which has native `llms.txt` generation support.

### What ships

**1. `xerg.ai/llms.txt`** — structured index following the llms.txt spec.

**2. `xerg.ai/llms-full.txt`** — complete content. A single markdown file concatenating the essential content an agent needs to understand and use Xerg end-to-end. Mintlify generates this automatically from docs.xerg.ai. The Astro site serves it from the root domain as well.

**3. `xerg.ai/skill.md`** — direct-serve SKILL.md. The existing `skills/xerg/SKILL.md`, served at a public URL for agents that don't use the skills ecosystem.

**4. "For Agents" link on xerg.ai** — a visible link in the site footer pointing to `/llms.txt`. The link text is **"For Agents"**.

### Implementation plan

| Step | Surface | Repo | Work |
|------|---------|------|------|
| 1 | `apps/site` | `xerg-cloud` | Create `src/pages/llms.txt.ts` — Astro static endpoint serving curated markdown |
| 2 | `apps/site` | `xerg-cloud` | Create `src/pages/llms-full.txt.ts` — Astro static endpoint; initially hand-authored, later auto-generated from Mintlify |
| 3 | `apps/site` | `xerg-cloud` | Create `src/pages/skill.md.ts` — Astro static endpoint serving SKILL.md contents |
| 4 | `apps/site` | `xerg-cloud` | Add "For Agents" link to site footer component |
| 5 | Mintlify | — | Enable `llms.txt` generation on docs.xerg.ai (native Mintlify feature) |
| 6 | Docs | — | Add a brief "Agent Integration" page to docs explaining the discovery files |

### Success criteria

- `curl https://xerg.ai/llms.txt` returns valid markdown following the llms.txt spec
- `curl https://xerg.ai/llms-full.txt` returns a complete, self-contained markdown document
- An agent given only the URL `https://xerg.ai/llms.txt` can discover the CLI, understand the install command, and run a first audit without human guidance
- "For Agents" link is visible in the site footer

---

## Marketing site strategy

Xerg will ship a new marketing site on Cloudflare Pages using Astro. This is a greenfield replacement of the current site, not a feature-parity migration of the existing Next.js/Vercel implementation.

The required surface area is intentionally small:

- `/` — homepage / product landing page
- `/pilot` — pilot / contact page
- `/llms.txt`, `/llms-full.txt`, and `/skill.md` — agent discovery files
- A simple Resend-backed submission flow for waitlist / pilot contact (implemented as an Astro server endpoint)
- Cloudflare Web Analytics (replaces Vercel Analytics)

Existing Vercel code is reference material only. The new site is built from new designs. We are not preserving old route handlers or rebuilding every current implementation detail.

### Marketing site workstream

The marketing site is a parallel workstream, not a dependency for Team tier launch. The critical path remains:

1. CLI remote audit
2. Hosted ingest API
3. Dashboard
4. Billing/auth loop

The Astro site can be built and deployed independently. DNS cutover should happen only after the new site is validated, but Team tier backend/dashboard work must not wait on this cutover.

### Marketing site replacement checklist

| # | Task | Notes |
|---|------|-------|
| 1 | Scaffold `apps/site` as Astro on Cloudflare Pages in `xerg-cloud` | New project, not a port |
| 2 | Implement the new homepage design at `/` | From new design files |
| 3 | Implement the new pilot page at `/pilot` | From new design files |
| 4 | Implement `llms.txt`, `llms-full.txt`, and `skill.md` as Astro static endpoints | |
| 5 | Implement a minimal Resend-backed submission endpoint for waitlist/pilot intake | Astro server endpoint |
| 6 | Add Cloudflare Web Analytics | Free, no cookie banner |
| 7 | Deploy to staging on Cloudflare Pages | Validate forms, email delivery, links |
| 8 | Deploy edge router Worker and cut DNS for `xerg.ai` | This is the cutover moment |
| 9 | Retire the old Vercel site and remove Vercel dependencies | Cleanup |

### Analytics replacement

The current site uses Vercel Analytics. Replace with Cloudflare Web Analytics — free, privacy-first, no cookie banner required. Add the script tag and it works.

---

## Sequencing

```
Phase 1 (now → 2 weeks)       Phase 2a (weeks 3–5)          Phase 2b (weeks 6–7)        Phase 3 (fast-follow)
─────────────────────────────  ─────────────────────────────  ──────────────────────────  ─────────────────────────
CLI Remote Audit               Team Dashboard v0              Dashboard expansion         Agent Platform
  - --remote flag                - Hono Workers API (ingest     - /sources per-source       - GET /v1/alerts
  - --remote-config                + trends + D1 quota)           view                     - Webhook via Queues
  - rsync + tar|ssh transport    - D1 with materialized         - /compare side-by-side     - SKILL.md ecosystem
  - doctor --remote                metrics                      - xerg login/logout           distribution
  - comparisonKeyOverride        - Clerk + Stripe               - xerg push standalone
  - sourceId semantics           - Edge router Worker
  - tests + docs                 - Vite + React SPA
                                   /dashboard overview
                                   /dashboard/audits + detail
Agent: threshold flags             /dashboard/settings        Agent: recommendations
  - --fail-above-waste-rate      - --push + --push --dry-run    - XergRecommendation schema
  - --fail-above-waste-usd       - docs + @xerg/schemas          (in @xerg/schemas)
                                                                - --json includes recs
Agent Discovery                                                 - SKILL.md updates
  - llms.txt + llms-full.txt
  - /skill.md route
  - "For Agents" footer link

Parallel (non-blocking):
  Marketing site replacement
  - New Astro site on CF Pages
  - Resend form
  - Analytics replacement
  - DNS cutover when validated
```

Phase 1 ships independently as a CLI release in the public `xergai/xerg` repo. It has zero dependency on the hosted backend and is valuable on its own — it makes Xerg usable for any developer with a VPS. Threshold flags ship here because they're simple CLI additions with high value for CI pipelines and agent loops. The `llms.txt` files and "For Agents" link ship here if the Astro site is ready, otherwise they ship with the marketing site cutover.

Phase 2a is the minimum shippable hosted product: ingest API, auth, billing, audit list/detail, and a minimal overview. The edge router Worker and dashboard SPA deploy to `xerg.ai/dashboard`. No interactive login (API key env var covers CI and local use), no compare, no per-source view. The goal is to validate that people will push audits and look at the dashboard before building more pages.

Phase 2b adds the dashboard features that depend on 2a having real usage data: compare, per-source views, `xerg login` for non-CI users, and `xerg push` for cached snapshots.

Phase 3 is the agent-platform layer: push-based notifications and the alerts API that let ops agents react to waste spikes without polling. Cloudflare Queues is the natural delivery mechanism for webhook fan-out.

The marketing site replacement runs in parallel with all phases. It must not block any phase. DNS cutover happens when the new site is validated.

---

## Relationship to existing product decisions

- **Open-core boundary holds and is now structurally enforced.** The two-repo split (`xergai/xerg` public, `xergai/xerg-cloud` private) makes the boundary a GitHub-level reality, not just a convention. Remote transport lives in `packages/cli` (MIT). Core gains only a `comparisonKeyOverride` field. Wire schemas live in `packages/schemas` (MIT). Workers API, dashboard, and push ingestion are private in `xerg-cloud`.
- **Local-first trust model extends, not breaks.** Remote audit keeps analysis local. Push is opt-in and inspectable via `--push --dry-run`. The wire schema is structurally separate from internal types — local-only fields are absent by design, and new internal fields are excluded until explicitly mapped.
- **Cloudflare is the entire platform.** Zero Vercel dependency. One platform, one bill, $250K in credits covering the lot.
- **Public schemas strengthen the ecosystem.** `@xerg/schemas` in the public repo means third-party tools and agents can build on `AuditPushPayload`, `WireFinding`, and `XergRecommendation` without depending on private code. Xerg publishes the diagnostic format; anyone can consume it.
- **XergLedger remains deferred.** Nothing in this PRD depends on or advances XergLedger. This is XergCore validation scope. When XergLedger ships, it joins the public repo as `packages/ledger`.
- **Site OTel claim remains unresolved.** This PRD does not add OTel support. The site copy about OTel should still be corrected independently.
- **Agent-as-consumer validates the ecosystem strategy.** The `xerg-recommendations` schema is the first implementation of the principle that Xerg owns diagnostic and enforcement layers while publishing machine-readable output for third-party tools and agents.
- **`llms.txt` is the RSS of the agent era.** Mintlify's native support means docs.xerg.ai gets this nearly for free.

---

## Resolved decisions

1. **API key format: Clerk-native.** Revocation, rotation, and org scoping for free without building a custom key management layer.
2. **Push size limits: 2MB uncompressed, gzip on storage.** A typical audit is well under 100KB. Gzip before D1 write buys 10-20x headroom against the 1MB row limit. Decompress on read.
3. **Free tier push allowance: 10 audits/month.** D1 count query as sole enforcement in v0. The conversion funnel is: free CLI → free push → "I want my team to see this" → Team tier. When quota is exhausted, the CLI returns a clear message with the upgrade path.
4. **Dashboard URL: `xerg.ai/dashboard`.** No subdomain. Edge routing Worker dispatches by path.
5. **Multi-source report rendering: per-source reports with a combined summary header.** When `--remote-config` audits multiple sources, the CLI renders a short combined summary block at the top followed by the full per-source reports in sequence. Each source's audit is pushed as a separate record in `pushed_audits`, and the dashboard aggregates them by team.
6. **Marketing site framework: Astro.** Greenfield replacement, not migration. Non-blocking for Team tier.
7. **Dashboard framework: Vite + React SPA.** No SSR needed for authenticated views. Static files on Cloudflare Pages.
8. **Quota enforcement: D1-only in v0.** No KV. Future optimization path is D1 rollup row or Durable Object, not KV.
9. **Two repos: `xergai/xerg` (public) + `xergai/xerg-cloud` (private).** Split by trust boundary.
10. **Public wire schemas: `@xerg/schemas` in the OSS repo.** Third parties and agents can build on Xerg's output formats.
11. **Preview model: shared staging API, per-PR frontend previews.** Clerk dev instance + Stripe test mode for staging.
12. **sourceId: `name` field is durable identity.** Renaming creates a new source. Display name override deferred.

---

## Phase 3 infrastructure additions (preview)

Phase 3 introduces agent-platform features that benefit from additional Cloudflare primitives. These are scoped here for architectural planning but are not committed work.

| Cloudflare service | Use case | Why |
|--------------------|----------|-----|
| **Queues** | Webhook delivery fan-out. When an audit crosses a threshold, enqueue a delivery message. Consumer Worker processes the queue with retries. | Decouples ingest latency from webhook delivery. |
| **Cron Triggers** | Scheduled digest emails. Weekly waste summary sent to team leads. | Native Workers cron — no external scheduler. |
| **R2** | Data export storage. Generate CSV/PDF in a Worker, store in R2 with pre-signed URL. | Avoids D1 blob storage for large files. |
| **Durable Objects** | (Speculative.) Real-time collaboration or live audit streaming. | Only worth considering if the product moves toward live dashboards. |

---

## CI/CD and deployment pipeline

### `xergai/xerg` (public repo)

| Trigger | Action |
|---------|--------|
| Push to `main` | Lint + test → publish changed packages to npm via Changesets |
| PR | Lint + test |

### `xergai/xerg-cloud` (private repo)

| Surface | Trigger | Action | Target |
|---------|---------|--------|--------|
| `apps/site` (Astro) | Push to `main` | `astro build` → Cloudflare Pages deploy | `xerg-site.pages.dev` (served via router at `xerg.ai/*`) |
| `apps/site` (Astro) | PR | `astro build` → Pages preview deploy | `{hash}.xerg-site.pages.dev` |
| `apps/dashboard` (Vite) | Push to `main` | `vite build` → Cloudflare Pages deploy | `xerg-dash.pages.dev` (served via router at `xerg.ai/dashboard/*`) |
| `apps/dashboard` (Vite) | PR | `vite build` → Pages preview deploy | `{hash}.xerg-dash.pages.dev` |
| `apps/api` (Hono) | Push to `main` | `wrangler deploy` | `api.xerg.ai` |
| `apps/api` (Hono) | Push to `main` on staging branch | `wrangler deploy --env staging` | `api-staging.xerg.ai` |
| `workers/router` | Push to `main` | `wrangler deploy` | `xerg.ai` |
| `workers/docs-proxy` | Push to `main` | `wrangler deploy` | `xerg.ai/docs/*` (via router) |
| D1 migrations | Push to `main` | `wrangler d1 migrations apply` | Production D1 |

### `wrangler.toml` configuration (API Worker)

```toml
name = "xerg-api"
main = "src/index.ts"
compatibility_date = "2026-03-21"

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://xerg.ai"

[[d1_databases]]
binding = "DB"
database_name = "xerg-production"
database_id = ""

# Phase 3
# [[queues.producers]]
# binding = "WEBHOOK_QUEUE"
# queue = "xerg-webhooks"

[env.staging]
name = "xerg-api-staging"
vars = { ENVIRONMENT = "staging", ALLOWED_ORIGINS = "https://xerg-dash-staging.pages.dev,http://localhost:5173" }

[env.staging.d1_databases]
binding = "DB"
database_name = "xerg-staging"
database_id = ""
```

### `wrangler.toml` configuration (Edge Router Worker)

```toml
name = "xerg-router"
main = "src/index.ts"
compatibility_date = "2026-03-21"
routes = [{ pattern = "xerg.ai/*", zone_name = "xerg.ai" }]

[vars]
SITE_ORIGIN = "https://xerg-site.pages.dev"
DASHBOARD_ORIGIN = "https://xerg-dash.pages.dev"
DOCS_ORIGIN = "https://docs.xerg.ai"
```

---

## Appendix: Why these framework choices over alternatives

### Dashboard: Why Vite + React SPA over Remix on Cloudflare Workers

- **Simpler mental model.** An SPA is a static bundle that talks to an API. No server rendering, no loader/action patterns, no hydration to debug.
- **Faster iteration.** Vite dev server starts in under 200ms. Builds are sub-second.
- **No adapter dependency.** A Vite SPA on Cloudflare Pages is static files — there is nothing to break.
- **The dashboard doesn't need SSR.** Every route is behind authentication. No search engine will ever index it.
- **Migration path preserved.** React Router 7 is the client-side subset of Remix — the upgrade path to SSR is literal.

### Marketing site: Why Astro over Remix

- **Zero JS by default.** A marketing page doesn't need client-side hydration.
- **Better performance for content pages.** Less JavaScript = faster LCP.
- **Simpler content authoring.** Astro's content collections are purpose-built for the blog posts and changelog entries a marketing site accumulates.
- **No lock-in.** Astro components are just HTML with scoped styles. React islands are just React components.

### API: Why Hono stays

Hono is built for Cloudflare Workers, has a Web Standards-based API, excellent middleware ecosystem (including Clerk middleware), TypeScript-first, and fast. It was already the right choice.
