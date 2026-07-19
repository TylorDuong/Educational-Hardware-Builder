# Tasks: Agentic Build Discovery

**Input**: Design documents in `specs/006-agentic-build-discovery/`  
**Owner**: One developer on `codex/authored-build`.  
**Tests**: Constitutional fixture, contract, local-model smoke, migration,
solver, and GPU-free verification are mandatory. Browser, Docker/n8n, and PR
tasks require explicit developer confirmation.

## Phase 1: Policy and shared foundation

**Purpose**: Establish the source, safety, persistence, and schema boundaries
before learner-facing discovery.

- [x] T001 Create an approved source-policy fixture with allowlisted documentation/vendor sources, refresh limits, and terms/license rules in `ingestion/source-policy.yml`.
- [ ] T002 Add strict discovery, safety, source-policy, ingestion, catalog-offer, proposal, guided-lesson, and operation/SSE schemas to `packages/schemas/src/index.ts`.
- [ ] T003 Add contract fixtures/tests for malformed requests, citations, licenses, stale offers, raw-coordinate rejection, and forbidden hazards in `packages/schemas/tests/agentic-build-discovery.test.ts`.
- [ ] T004 Add source, ingestion-run, catalog-offer, compatibility, discovery, and generated-build migration tables/indexes in `infra/postgres/init/0002-agentic-build-discovery.sql`.
- [ ] T005 Add migration/catalog SQL tests with idempotency, freshness, licensing, and inventory-match coverage in `apps/web/tests/agentic-build-discovery.persistence.test.ts`.
- [ ] T006 Add application-owned authenticated `POST /api/ingest/v2/upsert` validation, transactional upsert, audit, and typed failure handling in `apps/web/src/ingest.ts` and `apps/web/src/server.ts`.
- [ ] T007 Add ingest API tests for policy denial, idempotency, last-known-good retention, and no partial writes in `apps/web/tests/ingest.test.ts`.

**Checkpoint**: Only the application can write source/catalog data; unlicensed,
uncited, stale, or unsafe records cannot enter approved discovery results.

---

## Phase 2: Background ingestion foundation

**Purpose**: Refresh approved sources without permitting runtime external calls.

- [ ] T008 Add the n8n background service with API-only credentials and no domain-table database access in `infra/docker-compose.yml`.
- [ ] T009 Add allowlisted documentation/vendor workflow definitions with bounded retry/backoff and source-policy input in `ingestion/workflows/`.
- [ ] T010 Add deterministic ingestion payload fixtures and an n8n-to-upsert smoke harness in `ingestion/fixtures/` and `scripts/ingestion-smoke.mjs`.

**Checkpoint**: A scheduled workflow can refresh only allowlisted data through the
versioned API; the learner request path has no external HTTP dependency.

---

## Phase 3: User Story 1 - Discover a feasible build (Priority: P1) MVP

**Goal**: A learner's free-form request becomes a safe, cited, local discovery
proposal or a hard block.

**Independent Test**: In `DEMO_SAFE_MODE=true`, submit a safe and a forbidden
request; verify the safe request yields a typed cited proposal and the
forbidden request blocks before parts or instructions.

- [ ] T011 [US1] Add recorded local-model and deterministic-fallback tests for intent extraction, one retry, and safety blocks in `apps/web/tests/discovery-agents.test.ts`.
- [ ] T012 [US1] Implement typed intent extraction, server-owned safety preflight, local retrieval, and proposal validation in `apps/web/src/discovery.ts` and `apps/web/src/agents.ts`.
- [ ] T013 [US1] Add `POST /api/discovery`, discovery status, and typed discovery SSE endpoints in `apps/web/src/server.ts`.
- [ ] T014 [US1] Add discovery API integration tests for safe, vague, blocked, malformed-model, and fallback responses in `apps/web/tests/discovery.test.ts`.
- [ ] T015 [US1] Add Dashboard free-form discovery input and typed progress/error states without adding a sixth tab in `apps/web/src/sandbox.tsx`.
- [ ] T016 [US1] Render the interpreted request, safety outcome, and cited proposal summary in existing Dashboard/Research areas in `apps/web/src/sandbox.tsx`.

**Checkpoint**: A fixture-backed learner can obtain a safe, cited proposal from
free-form input without a live internet, database, or model dependency.

---

## Phase 4: User Story 2 - Compare attributable sourcing choices (Priority: P1)

**Goal**: A learner can inspect inventory matches, alternatives, cached shop
links, licensing, and freshness before selecting a build.

**Independent Test**: A proposal with verified inventory, alternatives, stale
offers, and missing-license records renders only valid choices and labels stale
data.

- [ ] T017 [US2] Add catalog repository queries for verified inventory matching, compatible alternatives, and freshness filtering in `apps/web/src/catalog.ts`.
- [ ] T018 [US2] Add offer/compatibility API and ranking tests in `apps/web/tests/catalog.test.ts` and `apps/web/tests/discovery.test.ts`.
- [ ] T019 [US2] Extend proposal generation to return validated BOM entries, alternatives, cached offers, source links, and freshness state in `apps/web/src/discovery.ts`.
- [ ] T020 [US2] Render parts, inventory gaps, alternatives, shop links, source provenance, and stale labels in existing Inventory/Research panels in `apps/web/src/sandbox.tsx`.

**Checkpoint**: Every displayed choice is attributable, locally cached, and
honest about freshness; checkout and live shop calls remain absent.

---

## Phase 5: User Story 3 - Follow a validated guided build (Priority: P1)

**Goal**: A selected safe proposal becomes a cited, server-gated beginner
lesson with symbolic deterministic assembly support.

**Independent Test**: A selected proposal cannot bypass either checkpoint; a
wrong answer produces cited re-explanation; symbolic selections alone reach the
solver.

- [ ] T021 [US3] Add guided-lesson and proposal-promotion contract tests for citations, safety-first order, checkpoints, and coordinate leaks in `apps/web/tests/generated-build.test.ts`.
- [ ] T022 [US3] Implement typed guided lesson generation, citation-subset validation, and deterministic fixture fallback in `apps/web/src/discovery.ts`.
- [ ] T023 [US3] Make Workshop sessions, locked-step checks, explanations, and checkpoint grading build-scoped in `apps/web/src/workshop.ts` and `apps/web/src/server.ts`.
- [ ] T024 [US3] Add build-scoped Workshop tests for denial, wrong answer, correct unlock, and weather-station regression in `apps/web/tests/workshop-discovery.test.ts`.
- [ ] T025 [US3] Extend deterministic solver integration for selected symbolic proposal parts and typed rejection/retry messaging in `apps/web/src/spatial-integration.ts` and `apps/web/tests/spatial-integration.test.ts`.
- [ ] T026 [US3] Render the selected lesson's citations, safety callouts, checkpoints, troubleshooting, and solver result in `apps/web/src/sandbox.tsx`.

**Checkpoint**: A learner can safely advance through a selected proposal while
the server owns gates and the solver owns transforms.

---

## Phase 6: User Story 4 - Run a dependable local demonstration (Priority: P2)

**Goal**: The full discovery-to-lesson path is useful without live services and
has an observable local-stack ingestion path when services are enabled.

**Independent Test**: Safe mode completes discovery, sourcing, and a gated
lesson from fixtures; local Compose can perform one allowlisted ingestion
without n8n direct database access.

- [ ] T027 [US4] Add deterministic safe-mode discovery/catalog/lesson fixtures and regression scenarios in `apps/web/src/demo-flow.ts` and `apps/web/tests/demo-flow.test.ts`.
- [ ] T028 [US4] Add safe-mode end-to-end discovery, blocked hazard, offer freshness, and Workshop tests in `apps/web/tests/integration.test.ts`.
- [ ] T029 [US4] Add quickstart smoke coverage for discovery routes, SSE assets, and five-tab rendering in `apps/web/tests/quickstart.test.ts` or `scripts/quickstart-smoke.mjs`.
- [ ] T030 [US4] Update `README.md`, `docs/roadmap.md`, and `specs/006-agentic-build-discovery/quickstart.md` with fixture, local-stack, source-policy, reset, and human-verification instructions.

---

## Phase 7: Verification and handoff

- [ ] T031 Run schemas, solver, and SCAD tests/typechecks; record results and required negative-path coverage in `specs/006-agentic-build-discovery/quickstart.md`.
- [ ] T032 Run web tests, web typecheck, sandbox build, and `git diff --check`; record results in `specs/006-agentic-build-discovery/quickstart.md`.
- [ ] T033 Run the source-policy/n8n local-stack smoke and record explicit developer confirmation that n8n used only the upsert API in `specs/006-agentic-build-discovery/quickstart.md`.
- [ ] T034 Run a local-Ollama discovery smoke through the Make target and record first-token/retrieval/clean-start measurements in `specs/006-agentic-build-discovery/quickstart.md`.
- [ ] T035 Run `pnpm quickstart` with `DEMO_SAFE_MODE=true`, complete a safe discovery and blocked-hazard browser flow, and record explicit human confirmation in `specs/006-agentic-build-discovery/quickstart.md`.
- [ ] T036 Prepare a focused pull request from `codex/authored-build` to `main`, noting that `specs/005-authored-build` is superseded history and `.sprint/status.yml` remains unedited.

## Dependencies and execution order

- T001-T007 establish the app-owned data/safety contract.
- T008-T010 add background refresh only after T006/T007 pass.
- US1 (T011-T016) is the discovery MVP and precedes sourcing/lesson selection.
- US2 (T017-T020) enriches the MVP with cached choices.
- US3 (T021-T026) promotes a safe proposal to a gated Workshop lesson.
- US4 (T027-T030) proves reliable fixture/local-stack operation.
- T031-T036 run only after all intended user stories are complete.

## Single-developer strategy

Work sequentially. Validate the safety/data boundary first, then demonstrate
free-form discovery in fixture mode before enabling ingestion, sourcing, or
generated lessons. Required tests are focused at each governed boundary; the
final browser, Docker/n8n, local-model, and PR checks require developer evidence.
