# @xerg/schemas

Public wire types for Xerg audit payloads, findings, comparisons, and recommendations.

## What this package is for

`@xerg/schemas` defines the JSON contract shared between the Xerg CLI, the local audit engine, and any service that consumes pushed audit summaries.

It is intentionally small:

- TypeScript-first type definitions for the wire payload
- A runtime `AUDIT_PUSH_PAYLOAD_VERSION` constant for versioned payload checks
- No runtime validation layer yet

## Compatibility contract

`AuditPushPayload.version` is the top-level wire version.

- Additive fields that older consumers can safely ignore should usually keep the same version.
- Breaking changes to existing field names, meanings, or required structure should ship behind a new payload version.
- Producers and consumers should reject payloads with a newer unsupported version instead of guessing.

Current version:

```ts
import { AUDIT_PUSH_PAYLOAD_VERSION } from '@xerg/schemas';

AUDIT_PUSH_PAYLOAD_VERSION; // 1
```

## Runtime validation

This package provides compile-time guarantees only. If you need to validate untrusted JSON at runtime, add a validator in the consuming service and keep it aligned with these exported types.
