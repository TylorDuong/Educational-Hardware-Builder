# Tasks: Open Workshop

**Input**: Design documents from `/specs/007-open-workshop/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/open-workshop-api.md  
**Tests**: Schema and web fixture tests are required. Existing solver, local
model, ingestion, GPU-free CI, and performance coverage remains required where
the affected path applies.

## Phase 1: Shared contract foundation

**Purpose**: Replace the safety/checkpoint contract with request classification
and cited skill-library entries.

- [ ] T001 Update request-classification, discovery-operation, guided-lesson, public-lesson, and skill-library Zod schemas in `packages/schemas/src/index.ts`.
- [ ] T002 [P] Add schema fixtures for relevant approval, off-topic rejection, malicious rejection, cited skill links, and checkpoint-free lessons in `packages/schemas/tests/agentic-build-discovery.test.ts`.
- [ ] T003 [P] Update schema mocks and the weather-station fixture to remove checkpoint answers and add cited skills in `packages/schemas/src/mocks.ts` and `apps/web/fixtures/weather-station.ts`.

**Checkpoint**: Shared payloads admit open relevant discovery and directly
navigable, skill-linked lessons only.

---

## Phase 2: Foundational server migration

**Purpose**: Remove old safety and gated Workshop behavior before user stories.

- [ ] T004 Replace hazard preflight with typed relevance/malicious request classification and deterministic fallback in `apps/web/src/agents.ts` and `apps/web/src/discovery.ts`.
- [ ] T005 Remove checkpoint grading and locked-step checks while retaining selected-build identity and typed step lookup in `apps/web/src/workshop.ts` and `apps/web/src/server.ts`.
- [ ] T006 [P] Add deterministic skills-library fixture entries for relevant technical prompts in `apps/web/src/demo-flow.ts`.
- [ ] T007 Add focused server tests proving the removed checkpoint route is unavailable and direct selected-build step access remains typed in `apps/web/tests/workshop-discovery.test.ts` and `apps/web/tests/server.test.ts`.

**Checkpoint**: The server has no hazard-based denial path or quiz/lock API,
while solver and selected-build boundaries remain intact.

---

## Phase 3: User Story 1 - Explore any relevant technical build (Priority: P1)

**Goal**: Relevant technical prompts produce cited proposals; off-topic and
malicious prompts reject before discovery work.

**Independent Test**: In fixture mode, mains and LiPo prompts complete with a
proposal while off-topic and malicious prompts return typed rejections without
proposal data.

- [ ] T008 [P] [US1] Add agent classification fixtures and retry/fallback coverage in `apps/web/tests/discovery-agents.test.ts`.
- [ ] T009 [P] [US1] Add discovery API tests for technical approval and pre-retrieval relevance/malicious rejection in `apps/web/tests/discovery.test.ts`.
- [ ] T010 [US1] Update discovery operation progress, status handling, and proposal promotion eligibility in `apps/web/src/server.ts`.
- [ ] T011 [US1] Update Dashboard request status and rejection rendering in `apps/web/src/sandbox.tsx`.

**Checkpoint**: A learner can discover any relevant technical build without a
hazard or mode block, and irrelevant/malicious content is cleanly rejected.

---

## Phase 4: User Story 2 - Follow a self-directed workshop (Priority: P1)

**Goal**: Every selected Workshop step is immediately available without a
question, answer, grading result, or progression lock.

**Independent Test**: Select a fixture proposal and open first, middle, and
last steps in arbitrary order through the UI and server without submitting an
answer.

- [ ] T012 [P] [US2] Add direct-navigation and no-checkpoint regression coverage in `apps/web/tests/workshop-discovery.test.ts` and `apps/web/tests/integration.test.ts`.
- [ ] T013 [US2] Simplify Workshop session and selected-lesson promotion payloads in `apps/web/src/workshop.ts` and `apps/web/src/server.ts`.
- [ ] T014 [US2] Remove checkpoint UI, answer handlers, and gated messaging while keeping completion and solver views in `apps/web/src/sandbox.tsx`.

**Checkpoint**: Every Workshop step can be read in any order and the solver
remains the exclusive transform source.

---

## Phase 5: User Story 3 - Learn required skills on demand (Priority: P2)

**Goal**: Each Workshop step exposes cited, relevant skill-library support.

**Independent Test**: Inspect every fixture lesson step and verify cited skill
links or an explicit no-additional-skills statement.

- [ ] T015 [P] [US3] Add guided-lesson and public-lesson skill-link validation tests in `apps/web/tests/generated-build.test.ts`.
- [ ] T016 [US3] Populate deterministic skill-library entries during lesson generation in `apps/web/src/discovery.ts` and `apps/web/src/demo-flow.ts`.
- [ ] T017 [US3] Render skill titles, relevance, and source links at every Workshop step in `apps/web/src/sandbox.tsx`.

**Checkpoint**: Learners receive self-directed, cited skill support without a
quiz or external runtime lookup.

---

## Phase 6: Polish and verification

- [x] T018 [P] Update fixture quickstart, README, roadmap, and Open Workshop operator guidance in `specs/007-open-workshop/quickstart.md`, `README.md`, and `docs/roadmap.md`.
- [x] T019 Run schema tests/typecheck and focused web tests/typecheck/build; record command output in `specs/007-open-workshop/quickstart.md`.
- [ ] T020 Run `pnpm quickstart` with `DEMO_SAFE_MODE=true`; record developer browser confirmation of a relevant mains or LiPo proposal, off-topic/malicious rejection, arbitrary Workshop navigation, and skills links in `specs/007-open-workshop/quickstart.md`.

## Dependencies and execution order

- T001-T003 establish the shared contract and fixture prerequisites.
- T004-T007 migrate server behavior before learner-facing changes.
- US1 (T008-T011) delivers open discovery and precedes proposal selection.
- US2 (T012-T014) and US3 (T015-T017) depend on the shared contract and can
  proceed after US1's promotion path is stable.
- T018-T020 follow the intended user stories.

## Parallel opportunities

- T002 and T003 may run after T001's expected contract is defined.
- T006 and T007 can run while the discovery classification implementation is
  being completed.
- T008 and T009 may run in parallel; T012 and T015 may run in parallel after
  the shared contract is settled.

## Implementation strategy

1. Complete Phases 1 and 2 to remove the old contract end to end.
2. Deliver and validate US1 as the open-discovery MVP.
3. Deliver free Workshop navigation, then cited skill links.
4. Complete the automated and browser verification phases before handoff.
