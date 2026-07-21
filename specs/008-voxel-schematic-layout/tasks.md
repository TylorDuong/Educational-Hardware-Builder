# Tasks: Deterministic 3D Schematic Layout

**Input**: Design documents from `/specs/008-voxel-schematic-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/schematic-layout.md, quickstart.md

**Tests**: Shared-contract and fixture tests, deterministic solver tests, and
GPU-free web integration tests are required. No live model, Docker, or browser
CAD asset is required for this fixture-backed increment.

## Phase 1: Shared contract foundation

**Purpose**: Define the trusted physical-fact and symbolic-agent boundaries.

- [X] T001 Add strict dimensional-evidence, semantic-anchor, constraint-graph, and solver-layout Zod contracts in `packages/schemas/src/index.ts`.
- [X] T002 [P] Add source-backed integer bounds and confidence evidence to `packages/schemas/fixtures/weather-station-parts.ts`.
- [X] T003 [P] Add contract and fixture regression coverage in `packages/schemas/tests/schematic-layout.test.ts` and `packages/schemas/tests/weather-station-parts.test.ts`.

**Checkpoint**: The shared package accepts only cited verified dimensions and
strictly symbolic agent graph data.

---

## Phase 2: Foundational deterministic layout engine

**Purpose**: Build the spatial boundary before any viewer consumes it.

- [X] T004 Add failing 100-run repeatability, containment, collision, quarantine, flexible-routing, and assembly-sequence cases in `packages/solver/tests/schematic-layout.test.ts`.
- [X] T005 Implement sparse integer-grid placement, typed rejection, confidence quarantine, bounded A* routing, and canonical sequence validation in `packages/solver/src/schematic-layout.ts`.
- [X] T006 Export the schematic solver while preserving mating-solver behavior in `packages/solver/src/index.ts`.

**Checkpoint**: Solver-owned output is repeatable, collision-free, bounded, and
never accepts model-provided coordinates.

---

## Phase 3: User Story 1 - Inspect a physically coherent assembly (Priority: P1)

**Goal**: Render the fixture scene using its deterministic world layout rather
than a presentation grid.

**Independent Test**: A fixture graph produces ready placements and the viewer
uses their position/dimensions with zero presentation offset at default view.

- [X] T007 [P] [US1] Add a fixture constraint graph and solver-to-view adapter in `apps/web/src/schematic-scene.ts`.
- [X] T008 [P] [US1] Update world-space bounding-box rendering and solver-derived explode behavior in `apps/web/src/components/MechView.tsx`.
- [X] T009 [US1] Update Workshop scene consumers and add integration/render regression coverage in `apps/web/src/sandbox.tsx`, `apps/web/tests/schematic-scene.test.ts`, `apps/web/tests/mech-view.test.ts`, and `apps/web/tests/sandbox-discovery.test.ts`.

**Checkpoint**: The default Workshop scene displays the deterministic assembly
layout without an index-based grid.

---

## Phase 4: User Story 2 - Review uncertain dimensions before layout (Priority: P1)

**Goal**: Keep inaccurate parts out of the calculated scene and surface a typed
review outcome.

**Independent Test**: An asset below the threshold yields `quarantined`, and
the web adapter does not create drawable parts from it.

- [X] T010 [P] [US2] Add structured Extractor/Architect model-boundary helpers with one-retry fallback and coordinate-leak coverage in `apps/web/src/schematic-agents.ts` and `apps/web/tests/schematic-agents.test.ts`.
- [X] T011 [US2] Surface the fixture layout's typed non-ready state without blocking Workshop navigation in `apps/web/src/schematic-scene.ts`, `apps/web/src/sandbox.tsx`, and `apps/web/tests/schematic-scene.test.ts`.

**Checkpoint**: Missing or weak dimensions request review rather than producing
an apparently valid schematic.

---

## Phase 5: User Story 3 - Understand connected assemblies (Priority: P2)

**Goal**: Show deterministic flexible routes that avoid rigid components.

**Independent Test**: Fixture routes start/end at named anchors and never cross
occupied rigid cells; a blocked route has an explicit error.

- [X] T012 [US3] Carry solver-generated route points into the view model and render schematic route lines in `apps/web/src/schematic-scene.ts` and `apps/web/src/components/MechView.tsx`.
- [X] T013 [US3] Assert route rendering and typed route failure behavior in `apps/web/tests/schematic-scene.test.ts` and `apps/web/tests/sandbox-discovery.test.ts`.

**Checkpoint**: Flexible connections are visual evidence of a checked path, not
unvalidated decorative lines.

---

## Phase 6: User Story 4 - Trust the assembly sequence (Priority: P2)

**Goal**: Check construction prerequisites without turning the Workshop into a
progression gate.

**Independent Test**: An ordered fixture sequence passes; the same graph with
a child-before-parent operation returns a typed validation failure.

- [X] T014 [US4] Carry the canonical sequence into the fixture graph and surface typed sequence validation in `apps/web/src/schematic-scene.ts` and `apps/web/tests/schematic-scene.test.ts`.

**Checkpoint**: Sequence validation informs the schematic without restricting
direct access to any Workshop step.

---

## Phase 7: Polish and verification

- [X] T015 Update plan evidence and runnable verification instructions in `specs/008-voxel-schematic-layout/quickstart.md`.
- [X] T016 Run focused schemas, solver, and web tests/typechecks plus sandbox build and 30-part layout timing; record results in `specs/008-voxel-schematic-layout/quickstart.md`.

## Dependencies and execution order

- T001-T003 establish typed inputs and fixture facts.
- T004-T006 depend on the shared contracts and block all UI use of the new
  layout result.
- US1 T007-T009 can begin after T006.
- US2 T010 can proceed after T001; T011 relies on the solver adapter from T007.
- US3 T012-T013 relies on a ready layout from T005 and the view adapter from T007.
- US4 T014 relies on the canonical validation in T005.
- T015-T016 follow all implementation tasks.

## Parallel opportunities

- T002 and T003 can proceed after T001's contract shape is defined.
- T004 can be authored while T001-T003 are under review.
- T007 and T008 affect different files after T006, but T009 integrates them.
- T010 is independent of the renderer and can proceed after shared schemas.

## Implementation strategy

1. Deliver and validate strict physical-fact contracts and the deterministic
   grid engine before touching the visible scene.
2. Replace the presentation grid with layout-derived primitives, then verify the
   default view is physically faithful.
3. Add quarantine and flexible-route visualization without introducing a new
   Workshop lock or runtime external call.
4. Run all targeted verification commands and record evidence before marking
   final tasks complete.
