# Feature Specification: Guided Weather-Station Workshop

**Feature Branch**: feature/003-agents-ux  
**Created**: 2026-07-17  
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Follow a reliable reference build (Priority: P1)

A beginner selects a weather-station reference project and receives a complete ordered path that is dependable in a demo and as safe fallback content.

**Why this priority**: The authored reference journey is the basis for the workshop and every later fallback.

**Independent Test**: Load the plan and verify 12 ordered steps, citations, safety categories, three checkpoints, and symbolic assembly choices.

**Acceptance Scenarios**:

1. **Given** the reference project is selected, **When** its plan is loaded, **Then** the learner receives 12 cited weather-station steps.
2. **Given** a step needs a spatial relationship, **When** it is read, **Then** it uses approved part and feature identifiers, never coordinates.
3. **Given** the learner reaches key milestones, **When** the plan is read, **Then** exactly three checkpoints are present.

### User Story 2 - Learn through a gated workshop (Priority: P2)

A learner works through the fixed workshop experience and cannot bypass a checkpoint.

**Why this priority**: The checkpoint experience is the core learning journey after the authored fixture exists.

**Independent Test**: Attempt to open a locked step before completing its checkpoint.

### User Story 3 - Receive dependable generated guidance (Priority: P3)

A learner receives validated local-model guidance or deterministic authored fallback when generation is invalid or unavailable.

**Why this priority**: Reliability extends the reference journey without replacing it.

**Independent Test**: Simulate invalid local-model output and confirm the matching authored fallback is used.

### Edge Cases

- A Beginner request has a classified hazard, so the safety gate blocks the instruction.
- A symbolic mate is unknown to the solver, so the system retries or uses fallback instead of inventing placement.
- A cited source cannot be fetched, but the recorded source and locator remain visible.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide one fully authored Beginner weather-station reference project with 12 ordered steps.
- **FR-002**: Every reference step MUST include a safety category and cited learning content.
- **FR-003**: The reference project MUST contain exactly three conceptual checkpoints.
- **FR-004**: Every assembly choice MUST use only approved symbolic part and feature identifiers plus an optional fastener, never coordinates or transforms.
- **FR-005**: The reference project MUST include one bounded L-bracket template request.
- **FR-006**: The workshop MUST retain the fixed Dashboard, Inventory, Workshop, in-Workshop 3D Mech View, and Gallery information architecture.
- **FR-007**: Beginner checkpoint progression MUST be enforced by the server; wrong answers receive targeted re-explanation without the answer.
- **FR-008**: Model-facing output MUST use shared contracts, one validation-error retry, and deterministic fallback or a user-facing error.
- **FR-009**: Factual instructional claims MUST retain source URL, locator, and title.

### Constitution Compliance

- **Physical accuracy and provenance**: The authored plan uses symbolic mating choices only, and every lesson retains citations.
- **LLM contract**: Later agents use shared JSON contracts, validation, one retry, deterministic fallback, and low structural temperature.
- **Safety**: Every step declares a safety category; Beginner hazards are hard-blocked before construction instructions.
- **Local operation and typed boundaries**: Local inference, the existing single datastore, and typed API/SSE boundaries remain unchanged.
- **Licensing**: The fixture reuses existing licensed fixture metadata and adds no CAD asset.
- **Verification and performance**: C2 has schema validation now; later work includes governed contract, smoke, CI, and performance checks.

### Key Entities

- **Reference Build Step**: An ordered, cited, safety-categorized instruction with optional checkpoint and symbolic mating choices.
- **Citation**: A source URL, title, and locator supporting an instructional claim.
- **Checkpoint**: A learner question used to control progress.
- **Symbolic Mating Selection**: An approved relationship between existing parts and features.
- **Template Request**: Bounded values for a predefined custom component.

## Success Criteria

- **SC-001**: The reference plan contains exactly 12 ordered steps and 3 checkpoints.
- **SC-002**: 100% of steps contain a safety category and at least one citation.
- **SC-003**: 100% of assembly choices validate as symbolic selections without coordinate or transform fields.
- **SC-004**: The plan and L-bracket request pass automated validation.

## Assumptions

- Shared schemas and B's fixture identifiers are the authority for symbolic references.
- The weather-station path is the only authored project in this sprint slice.
- Advanced variants, visual polish, and browser E2E automation are deferred.
