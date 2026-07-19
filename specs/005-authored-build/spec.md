# Feature Specification: Second Authored Beginner Build

**Feature Branch**: `codex/authored-build`  
**Created**: 2026-07-18  
**Status**: Planned

## Purpose

Extend the Workshop from its single weather-station fixture to one additional, fully authored beginner build. The exact build is deliberately selected during T001 so the developer can choose only a low-voltage, locally supportable project with verifiable sources, inventory, and CAD metadata.

## User Stories

### User Story 1 - Select an authored build (Priority: P1)

A learner can select the weather station or the new beginner build before starting the guided path.

**Independent test**: The build registry returns both manifests, the selected build loads its own cited plan, and an unknown build identifier is rejected.

### User Story 2 - Complete a safe guided path (Priority: P1)

A learner can complete the new build through a cited, checkpoint-gated Workshop without bypassing a required checkpoint.

**Independent test**: A fresh session is denied a locked step, receives re-explanation for a wrong checkpoint answer, and unlocks the next step after the correct answer.

### User Story 3 - Inspect a validated assembly (Priority: P2)

A learner sees the new build's relevant parts and a deterministic 3D assembly state without model-generated coordinates.

**Independent test**: Every new mating selection is symbolic and solver-traced; invalid selections and template failures remain typed, readable errors.

### User Story 4 - Run a dependable local demo (Priority: P3)

A developer can launch and verify either authored build with `pnpm quickstart`, even when Docker and local models are unavailable.

**Independent test**: Fixture-mode tests exercise both build manifests, and the quickstart smoke path serves the build-selection UI and static workshop assets.

## Functional Requirements

- The selected build MUST be a beginner-appropriate, low-voltage project; mains AC, LiPo charging, and unverified hazards are out of scope.
- The build MUST have an explicit brief covering purpose, intended learner, approved parts, safety category for every step, sources, source locators, and asset licenses.
- The build MUST contain an ordered cited plan with at least two server-enforced conceptual checkpoints.
- The build MUST use shared Zod contracts and a typed registry; the client and server MUST use the same selected build identifier.
- Every spatial relationship MUST use approved symbolic part and feature identifiers. Only the deterministic solver may produce a transform.
- Any new template request MUST use bounded values and preserve compile, zero-volume, and out-of-bounds rejection paths.
- `DEMO_SAFE_MODE` MUST serve both authored builds without Docker, a GPU, or live Ollama.
- The existing weather-station path MUST remain unchanged and passing.

## Out of Scope

- Free-form project generation, arbitrary user-authored builds, new navigation tabs, cloud services, authentication, and more than one additional build.
- Live-model quality work beyond preserving the existing structured fallback boundary.

## Success Criteria

- The registry exposes exactly two authored beginner builds with independent cited fixtures.
- Every new step validates through the shared schema and includes safety metadata and citation provenance.
- The new path is checkpoint-gated by the server and supports deterministic 3D/solver feedback.
- Web, schemas, solver, and SCAD-service tests; web typecheck; and sandbox build pass without Docker or a GPU.
