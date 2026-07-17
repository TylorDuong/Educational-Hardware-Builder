# Tasks: Platform and Data Foundation

**Input**: Design documents from `specs/001-platform-data/`

**Pruning for A2**: Defer n8n, scheduled ingestion, a rendered health page, migrations, model-init,
OpenSCAD, retrieval, and live-smoke polish. Implement only the compose skeleton needed to make
PostgreSQL healthy and `ollama list` answer.

## Phase 1: Setup

- [X] T001 Create the A2 compose skeleton in `infra/docker-compose.yml`.
- [X] T002 Add a concise local-start note to `infra/README.md`.

## Phase 2: Foundational

- [X] T003 Configure a persistent pgvector PostgreSQL service with a readiness health check in `infra/docker-compose.yml`.
- [X] T004 Configure a persistent local Ollama service with the internal runtime endpoint in `infra/docker-compose.yml`.

## Phase 3: User Story 1 - Start a Local Foundation (Priority: P1)

**Goal**: Start the two local foundation services reliably.

**Independent Test**: Compose validates; PostgreSQL becomes healthy; `ollama list` returns from the
running container.

- [X] T005 [US1] Validate the Compose graph in `infra/docker-compose.yml` with `docker compose config`.
- [X] T006 [US1] Verify database health and `ollama list` using `specs/001-platform-data/quickstart.md`.

## Deferred Work

Migrations, model-init, ingestion, retrieval, n8n, health UI, and live-smoke polish are explicitly
deferred to A3–A5 and are not implementation tasks in this A2 slice.

## Dependencies and Execution Order

`T001 → T003/T004 → T005 → T006`. T002 can proceed in parallel with T003/T004.

## A2 MVP

Complete T001 through T006 only. The foundation is ready when the two documented service checks
pass; all other work remains explicitly deferred.
