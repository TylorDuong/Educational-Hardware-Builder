# Data Model: Agentic Build Discovery

## Core entities

| Entity | Key fields | Relationships and validation |
| --- | --- | --- |
| Source Policy | id, class, allowed URL pattern, refresh policy, enabled state, policy revision | Governs every ingestion request; blocks unknown hosts, paths, and source types. |
| Source Document | id, source policy, canonical URL, title, locator, content hash, license/terms state, fetched/expiry timestamps | Has many chunks and ingestion runs; source/citation required. |
| Ingestion Run | id, source policy, request identity, status, counts, retry/error details, started/completed times | Idempotent by source/external identity and content hash; app-owned audit data. |
| Catalog Offer | id, canonical part, provider/SKU, purchase URL, availability, price/currency, observed/expiry timestamps, source document | Cannot be recommended if source/expiry/license state is invalid. |
| Compatibility Record | id, part pair or capability, relation, cited evidence, validity state | Supports deterministic part matching; never accepts model-only compatibility claims. |
| Discovery Request | id, learner input, mode, budget/constraints, verified inventory references, status | One request has one validated intent and zero or more proposal revisions. |
| Build Intent | request, normalized goal, capabilities, exclusions, hazard assessment, retrieval terms | Must be schema-valid and pass safety policy before retrieval. |
| Build Proposal | id, intent, ranked BOM, alternatives, citations, freshness summary, safety decision, selected state | Every proposed part/offer has traceable local evidence. |
| Guided Build | proposal, cited ordered steps, checkpoints, troubleshooting, symbolic selections, promotion state | Promotion creates/uses build-scoped Workshop records; no raw transforms. |

## State transitions

```text
queued -> safety-screened -> intent-validated -> retrieving -> catalog-matched
      -> generating -> validating -> ready
queued -> blocked
any non-terminal state -> error
ready -> selected -> workshop-active -> complete
```

Only the server may move a discovery or Workshop state forward. A retry creates
an audit-linked revision rather than overwriting validated evidence.

## Retention and freshness

- Source documents retain immutable content hash and citation provenance.
- Offers retain last-known-good data with `observedAt` and `expiresAt`; stale is
  a visible state, never a silently refreshed fact.
- Failed ingestion runs retain errors and do not partially replace prior valid
  records.
- CAD source/license values remain mandatory and separate from vendor offers.
