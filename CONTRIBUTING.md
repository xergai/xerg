# Contributing

This repo is intentionally small. Keep it that way.

## Working rules

1. Prefer one source of truth for shared logic.
   If logic is needed by both the CLI and future surfaces, it belongs in `packages/core`, not duplicated.

2. Keep product scope narrow.
   Do not add hosted-product features, SDKs, auth, billing, or governance work unless the current v2 docs explicitly move the scope.

3. Treat `apps/site` as transitional maintenance-only code.
   Keep fixes there minimal. New hosted site work should not be added here by default.

4. Keep one-off code out of the repo root.
   Put temporary scripts in `scripts/`.

5. Promote or delete one-off scripts quickly.
   If a script becomes useful twice, turn it into a documented utility. If it was truly one-time, delete it after use.

6. Use the temp area for scratch output.
   Write disposable files to `tmp/` or `.tmp/`, both of which are gitignored.

7. Run the repo check before pushing.

```bash
pnpm check
```

8. Use the current docs in `docs/`.
   The old `docs/v1` and `docs/v2` split is no longer present in this repo.

## Notes

- Node is pinned by `.nvmrc`.
- The project uses Biome for formatting and linting.
- The site and CLI should stay simple until the first CLI beta proves the wedge.
