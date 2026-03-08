# Xerg CLI Beta Checklist

This is the gate for publicly inviting users to try the Xerg CLI.

## In-repo readiness

Done:

- `xerg doctor` detects OpenClaw gateway logs and session transcript fallbacks
- `xerg audit` reports total spend, observed vs estimated spend, workflow/model breakdowns, and ranked findings
- `xerg audit --compare` reuses local snapshot history without a schema migration
- terminal, JSON, and Markdown reports all include the compare model
- waitlist, double opt-in, confirmed segment handling, and site-side support path are live
- npm package metadata, package README, license files, pack dry run, and package smoke script exist in-repo

## External beta gates

These must be completed before public invite:

1. Run Xerg on several real OpenClaw datasets.
2. Confirm the findings remain believable on real logs, not just fixtures.
3. Confirm the pricing catalog covers the models that appear in those logs.
4. Verify a clean-machine install path from npm.
5. Publish the first beta package and verify `npx @xergai/cli --help` outside the repo.
6. Monitor `query@xerg.ai` during beta.
7. Decide the beta feedback intake path while the repo remains private.

## Real-log validation worksheet

Complete at least three runs like this before public invite:

### Validation 1

- source:
- primary workflows found:
- observed spend share:
- top confirmed waste:
- top opportunity:
- compare output useful after fix:
- blockers found:

### Validation 2

- source:
- primary workflows found:
- observed spend share:
- top confirmed waste:
- top opportunity:
- compare output useful after fix:
- blockers found:

### Validation 3

- source:
- primary workflows found:
- observed spend share:
- top confirmed waste:
- top opportunity:
- compare output useful after fix:
- blockers found:

## Beta publish steps

1. Create or update a changeset for `@xergai/cli`.
2. Run `corepack pnpm install`.
3. Run `corepack pnpm check`.
4. Run `corepack pnpm build`.
5. Run `corepack pnpm cli:pack`.
6. Run `corepack pnpm cli:smoke`.
7. Version with `corepack pnpm changeset version`.
8. Publish beta with `corepack pnpm release:beta`.
9. Verify the package on a clean machine with `npx @xergai/cli --help`.

## Definition of ready for public invite

Public invite is ready when:

- a new user can install the CLI in minutes
- the first report is useful without manual interpretation
- the second report clearly shows before/after change
- docs and landing page do not overpromise beyond the CLI
- support and beta feedback intake are active
