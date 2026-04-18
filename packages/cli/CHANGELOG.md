# @xerg/cli

## 0.5.0

### Minor Changes

- Upgrade the shared recommendation contract to payload v2, include ranked recommendations on the push wire format, add stable recommendation IDs plus structured scope labels, and replace the terminal "First savings test" block with the new Action queue summary.

## 0.4.0

### Minor Changes

- Add an init-first onboarding flow with new `init`, `connect`, and `mcp-setup` commands, reuse shared auth resolution across local and hosted follow-up, and refresh docs and bundled skill messaging around free local audits plus optional hosted setup.

## 0.3.0

### Minor Changes

- Add Hermes as a first-class local runtime alongside OpenClaw, including `--runtime` selection, local auto-detection, runtime-aware compare/push labels, updated bundled skill content, and refreshed docs for local-only Hermes support.

## 0.2.0

### Minor Changes

- Add daily spend and waste series to local audit output and pushed audit payloads, keeping the hosted API contract version stable while expanding the dashboard-ready rollups.

## 0.1.10

### Patch Changes

- Improve Railway diagnostics and command hints so package-run installs show the right `npx`/`pnpm dlx` guidance, document the Railway doctor and audit flow, and keep installed launcher detection accurate.

## 0.1.9

### Patch Changes

- Add `--verbose` progress output for `doctor` and `audit`, and make no-data doctor guidance point users toward explicit local paths plus SSH and Railway inspection flows.

## 0.1.8

### Patch Changes

- Refresh the bundled Xerg skill content, align the npm package README with the current local-first workflow and waste taxonomy wording, and publish the skill to ClawHub as part of future CLI releases.

## 0.1.7

### Patch Changes

- Clarify the bundled skill path for local versus global installs, refresh the supported Node runtime note, and update the README remote-audit wording to match the current CLI behavior.

## 0.1.6

### Patch Changes

- Include the bundled Xerg skill in the published CLI package and document where npm installs place `skills/xerg/SKILL.md`.
