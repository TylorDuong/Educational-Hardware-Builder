# Tasks: Golden-Path Integration (Owner A Slice)

**Input**: `specs/004-integration/spec.md`

**Scope**: The G2 specification names all six seams. This executable list is intentionally
pruned to Tylor's assigned seams: real retrieval, real inventory/parts records, demo reset,
and safe model-loss fallback. Solver, 3D, and template seams remain with B and C.

## Phase 1: Integration Boundary

- [X] T001 [P] Add retrieval and inventory integration coverage in `apps/web/tests/integration.test.ts`.
- [X] T002 [P] Add a deterministic demo-reset operation contract test in `apps/web/tests/integration.test.ts`.

## Phase 2: User Story 1 - Grounded Project Guidance (Priority: P1)

**Goal**: Route agent research through the real retrieval service and preserve citations.

**Independent Test**: A weather-station research request receives a cited result from a database-backed retrieval dependency; an unavailable model falls back to cited fixture content.

- [X] T003 [US1] Create the typed real retrieval adapter in `apps/web/src/integration.ts`.
- [X] T004 [US1] Expose the integrated research boundary from `apps/web/src/server.ts`.

## Phase 3: User Story 2 - Real Inventory and Parts (Priority: P2)

**Goal**: Return persisted catalog/inventory records instead of a mock repository.

**Independent Test**: A seeded user inventory request returns the catalog-backed ESP32 and BME280 records, while an unmatched row remains explicitly unverified.

- [X] T005 [US2] Add typed catalog-backed inventory lookup in `apps/web/src/integration.ts`.
- [X] T006 [US2] Expose the inventory integration endpoint in `apps/web/src/server.ts`.

## Phase 4: User Story 3 - Demo Recovery (Priority: P3)

**Goal**: Reset known demo state and make fixture fallback operations explicit.

**Independent Test**: The reset operation accepts the documented flags, seeds the cited corpus, and warms models when available; failure instructions preserve `DEMO_SAFE_MODE`.

- [X] T007 [US3] Add the repeatable reset operation in `scripts/demo-reset.ps1`.
- [X] T008 [US3] Document integration validation and fallback operations in `specs/004-integration/quickstart.md`.

## Phase 5: Verification

- [X] T009 Run the web integration tests and typecheck from `apps/web/package.json`.
- [X] T010 Run the existing web, schemas, solver, and scad-service test suites and record the results in `specs/004-integration/quickstart.md`.

## Dependencies & Execution Order

T001-T002 precede T003-T008. T003-T004 implement retrieval; T005-T006 implement inventory; T007-T008 implement operations. T009-T010 run after the code and documentation work.

## Pruned This Week

The solver collision retry loop, real solver transforms in the viewer, template compile/validation error UX, and live-GPU sign-off are other G2 owners' seams. No new product features are permitted.

## B7 — Ani's Spatial and Template Seams

**Scope**: Execute after C6 is done on `feature/004-integration`. These tasks close seams 3–5
without changing the already-completed owner-A work above.

- [X] T011 [P] Add real-solver and safe-template adapter tests in `apps/web/tests/spatial-integration.test.ts`.
- [X] T012 [US4] Add fixture asset lookup, typed solver-error presentation, transform trace checks, and L-bracket compile adapter in `apps/web/src/spatial-integration.ts`.
- [X] T013 [US4] Route assembly retries through typed solver feedback in `apps/web/src/agents.ts`.
- [X] T014 [US4] Replace sandbox fixture transforms with solver-traced transforms in `apps/web/src/sandbox.tsx`.
- [X] T015 [US4] Add solver and scad-service workspace dependencies in `apps/web/package.json`.
- [X] T016 [US4] Run web tests, typecheck, sandbox build, solver tests, and scad-service tests; record B7 verification in `specs/004-integration/quickstart.md`.
