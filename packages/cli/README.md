# xerg

Xerg is the unit economics engine for AI agents — starting with local waste intelligence for OpenClaw workflows.

It reads your OpenClaw gateway logs and session transcripts, shows where money is leaking in dollars, classifies waste into five categories with distinct fixes, and lets you re-run the same audit with `--compare` so you can see what changed after a fix.

## Install

```bash
npm install -g @xerg/cli
```

Or run it without a global install:

```bash
npx @xerg/cli audit
```

After a global install, run:

```bash
xerg audit
```

## Commands

Inspect local audit readiness:

```bash
xerg doctor
```

Run the first audit:

```bash
xerg audit
```

Compare the latest run against the newest compatible prior local snapshot:

```bash
xerg audit --compare
```

Audit a specific window:

```bash
xerg audit --since 24h --compare
```

## What the audit shows

- Total spend by workflow and model, in dollars
- Observed vs. estimated cost (always labeled)
- Structural waste: retry, context bloat, loop, downgrade candidates, idle
- Savings recommendations with suggested A/B tests
- Before/after deltas on re-audit

## Privacy

Xerg v0 stores economic metadata and audit summaries locally. It does not store prompt or response content.
