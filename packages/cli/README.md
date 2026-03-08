# xerg

Xerg is a local-first CLI for OpenClaw waste intelligence.

It does not try to be generic LLM observability. It reads your agent logs, shows
where money is leaking, and lets you re-run the same audit with `--compare` so
you can see what changed after a fix.

## Install

```bash
npm install -g xerg
```

Or run it without a global install:

```bash
npx xerg audit
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

## What Xerg reports today

- total spend
- observed vs estimated spend
- workflow and model breakdowns
- high-confidence waste
- directional savings opportunities
- before/after re-audit deltas

## Privacy

Xerg v0 stores economic metadata and audit summaries locally. It does not store
prompt or response content.

## Support

For beta access and support, contact `query@xerg.ai`.

## Website

[xerg.ai](https://xerg.ai)
