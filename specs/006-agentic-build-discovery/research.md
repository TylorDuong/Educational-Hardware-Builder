# Research: Agentic Build Discovery

## Decision: accept free-form input, never free-form product contracts

**Decision**: Accept arbitrary learner text only at the request boundary, then
derive a strict `BuildIntent`, `SafetyDecision`, `BuildProposal`, and
`GuidedBuildPlan`.

**Rationale**: Existing `apps/web/src/agents.ts` already validates local-model
JSON, retries once, and has deterministic fallbacks. This satisfies flexible
input without making model prose an application protocol.

**Alternatives considered**: Directly display model prose (rejected: violates
the constitutional structured-output boundary); restrict learners to a form
only (rejected: does not meet the discovery goal).

## Decision: n8n ingests, the application validates and writes

**Decision**: Add allowlisted n8n workflows as background HTTP clients of a
versioned app upsert endpoint. They receive no database credentials for domain
tables.

**Rationale**: The constitution allows n8n background ingestion while requiring
PostgreSQL as the sole datastore and an application-owned upsert boundary.
Current weather-station seed code identifies its direct database write as a
temporary fallback and there is already an `IngestUpsertSchema` foundation.

**Alternatives considered**: Runtime web/vendor calls (rejected: prohibited);
n8n direct SQL (rejected: violates datastore ownership); uncontrolled crawling
(rejected: cannot guarantee licensing, terms, or safety provenance).

## Decision: cached offers are facts with a lifetime, not real-time commerce

**Decision**: Store normalized vendor link, availability state, price/currency
when available, observed time, expiry, provider identity, and evidence. Mark
expired offers stale and retain last-known-good data without claiming it is
current.

**Rationale**: Shop links are useful only when the learner can judge evidence
and age. Checkout and stock reservation remain outside scope.

**Alternatives considered**: Omit offers (rejected: loses requested sourcing
value); live shop proxy (rejected: runtime external call and terms risk).

## Decision: safety preflight runs before retrieval and generation

**Decision**: Validate the request and structured intent through server-owned
safety policy before catalog retrieval, shopping links, lessons, or solver
work. Beginner mode hard-blocks mains, LiPo charging, unsupported hazards, and
unverified electrical design values.

**Rationale**: Preventing unsafe work early preserves the product's hard safety
gate rather than applying a warning after recommendations are created.

## Decision: preserve solver and Workshop boundaries

**Decision**: A generated plan can emit only approved symbolic part/feature
identifiers. Compatibility is verified by catalog rules; the deterministic
solver computes transforms. Accepted builds become build-scoped Workshop
sessions with server-enforced checkpoints.

**Rationale**: Existing weather fixtures and solver integration already
demonstrate the intended boundaries; the new flow must generalize them, not
replace them with model-owned geometry.
