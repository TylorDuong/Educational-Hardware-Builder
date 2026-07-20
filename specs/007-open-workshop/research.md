# Research: Open Workshop

## Decision: classify relevance and malicious intent, not physical hazard

**Decision**: Replace `SafetyDecision` with a typed request-classification
result that approves relevant good-faith technical prompts and rejects only
off-topic or malicious prompts before retrieval.

**Rationale**: This implements Constitution v2.0.0 and lets the discovery flow
remain structured, local, deterministic in fixture mode, and testable without
using physical hazard as a denial condition.

**Alternatives considered**: Retain hazard flags as warnings (rejected: the
requested product behavior has no hazard-based learner restriction); permit
all text (rejected: off-topic and malicious content must still be screened).

## Decision: remove quiz and lock contracts end to end

**Decision**: Remove checkpoint answer data, grading routes, lock checks, and
client quiz controls rather than merely hiding them in the UI.

**Rationale**: A hidden client control would leave server-side gated behavior
and a confusing contract. Direct navigation must be true for both selected and
authored fixture lessons.

**Alternatives considered**: Make checkpoints optional (rejected: legacy
payloads could still activate a gate); automatically answer every checkpoint
(rejected: retains irrelevant grading and state).

## Decision: skill support is cited lesson data

**Decision**: Add cited skills-library entries directly to each guided lesson
step, sourced only from the proposal's local citation set or deterministic
fixture corpus.

**Rationale**: It gives each step self-directed learning support without a new
runtime network path or uncited content source.

**Alternatives considered**: Live web search (rejected: learner runtime must
remain local-first); a global uncited link list (rejected: relevance and
provenance would be missing).
