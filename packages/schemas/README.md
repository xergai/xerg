# @xerg/schemas

Versioned TypeScript wire types for Xerg audit payloads, daily rollups, findings, comparisons, and the hosted Action Center recommendation contract.

## What it is

`@xerg/schemas` defines the JSON contract shared between the Xerg CLI, the local audit engine, and any service that consumes pushed audit summaries.

It is intentionally small and stable:

- TypeScript-first types for Xerg wire payloads
- Daily spend and waste rollups for hosted dashboards and ingestion pipelines
- A runtime `AUDIT_PUSH_PAYLOAD_VERSION` constant for compatibility checks
- The ranked recommendation contract used by Xerg Cloud, Ask Xerg, and hosted MCP
- A dependency-light package surface for backends, ingestion services, and internal tooling

## What it is not

This package does not perform runtime validation by itself. It provides compile-time guarantees for TypeScript consumers. If you accept untrusted JSON, add runtime validation in the consuming service and keep it aligned with these exported types.

## Install

```bash
npm install @xerg/schemas
```

## Example

```ts
import {
  AUDIT_PUSH_PAYLOAD_VERSION,
  type AuditPushPayload,
} from '@xerg/schemas';

export function acceptAuditPayload(payload: AuditPushPayload) {
  if (payload.version !== AUDIT_PUSH_PAYLOAD_VERSION) {
    throw new Error(`Unsupported payload version: ${payload.version}`);
  }

  return payload.summary.spendByDay;
}
```

## Compatibility contract

`AuditPushPayload.version` is the top-level wire version.

- Additive fields that older consumers can safely ignore should usually keep the same version.
- Breaking changes to existing field names, meanings, or required structure should ship behind a new payload version.
- Producers and consumers should reject payloads with a newer unsupported version instead of guessing.

Current version:

```ts
import { AUDIT_PUSH_PAYLOAD_VERSION } from '@xerg/schemas';

AUDIT_PUSH_PAYLOAD_VERSION; // 2
```

Version `2` adds the richer `XergRecommendation` contract to the pushed payload. Recommendations are now first-class wire data rather than a local-only CLI add-on.

## Exports

Primary exports include:

- `AuditPushPayload`
- `DailySpendBreakdown`
- `DailyWasteBreakdown`
- `WireFinding`
- `WireComparison`
- `XergRecommendation`
- `XergRecommendationPriorityBucket`
- `XergRecommendationSurface`
- `XergRecommendationCategory`
- `AUDIT_PUSH_PAYLOAD_VERSION`

## Use cases

- Share a single payload contract between the Xerg CLI and backend services
- Type audit ingestion pipelines without copying interface definitions
- Gate processing logic on an explicit payload version
- Keep hosted action queues, MCP tools, and dashboard recommendation cards aligned with the CLI
