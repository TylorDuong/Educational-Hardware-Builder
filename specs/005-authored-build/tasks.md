# Tasks: Second Authored Beginner Build (Single Developer)

**Input**: `specs/005-authored-build/spec.md`, `specs/005-authored-build/plan.md`, and the repository constitution.  
**Owner**: One developer on `codex/authored-build`.  
**Source of truth**: This file is the active task queue for `$sprint-run`. The completed A/B/C queue in `.sprint/status.yml` is historical and must not be changed.

**Tests**: Write or update focused tests with each governed behavior. The full verification set must run without Docker, a GPU, or live Ollama.

## Phase 1: Build brief and setup

**Purpose**: Choose one supportable beginner project before code or instructional content is authored.

- [ ] T001 Create `specs/005-authored-build/build-brief.md` with the chosen low-voltage beginner project, learner outcome, approved parts, per-step hazards, at least two primary cited sources, required CAD/source licenses, and explicit exclusions.
- [ ] T002 Validate the T001 brief against `specs/005-authored-build/spec.md` and record the selected build slug, stable UUIDs, and acceptance evidence in `specs/005-authored-build/build-brief.md`.
- [ ] T003 Verify `.sprint/authored-build.cursor` points to `T001` after the runner initializes it and retain `.sprint/status.yml` unchanged as historical evidence.

---

## Phase 2: Foundational build registry

**Purpose**: Establish a typed selection boundary shared by fixtures, the server, and the Workshop.

- [ ] T004 Add shared authored-build manifest, build identifier, and build-selection schemas in `packages/schemas/src/index.ts` without weakening existing `StepPlanSchema` validation.
- [ ] T005 Add registry contract tests for valid manifests, duplicate/unknown build identifiers, citations, safety metadata, and coordinate-leak rejection in `packages/schemas/tests/authored-build.test.ts`.
- [ ] T006 Create a typed authored-build registry and migrate the existing weather-station fixture into `apps/web/fixtures/index.ts` while retaining `apps/web/fixtures/weather-station.ts` as its authored source.
- [ ] T007 Add fixture-registry tests in `apps/web/tests/authored-builds.test.ts` proving that the weather station still resolves through the registry.

**Checkpoint**: Build selection has one typed source of truth; no second build content is accepted until this phase passes.

---

## Phase 3: User Story 1 - Select the new authored build (Priority: P1)

**Goal**: A learner can choose either valid authored build and the API/server reject an unknown choice.

**Independent test**: A build-specific plan endpoint returns the selected manifest and reports a typed client-safe error for an unknown identifier.

- [ ] T008 [US1] Add server contract tests for valid and invalid build selection in `apps/web/tests/server.test.ts`.
- [ ] T009 [US1] Add typed build selection and build-scoped plan access in `apps/web/src/server.ts` and `apps/web/src/workshop.ts`.
- [ ] T010 [US1] Add a build selector to the existing Dashboard in `apps/web/src/sandbox.tsx` without adding a sixth navigation tab.
- [ ] T011 [US1] Update the fixture-safe pipeline and build-plan rendering in `apps/web/src/sandbox.tsx` to use the selected manifest rather than weather-station constants.

---

## Phase 4: User Story 2 - Complete the authored path safely (Priority: P1)

**Goal**: The new build provides an ordered, cited, checkpoint-gated beginner path.

**Independent test**: A fresh build-scoped session cannot skip a checkpoint; a wrong answer gets re-explanation; the correct answer unlocks the next required step.

- [ ] T012 [US2] Add the new build's cited authored steps, safety categories, at least two checkpoints, and symbolic mating selections in `apps/web/fixtures/<selected-build>.ts` using only T001-approved content.
- [ ] T013 [US2] Add the new build to the typed registry in `apps/web/fixtures/index.ts` and verify every step with the shared schemas.
- [ ] T014 [US2] Add build-scoped workshop session and checkpoint tests in `apps/web/tests/weather-station.fixture.test.ts` or a new `apps/web/tests/<selected-build>.fixture.test.ts`.
- [ ] T015 [US2] Update `apps/web/src/workshop.ts` so sessions, locked-step checks, and explanations are scoped to the selected build without regressing weather-station behavior.
- [ ] T016 [US2] Render build-scoped research citations, parts, lessons, checkpoint prompts, and completion copy in `apps/web/src/sandbox.tsx`.

---

## Phase 5: User Story 3 - Inspect a validated assembly (Priority: P2)

**Goal**: The new build's spatial state is assembled only through deterministic solver traces and typed validation errors.

**Independent test**: New symbolic selections produce solver-owned transforms; invalid selections and invalid template input are readable typed failures with no model-facing transforms.

- [ ] T017 [US3] Add approved part, CAD asset, source URL, and license records for the selected build in `ingestion/demo_seed.sql` and the matching fixture metadata files under `apps/web/fixtures/`.
- [ ] T018 [US3] Add build-scoped symbolic mate fixtures and solver trace tests in `packages/solver/tests/solver.test.ts` and `apps/web/tests/spatial-integration.test.ts`.
- [ ] T019 [US3] Extend `apps/web/src/spatial-integration.ts` and `apps/web/src/sandbox.tsx` to render selected-build solver traces and preserve typed rejection/retry messaging.
- [ ] T020 [US3] If T001 requires a custom template, add bounded parameters in `packages/scad-service/src/index.ts` and compile, zero-volume, and out-of-bounds tests in `packages/scad-service/tests/l-bracket.test.ts`; otherwise record `not required` with the brief rationale in `specs/005-authored-build/build-brief.md`.

---

## Phase 6: User Story 4 - Run a dependable local demo (Priority: P3)

**Goal**: Both authored builds work in the fixture-backed quickstart path and retain explicit live-service behavior.

**Independent test**: With `DEMO_SAFE_MODE=true`, both manifests load and complete without Docker, GPU, or Ollama access.

- [ ] T021 [US4] Add fixture-mode regression coverage for both selected builds and the default weather-station flow in `apps/web/tests/demo-flow.test.ts` and `apps/web/tests/integration.test.ts`.
- [ ] T022 [US4] Add a quickstart smoke check for the built root page and build-selection assets in `apps/web/tests/quickstart.test.ts` or `scripts/quickstart-smoke.mjs`.
- [ ] T023 [US4] Update `README.md`, `docs/roadmap.md`, and `specs/005-authored-build/quickstart.md` with selection, reset, fixture-mode, and live-stack verification instructions.

---

## Phase 7: Verification and handoff

**Purpose**: Prove the complete feature, preserve the default build, and make a single-developer handoff reviewable.

- [ ] T024 Run `pnpm --filter @educational-hardware-builder/schemas test` and `pnpm --filter @educational-hardware-builder/schemas typecheck`; record results in `specs/005-authored-build/quickstart.md`.
- [ ] T025 Run `pnpm --filter @educational-hardware-builder/solver test`, `pnpm --filter @educational-hardware-builder/solver typecheck`, `pnpm --filter @educational-hardware-builder/scad-service test`, and `pnpm --filter @educational-hardware-builder/scad-service typecheck`; record results in `specs/005-authored-build/quickstart.md`.
- [ ] T026 Run `pnpm --filter @educational-hardware-builder/web test`, `pnpm --filter @educational-hardware-builder/web typecheck`, `pnpm --filter @educational-hardware-builder/web build:sandbox`, and `git diff --check`; record results in `specs/005-authored-build/quickstart.md`.
- [ ] T027 Run `pnpm quickstart` with `DEMO_SAFE_MODE=true`, complete both authored paths in the browser, and record explicit human confirmation in `specs/005-authored-build/quickstart.md`.
- [ ] T028 Prepare a focused pull request from `codex/authored-build` to `main` with the build brief, test evidence, and a note that the historical `.sprint/status.yml` was not edited.

## Dependencies and execution order

- T001-T003 establish the approved build and one-developer cursor.
- T004-T007 create the registry and block every user story.
- US1 (T008-T011) precedes US2 because the selected build must reach the server and client first.
- US2 (T012-T016) precedes US3 because spatial traces attach to authored selections.
- US4 (T021-T023) follows the complete fixture path.
- T024-T028 run only after all selected user-story work is complete.

## Single-developer execution strategy

Work sequentially even where files are independent. Finish the registry and selection MVP (T001-T011), verify it, then add the safely authored path (T012-T016), then spatial and reliability work. Do not start a task whose input is unapproved or whose prerequisite checklist item remains unchecked.
