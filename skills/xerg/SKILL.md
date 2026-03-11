# Xerg

Use this skill when you want a quick local economic audit of OpenClaw activity.

## What it does

- Inspects local OpenClaw gateway logs or session files
- Summarizes spend by workflow and model
- Flags high-confidence waste and lower-confidence optimization opportunities

## Commands

```bash
npx @xerg/cli doctor
npx @xerg/cli audit
```

Optional paths:

```bash
npx @xerg/cli audit --log-file /tmp/openclaw/openclaw-2026-03-06.log
npx @xerg/cli audit --sessions-dir ~/.openclaw/agents
```

## Notes

- Xerg is local-first in v0
- It does not upload prompts or responses
- Cost per outcome is intentionally out of scope for this first release
