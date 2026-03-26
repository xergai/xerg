# Xerg Development Status Audit — v2 (Repo-Verified)

**Date:** March 25, 2026
**Source:** PRD v6, full chat history (2,469 lines), and verified file-by-file review of `xergai/xerg` and `xergai/xerg-cloud` repo contents via project knowledge

---

## Phase 1: CLI Remote Audit — COMPLETE ✅

All work in `xergai/xerg` (public, MIT).

### What exists in the repo

**`packages/schemas`** — Wire types defined and exported from `src/index.ts`: `WireFinding`, `WireComparison`, `AuditPushPayload`, `FindingTaxonomyBucket`, `SpendBreakdown`, `XergRecommendation`. Builds with tsup (ESM + .d.ts). `tsconfig.json` extends `tsconfig.base.json`. Package is `@xerg/schemas@0.1.0`.

**`packages/core`** — Exports from `src/index.ts` confirm: `audit`, `db/read`, `detect/openclaw`, `recommendations`, `report/render`, `types`, `utils/paths`, `wire`. Package is `@xergai/core@0.1.0` with `@xerg/schemas` as a workspace dependency and `better-sqlite3` for local persistence.

**`packages/core/src/recommendations.ts`** — `buildRecommendations(summary)` is fully implemented with template-driven recommendation generation for five waste kinds: `retry-waste`, `loop-waste`, `context-outlier`, `candidate-downgrade`, and `idle-spend`. Each template produces structured `XergRecommendation` objects with `actionType`, `suggestedChange`, and estimated savings.

**`packages/core/src/wire.ts`** — `toWirePayload()` exists (confirmed via export in index.ts).

**`packages/cli`** — Full transport layer in `src/transport/`:
- `ssh.ts` — rsync primary, tar|ssh fallback
- `railway.ts` — base64-encoded tar pipe through Railway SSH (PTY binary corruption workaround), `--since` filtering, alternate session path discovery (`/data/.clawdbot/agents/main/sessions/`)
- `config.ts` — Remote config loader with validation for SSH and Railway entries
- `types.ts` — `RemoteSource`, `RemoteConfig`, `PullResult`, `RemoteDoctorReport`, `RailwayTarget`, `RailwayDoctorReport`
- `index.ts` — Re-exports all transport functions

**Tests** — 56 tests passing across 6 test files. Transport tests cover SSH source building, Railway source building, comparison key stability/uniqueness, SSH vs Railway key non-collision, config loading (pure SSH, pure Railway, mixed, all validation error cases).

**CI/CD** — Three GitHub Actions workflows in `xergai/xerg`:
- `ci.yml` — lint, typecheck, test, build, CLI pack dry run, CLI smoke test (runs on PR and push to main)
- `publish-npm.yml` — manual workflow dispatch for publishing `@xerg/schemas` and `@xerg/cli` to npm via Trusted Publishing

**Validated end-to-end:** CLI pulled real OpenClaw data from Railway, ran audit ($8.88 total, 198 calls, 2 sessions, zero waste — correct result), dry-run payload confirmed clean.

---

## Phase 2a (xerg repo side): Wire Payload + Push — COMPLETE ✅

**`--push` and `--push --dry-run`** wired into all audit paths (local, SSH remote, Railway remote, multi-remote). Push config reads `XERG_API_KEY` env var, falls back to `~/.xerg/config.json`. `XERG_API_URL` overrides default endpoint.

---

## Phase 2a (xerg-cloud repo side): API + Dashboard + Infrastructure — CODE COMPLETE, PARTIALLY DEPLOYED

### API Worker (`apps/api`) — COMPLETE ✅

Verified source files:

**`src/index.ts`** — Hono app with CORS middleware on all routes, stripe webhook route (pre-auth), auth middleware on `/v1/*`, and five route modules: `audits`, `sources`, `trends`, `stripeCheckout`, `stripeWebhook`. Health check at `/health`.

**`src/middleware/auth.ts`** — Clerk JWT verification via `verifyToken` from `@clerk/backend`. Falls back to API key verification via `https://api.clerk.com/v1/api_keys/verify`. Resolves to `teamId` through D1 lookup on `clerk_org_id`. **Auto-provisions teams** — if no team exists for a Clerk org, creates one automatically with `plan: 'free'`. Has dev-mode bypass: when `ENVIRONMENT === 'development'`, all Bearer tokens resolve to `team_dev` (no Clerk verification).

**`src/middleware/cors.ts`** — Reads `ALLOWED_ORIGINS` from env, splits on comma, returns matching origin header on both OPTIONS preflight and actual requests.

**`src/routes/audits.ts`** — `POST /v1/audits` (Zod validation via `auditPushPayloadSchema`, D1 quota check via separate `checkPushQuota` function, materialized metric extraction, gzip-encoded `summary_json`, idempotent insert with UNIQUE constraint → 409 on duplicate). `GET /v1/audits` (paginated with `?since`, `?source`, `?limit`, `?offset`, `parseSinceToISO` helper). `GET /v1/audits/:id` (decompresses summary_json).

**`src/routes/sources.ts`** — `GET /v1/sources` — aggregates pushed audits by `source_id` with count, latest push time, latest spend and waste rate. Uses a subquery + self-join pattern.

**`src/routes/trends.ts`** — `GET /v1/trends` with `?since`, `?source`, `?metric` params.

**`src/routes/stripe.ts`** — `POST /v1/stripe/webhook` handles `checkout.session.completed` (sets `stripe_customer_id`, `stripe_subscription_id`, upgrades plan to 'team'), `customer.subscription.updated` (adjusts plan based on status), `customer.subscription.deleted` (downgrades to 'free'). Uses `stripe.webhooks.constructEventAsync` for signature verification. `POST /v1/checkout` creates a Stripe Checkout Session.

**Separate utility modules:** `lib/gzip.ts` (encode/decode), `lib/quota.ts` (push quota check), `lib/schemas.ts` (Zod validation).

### Edge Router (`workers/router`) — COMPLETE ✅

**`src/index.ts`** — Dispatches by path: `/dashboard` → `DASHBOARD_ORIGIN`, `/docs` → `DOCS_ORIGIN` (strips prefix), everything else → `SITE_ORIGIN`. Uses configurable env vars.

**`wrangler.toml`** — Routes `xerg.ai/*`, vars for `SITE_ORIGIN`, `DASHBOARD_ORIGIN`, `DOCS_ORIGIN`.

### Dashboard (`apps/dashboard`) — COMPLETE ✅ (EXCEEDS Phase 2a SPEC)

**`src/app.tsx`** — Seven routes, not four. The dashboard includes Phase 2b pages that were built ahead of schedule:
- `/` — OverviewPage (Phase 2a)
- `/audits` — AuditsPage (Phase 2a)
- `/audits/:id` — AuditDetailPage (Phase 2a)
- `/sources` — SourcesPage (Phase 2b — built early)
- `/sources/:sourceId` — SourceDetailPage (Phase 2b — built early)
- `/compare` — ComparePage (Phase 2b — built early)
- `/settings` — SettingsPage (Phase 2a)

Clerk dark theme, TanStack Query with 30s stale time, React Router 7 with `basename: '/dashboard'`.

**`src/lib/hooks.ts`** — Five TanStack Query hooks: `useAudits`, `useAudit`, `useTrends`, `useSources`, `useCreateCheckout`. All use Clerk `getToken()` for auth.

**`src/lib/api.ts`** — Fetch wrapper attaching Clerk JWT.

**`package.json`** — Dependencies: `@clerk/clerk-react`, `@clerk/themes`, `@tanstack/react-query`, `react@19.1.0`, `react-router@7.5.0`, `recharts@2.15.3`. DevDependencies: `tailwindcss@4.1.3`, `vite@6.3.1`, `wrangler@4.25.0`.

**`vite.config.ts`** — `base: '/dashboard/'`, Tailwind vite plugin, manual chunk splitting (vendor, clerk, charts).

### Marketing Site (`apps/site`) — SCAFFOLDED ✅

Astro 5.x on `@astrojs/cloudflare`. `tsconfig.json` extends `astro/tsconfigs/strict`. Homepage and pilot page implemented from new designs with shared Nav, Footer, Base layout components.

### CI/CD (`xerg-cloud`) — COMPLETE ✅

**`.github/workflows/deploy.yml`** — Change detection via `dorny/paths-filter` with five targets: api, dashboard, site, router, migrations. Per-target deploy jobs:
- API Worker: build, apply D1 migrations (if changed), `wrangler deploy`
- Router Worker: typecheck, `wrangler deploy`
- Dashboard: build, `wrangler pages deploy dist --project-name xerg-dash`
- Site: build, `wrangler pages deploy dist --project-name xerg-site`

All gated on `github.event_name == 'push'` (PRs only build, don't deploy). Node 24, pnpm 10.6.2.

### Infrastructure Deployed

- Workers: `xerg-api` at `xerg-api.jason-0d6.workers.dev`, `xerg-api-staging`, `xerg-router` at `xerg.ai/*`
- Worker secrets: CLERK_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (placeholder) — on both production and staging
- D1: `xerg-production` and `xerg-staging` databases, migrations applied to both
- GitHub Actions secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
- Clerk: Development instance, GitHub + Google OAuth, Organizations enabled
- Stripe: Xerg account (jason@xerg.ai), Team product ($199/mo price ID: `price_1TDopIEXtrWYnP7VObbUt3sJ`, $1,999/yr)

### Local E2E Validated

CLI push → API (dev bypass) → D1 → Dashboard — full loop confirmed working. Both via CLI `--push` and direct curl POST.

---

## What Is NOT Done — Verified Gap List

### Critical Path to Staging/Production

1. **`api.xerg.ai` custom domain** — Workers deployed but custom domain not yet added in Cloudflare dashboard. The chat ends with this as the literal next step.

2. **GitHub Actions deploy verification** — `infra/ci-cd` branch was merged to main. Need to confirm the workflow ran successfully and all Pages projects were created.

3. **Cloudflare Pages environment variables** — Dashboard needs `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` set as build-time env vars in Cloudflare Pages project settings (or GitHub Actions).

4. **Stripe webhook secret** — Still a placeholder. Need to create the endpoint at `https://api.xerg.ai/v1/stripe/webhook` in Stripe dashboard, subscribe to three events, set the real `whsec_...` via `wrangler secret put`.

5. **Real Clerk auth on staging** — Dev bypass works locally, but real Clerk JWT verification hasn't been tested against the deployed API Worker.

6. **Real CLI push with Clerk API key** — Need to: sign in to dashboard → create org → generate API key → push with real key. Tests the full production auth path.

7. **Stripe checkout end-to-end** — Click upgrade → Stripe Checkout → test card → webhook → plan update in D1. Never tested against deployed infrastructure.

### Code Gaps vs. PRD Spec

8. **`--fail-above-waste-rate` and `--fail-above-waste-usd` threshold flags** — Built in `xerg` via Phase 2b CLI work. The audit command parses both flags, checks thresholds after local and remote audits, and sets exit code 3 on breach.

9. **`llms.txt`, `llms-full.txt`, `skill.md` routes on Astro site** — PRD Feature 4, Phase 1. Astro site scaffolded but agent discovery endpoints not implemented.

10. **"For Agents" footer link** — Part of Feature 4.

11. **`@xerg/schemas` not yet published to npm** — Verified against npm: `@xerg/cli` is published at `0.1.4`, but `@xerg/schemas` is not present on the registry. The manual `publish-npm.yml` workflow currently expects `NPM_TOKEN`, and the repo's GitHub Actions secrets listing is empty at time of verification.

12. **Resend-backed submission flow** — Astro site has pages but the Resend form endpoint wasn't confirmed as implemented.

13. **Cloudflare Web Analytics** — Not added to Astro site.

14. **Clerk production instance** — Only development instance exists. Production needs separate instance with redirect URLs locked to `https://xerg.ai`.

15. **API docs on Mintlify (docs.xerg.ai)** — PRD Phase 2a step 13. Not done.

16. **Vercel site disconnection** — Old Vercel site still auto-deploys on push to `xergai/xerg`. Needs to be disconnected before or during DNS cutover.

### Phase 2b Items (some already built in dashboard, need API support verification)

17. **`/dashboard/sources` and `/dashboard/compare`** — Dashboard pages exist in the router and have components, but need verification that the API endpoints they call (`GET /v1/sources` exists ✅, compare logic unclear) return the expected data shapes.

18. **`xerg login` / `xerg logout`** — Built in `xerg` via Phase 2b CLI work. `xerg login` implements a device-auth flow with browser launch, polling, and local credential storage; `xerg logout` clears stored credentials.

19. **`xerg push` standalone command** — Built in `xerg` via Phase 2b CLI work. The command can push the most recent cached audit or a specific payload file, with `--dry-run` support.

---

## Recommended Sequence to Staging

1. **Verify CI/CD ran** — Check GitHub Actions at `xergai/xerg-cloud/actions` (5 min)
2. **Add `api.xerg.ai` custom domain** — Cloudflare dashboard (5 min)
3. **Set Pages env vars** — `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL=https://api.xerg.ai` for xerg-dash project (5 min)
4. **Set Stripe webhook secret** — Create endpoint in Stripe, `wrangler secret put` (10 min)
5. **Trigger deploy** — Push to main or manual dispatch (5 min)
6. **Test real auth** — Sign in at deployed dashboard, verify API calls succeed (15 min)
7. **Push real audit** — From Mac mini with real API key (10 min)
8. **Test Stripe checkout** — Test card end-to-end (15 min)


