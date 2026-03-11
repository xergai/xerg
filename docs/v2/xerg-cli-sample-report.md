# Xerg CLI Sample Report

This sample is generated from the local OpenClaw fixture set after a second audit
with `--compare`.

It shows the intended v0 story:

- first audit identifies retry waste and loop waste
- a fix is applied
- the second audit shows the before/after delta

```text
# Xerg audit

Total spend: $0.0548
Observed spend: $0.0548
Estimated spend: $0.0000
Runs analyzed: 8
Model calls: 12
Structural waste identified: $0.0000 (0%)
Potential impact surfaced: $0.0348

## Waste taxonomy
Structural waste
- No confirmed waste buckets detected.
Savings opportunities
- Context bloat: $0.0147 across 1 finding (directional)
- Downgrade candidates: $0.0106 across 2 findings (directional)
- Idle waste: $0.0095 across 1 finding (directional)

## Top workflows
- daily_summary: $0.0257 (100% observed)
- support_agent: $0.0156 (100% observed)
- heartbeat_monitor: $0.0095 (100% observed)
- policy_reviewer: $0.0040 (100% observed)

## Top models
- anthropic/claude-sonnet-4-5: $0.0413 (100% observed)
- anthropic/claude-opus-4: $0.0095 (100% observed)
- anthropic/claude-haiku-4-5: $0.0040 (100% observed)

## High-confidence waste
- none detected

## Opportunities
- Context usage in "daily_summary" is well above its baseline: $0.0147 (medium)
- Idle or monitoring spend detected in "heartbeat_monitor": $0.0095 (medium)
- Candidate model downgrade opportunity in "daily_summary": $0.0077 (low)
- Candidate model downgrade opportunity in "heartbeat_monitor": $0.0029 (low)

## First savings test
- Start with Candidate model downgrade opportunity in "daily_summary": $0.0077 of potential impact
- Why this test first: An expensive model is being used on a workflow that looks operationally simple. Treat this as an A/B test candidate, not proven waste.
- Confirmed leak to close first: none
- Workflow to inspect first: daily_summary

## Before / after
Compared against 2026-03-07T23:59:16.034Z
- Total spend: $0.0619 -> $0.0548 (-$0.0071)
- Structural waste: $0.0071 -> $0.0000 (-$0.0071)
- Waste rate: 12% -> 0% (-12 pts)
- Runs analyzed: 8 -> 8 (0)
- Model calls: 15 -> 12 (-3)
- Biggest improvement: support_agent (-$0.0054)
- Biggest regression: none detected
- First workflow to inspect now: daily_summary
- Model swing to inspect: anthropic/claude-sonnet-4-5 (-$0.0054)
- Resolved: Retry waste is consuming measurable spend ($0.0054)
- Resolved: Workflow "policy_reviewer" ran beyond efficient loop bounds ($0.0017)

## Notes
- Cost per outcome is intentionally unavailable in v0. Xerg is measuring waste intelligence only.
- Opportunity findings are directional recommendations, not proven waste.
```
