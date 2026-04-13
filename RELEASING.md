# Releasing Xerg

This repo currently keeps the user-facing release surfaces in sync on the same semver.

## Version convention

- Keep these files on the same version for a normal synced release:
  - `package.json`
  - `packages/core/package.json`
  - `packages/cli/package.json`
  - `packages/schemas/package.json`
- The published ClawHub skill version is derived from `packages/cli/package.json` in `.github/workflows/publish-npm.yml`.
- In practice, that means `@xerg/cli`, `@xerg/schemas`, and the ClawHub Xerg skill should usually ship on the same version.

## User-facing surfaces to update before release

- Mintlify docs in `docs/`
- Root repo README in `README.md`
- npm CLI listing content in `packages/cli/package.json` and `packages/cli/README.md`
- npm schemas listing content in `packages/schemas/package.json` and `packages/schemas/README.md` when contract language changes
- ClawHub listing content in `skills/xerg/README.md` and `skills/xerg/SKILL.md`

## Messaging invariants

Keep these points stable across README, docs, npm, and skill surfaces:

- local audits and `--compare` are free
- hosted sync and hosted MCP are optional cloud features
- users can skip hosted setup and keep using Xerg locally
- paid requirements must be disclosed before hosted auth or hosted setup begins
- paid-feature messaging must not undermine the free local-first value path

## What is automated

- Mintlify previews/deployments are handled by the docs integration when docs change on GitHub.
- `.github/workflows/publish-npm.yml` verifies the repo, publishes npm packages, and publishes the ClawHub skill.
- `scripts/sync-cli-skill.mjs` copies the canonical skill file into the npm CLI package during build and pack.

## What is still manual

- Updating docs and listing copy
- Bumping versions
- Merging to `main`
- Triggering the publish workflow or creating GitHub releases

## Recommended synced release flow

1. Merge the release PR to `main`.
2. Trigger the `Publish to npm and ClawHub` workflow with `publish_target=all`.
3. Supply release notes in `clawhub_changelog`.
4. Keep the ClawHub tags current with the supported surfaces and runtimes.
5. Verify:
   - npm package metadata and README
   - ClawHub listing text and tags
   - Mintlify docs on the site
