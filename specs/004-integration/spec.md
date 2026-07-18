# Feature Specification: Golden-Path Integration

**Feature Branch**: `feature/004-integration`

**Created**: 2026-07-17

**Status**: Draft

**Input**: Integrate the platform/data, spatial/3D, and agents/UX subsystems without adding features. This owner-A slice replaces the agents' retrieval and inventory/parts mocks with their real platform/data implementations, provides demo reset operations, and proves model-server failure degrades safely.

## User Scenarios & Testing

### User Story 1 - Learn from grounded project guidance (Priority: P1)

A learner completing the weather-station build sees guidance sourced from the ingested knowledge corpus rather than a retrieval mock, with the source information visible for every factual claim.

**Why this priority**: Grounded, cited instruction is a core safety and accuracy requirement and is the first integration seam.

**Independent Test**: Start the application with seeded corpus content, request weather-station guidance, and verify the returned lesson claims retain the retrieved source title, URL, and locator.

**Acceptance Scenarios**:

1. **Given** the seeded knowledge corpus is available, **When** a learner starts the weather-station build, **Then** the agents use the real retrieval path and return citations from ingested source records.
2. **Given** the live model service becomes unavailable during a build, **When** guidance is requested, **Then** the learner receives deterministic cited fixture content instead of a crash.

---

### User Story 2 - Build from the learner's real inventory (Priority: P2)

A learner's parts guidance is based on the persisted parts catalog and inventory records rather than a mock repository.

**Why this priority**: Inventory-aware parts selection is the second owner-A integration seam and removes an inaccurate demo substitute.

**Independent Test**: Seed a learner inventory, request the weather-station parts guidance, and verify the returned parts correspond to the persisted records.

**Acceptance Scenarios**:

1. **Given** a learner has the seeded ESP32 and BME280 inventory records, **When** the build requests parts guidance, **Then** the response uses those catalog-backed records.
2. **Given** a required part is absent from inventory, **When** parts guidance is requested, **Then** the response reports the missing part without inventing availability.

---

### User Story 3 - Recover a reliable demonstration environment (Priority: P3)

A demonstrator can reset the local environment to known seeded data and warmed models before a run, and can continue safely when live inference fails.

**Why this priority**: Repeatable operations prevent a transient local-model failure from derailing the integration demo.

**Independent Test**: Run the reset operation, then simulate an unavailable model service and verify the fixture fallback remains usable.

**Acceptance Scenarios**:

1. **Given** a demo machine has accumulated data, **When** the demonstrator runs the reset operation, **Then** the weather-station seed data is restored and required local models are warmed within one minute.
2. **Given** the model service stops mid-build, **When** a learner continues, **Then** the application remains usable through `DEMO_SAFE_MODE` fixture content.

### Edge Cases

- The retrieval service has no matching source records; the application returns an honest empty or fallback result without fabricating a citation.
- A persisted inventory entry cannot be matched to the parts catalog; the application preserves it as unavailable rather than treating it as a verified part.
- The reset operation cannot reach the local model service; it completes data reset and reports that fixture mode should be used.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST replace the agents' retrieval mock with the existing real retrieval capability for the weather-station golden path.
- **FR-002**: Every factual claim shown through the integrated retrieval path MUST retain a source title, URL, and locator.
- **FR-003**: The system MUST replace the agents' inventory and parts mock repository with persisted catalog and learner-inventory records.
- **FR-004**: The system MUST surface a missing or unverified part honestly and MUST NOT invent stock, compatibility, or source facts.
- **FR-005**: The system MUST provide a repeatable demo reset operation that clears demo state, reseeds the weather-station data, and warms configured local models when available.
- **FR-006**: If the local model service becomes unavailable during a build, the system MUST continue with deterministic fixture content under `DEMO_SAFE_MODE` rather than crashing.
- **FR-007**: This integration slice MUST NOT add product features or replace the deterministic spatial solver, transform viewer, or template compile-validation seams owned by the other G2 shares.

### Constitution Compliance

- **Physical accuracy and provenance**: This slice changes no spatial computation; it preserves the solver-owned transform boundary. Retrieved factual claims retain source title, URL, and locator.
- **LLM contract**: Existing agent calls continue to use the shared Zod schemas, JSON-mode validation, one retry, and deterministic fixture fallback; this slice must not create a free-form model protocol.
- **Safety**: Existing step safety categories and Beginner hard blocks remain server-enforced and render before instructions.
- **Local operation and typed boundaries**: The integration uses the local Compose stack, PostgreSQL/pgvector as the sole datastore, and existing typed contracts at retrieval, inventory, and agent boundaries.
- **Licensing**: This slice adds no CAD asset and preserves asset provenance obligations.
- **Verification and performance**: GPU-free tests cover retrieval/inventory integration and fallback. The reset path targets completion within one minute; the full G2 team validates the clean-machine and live-GPU acceptance checks.

### Key Entities

- **Retrieved Guidance**: A factual learning response backed by one or more source records with title, URL, and locator.
- **Parts Catalog Record**: A canonical, persisted part description used to verify inventory and guidance.
- **Learner Inventory Record**: A persisted available or unverified part associated with a learner.
- **Demo Reset Result**: The recorded outcome of clearing demo data, reseeding the golden path, and attempting to warm local models.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of factual claims displayed in the integrated weather-station path retain source title, URL, and locator.
- **SC-002**: The weather-station parts response for seeded inventory uses persisted catalog and inventory records in every automated integration run.
- **SC-003**: The demo reset operation restores seeded data and attempts model warmup in under one minute on the demo machine.
- **SC-004**: In all automated model-service failure drills, the active build remains usable with deterministic fixture content and no unhandled error.

## Assumptions

- The merged A5 retrieval API, database schema, corpus seed, and C5 agent fallback path are the integration authorities.
- C owns the live-versus-fixture readiness call for G2; this slice exposes reliable fallback behavior but does not declare G2 complete alone.
- Solver, 3D transform, and OpenSCAD compile-validation seams are owned by the corresponding B and C G2 shares.
