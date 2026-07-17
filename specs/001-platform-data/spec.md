# Feature Specification: Platform and Data Foundation

**Feature Branch**: `feature/001-platform-data`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: User description: "Build the platform and data foundation for a self-hosted educational hardware-building app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a Local Foundation (Priority: P1)

As a builder, I can start the local foundation in one command so the application has a private,
ready database and local model runtime.

**Why this priority**: Every subsequent subsystem depends on a predictable local environment.

**Independent Test**: On a clean development machine, the foundation starts and reports that the
database and local model runtime are ready.

**Acceptance Scenarios**:

1. **Given** a supported local machine, **When** the builder starts the foundation, **Then** the
   database becomes healthy and the local model runtime accepts a list request.
2. **Given** insufficient graphics memory, **When** the foundation starts, **Then** it reports the
   recommended compatible model tier without using cloud inference.

---

### User Story 2 - Share Safe Contracts (Priority: P1)

As a subsystem developer, I can import one set of validated contracts, mocks, and fixtures so
services exchange reliable, cited, and coordinate-safe data.

**Why this priority**: Typed boundaries prevent incompatible parallel work and unsafe model output.

**Independent Test**: A consuming subsystem validates a representative retrieval response and
weather-station fixture against the shared contracts.

**Acceptance Scenarios**:

1. **Given** a retrieval result, **When** it contains a factual chunk, **Then** validation rejects
   it unless it has a source citation.
2. **Given** a model-produced assembly choice, **When** it contains coordinates, **Then** validation
   rejects it in favor of symbolic mating identifiers.

---

### User Story 3 - Preserve Grounded Knowledge (Priority: P2)

As a lesson author, I can submit curated knowledge through a versioned ingestion boundary so it is
stored with citations and can later be retrieved with relevant inventory filters.

**Why this priority**: Grounded, cited retrieval is required for accurate instructional guidance.

**Independent Test**: A submitted cited chunk can be retrieved by a relevant hardware question and
retains its source information.

**Acceptance Scenarios**:

1. **Given** a cited source chunk, **When** it is submitted through the ingestion boundary, **Then**
   the system records it without allowing a background process to write tables directly.
2. **Given** an inventory-aware query, **When** matching guidance exists, **Then** returned results
   include citations and prefer the relevant parts context.

### Edge Cases

- A local model fails during first-run setup or is unavailable after startup.
- A knowledge chunk has no identifiable citation.
- A CAD asset has no source URL or license.
- A client sends an untyped or structurally invalid cross-subsystem payload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a one-command, fully local startup path for the application
  foundation, database, model runtime, workflow service, and 3D compilation service.
- **FR-002**: The system MUST report database health, local model availability, detected graphics
  memory, and a recommended model tier.
- **FR-003**: The system MUST keep all persistent platform data in one relational system with
  semantic-search support.
- **FR-004**: The system MUST provide validated shared contracts, mocks, and fixtures for all
  cross-subsystem payloads.
- **FR-005**: The system MUST require citations for factual retrieval and lesson content.
- **FR-006**: The system MUST accept only symbolic assembly selections from model-facing contracts;
  deterministic services own transforms and coordinates.
- **FR-007**: The system MUST accept knowledge through a versioned ingestion boundary and reject
  malformed or uncited submissions.
- **FR-008**: The system MUST support retrieval filtered by a builder's known inventory context.
- **FR-009**: The system MUST make GPU-free automated validation possible with recorded local-model
  fixtures.
- **FR-010**: The system MUST reject CAD assets that lack an identifiable source URL or license.

### Constitution Compliance *(mandatory where applicable)*

- **Physical accuracy and provenance**: Model-facing assembly payloads use symbolic identifiers;
  deterministic CAD services own transforms. Factual results retain source citations.
- **LLM contract**: Shared contracts define structured, validated payloads and deterministic fallback
  expectations for every model boundary.
- **Safety**: The platform carries safety categories so Beginner-mode hard blocks and pre-instruction
  callouts can be enforced by consuming features.
- **Local operation and typed boundaries**: Operation remains local-first; persistent data and
  cross-subsystem payloads are centrally owned and typed.
- **Licensing**: Asset records require source and license provenance before use.
- **Verification and performance**: The foundation supports fixture-backed validation, GPU-free
  checks, and measurable startup and retrieval targets.

### Key Entities *(include if feature involves data)*

- **Part record**: A canonical, licensed hardware part and its electrical information.
- **CAD asset record**: A licensed source asset with deterministic mating metadata.
- **Knowledge chunk**: Cited instructional source content prepared for retrieval.
- **Retrieval result**: A ranked, cited knowledge response, optionally scoped to inventory.
- **Shared contract**: A validated payload exchanged between platform, agents, and spatial services.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A clean supported machine reaches a healthy local database and usable local model
  runtime in under 15 minutes, including first-run model downloads.
- **SC-002**: All representative shared fixtures validate successfully, while uncited retrieval
  results and coordinate-bearing model payloads are rejected.
- **SC-003**: A relevant cited answer to a BME280-to-ESP32 question is available from a fresh local
  environment.
- **SC-004**: Automated foundation checks complete without requiring a GPU.

## Assumptions

- Builders use a supported container runtime and have sufficient local disk space for models.
- Initial scope is the ESP32 weather-station golden path.
- Scheduled external ingestion and a rendered health dashboard are deferred; the versioned ingestion
  boundary and machine-readable health information remain in scope.
