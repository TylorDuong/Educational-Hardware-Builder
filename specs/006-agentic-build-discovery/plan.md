# Implementation Plan: Agentic Build Discovery

**Branch**: `codex/authored-build` | **Date**: 2026-07-19 | **Spec**: [spec.md](spec.md)

## Summary

Turn an open-ended learner request into a safe, cited, locally served build
proposal. The app accepts arbitrary input but returns only schema-validated
intent, source-backed parts/offer alternatives, and a checkpoint-gated lesson.
Approved n8n jobs refresh allowlisted documentation and vendor catalog data via
an application-owned upsert API; the learner-facing request path never calls
the public internet or shop APIs.

## Technical Context

**Language/Version**: TypeScript (strict ESM) on Node 22 LTS; Python only for
existing ingestion helpers and OpenSCAD service.

**Primary Dependencies**: Existing Zod, node HTTP server, pg, local Ollama,
pgvector, Vite/React workshop, Docker Compose; add a Compose-managed n8n
background caller and its versioned workflow definitions.

**Storage**: PostgreSQL with pgvector only. Add migration-managed source,
ingestion-run, offer, compatibility, discovery, and generated-build records.

**Testing**: Vitest for shared schemas/solver/SCAD; node:test for web; recorded
fixture contract tests for LLM paths; Make-runnable live local-model smoke;
Docker/n8n and browser checks require explicit human evidence.

**Target Platform**: Local Docker Compose, CPU embeddings, local Ollama, and
the existing browser Workshop.

**Project Type**: Monorepo web service plus web client, schemas, deterministic
solver, SCAD service, and background ingestion workflow.

**Performance Goals**: Retrieval under 200 ms against 100,000 embeddings;
first local-model token under 3 seconds on the reference machine; 60 fps for
assemblies of up to 30 parts; fixture discovery response under 3 seconds.

**Constraints**: Learner requests use no external network calls; n8n is the
only permitted external-source caller and may write only through authenticated
application upserts. All agent outputs are JSON/Zod validated, retried once,
then fall back safely. Five tabs, solver-owned transforms, cited lessons,
server gates, and `DEMO_SAFE_MODE` remain mandatory.

**Scale/Scope**: One learner-facing discovery flow, a small allowlisted source
catalog for v1, cached shop-link handoffs only, and no checkout/auth/payment.

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- [x] Lessons/parts retain citations; symbolic mates are the only model-facing
      spatial data; solver and validated templates own physical output.
- [x] Intent, proposal, lesson, ingestion, API, and SSE boundaries have shared
      Zod schemas, JSON mode, one retry, fallback, and low-temperature output.
- [x] Local Compose/Ollama/CPU embeddings remain the learner request path;
      only n8n background jobs access allowlisted external sources.
- [x] Safety preflight hard-blocks flagged hazards and lessons show safety
      before instructions.
- [x] PostgreSQL/pgvector remains sole datastore; n8n uses an authenticated,
      versioned application upsert rather than database credentials.
- [x] Fixture, deterministic, agent-contract, live-smoke, migration, solver,
      and GPU-free checks are represented in the task queue.
- [x] The five tabs, one mode flag, server-side checkpoints, and typed SSE are
      preserved.
- [x] Retrieval, first-token, clean-start, and applicable 3D targets are
      measured in final verification.
- [x] CAD/part ingestion rejects absent source URLs or identifiable licenses.

## Project Structure

### Documentation

```text
specs/006-agentic-build-discovery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── discovery-api.md
│   └── ingestion-api.md
└── tasks.md
```

### Source Code

```text
apps/web/
├── src/agents.ts                 # existing typed model boundary, extended
├── src/discovery.ts              # intent, proposal, lesson orchestration
├── src/ingest.ts                 # authenticated versioned upsert service
├── src/catalog.ts                # cached offers and compatibility lookup
├── src/server.ts                 # discovery/ingestion HTTP and SSE routes
├── src/workshop.ts               # build-scoped server gating
├── src/sandbox.tsx               # five-tab discovery UX
└── tests/                        # node:test contract/integration/fixture tests
packages/schemas/
├── src/index.ts                  # shared strict contracts
└── tests/                        # Vitest contract fixtures
infra/
├── docker-compose.yml            # n8n background service with API-only access
└── postgres/init/0002-agentic-build-discovery.sql
ingestion/
├── workflows/                    # allowlisted n8n definitions
└── fixtures/                     # deterministic source/catalog input
```

**Structure Decision**: Extend the existing monorepo boundaries. The web app is
the only application writer; ingestion workflows are external clients of its
typed API. Shared schemas define every cross-process payload.

## Delivery Phases

1. Build source-policy, persistence, and shared contract foundations.
2. Deliver safe free-form request to cited local discovery proposal (MVP).
3. Add background ingestion and freshness-aware shop-link offers.
4. Generate/promote safe lessons with server checkpoints and solver traces.
5. Complete fixture, local-stack, performance, and human browser verification.

## Complexity Tracking

| Added capability | Why needed | Simpler alternative rejected because |
| --- | --- | --- |
| Background n8n workflow | It is the constitution-approved external data path. | Runtime web calls violate local-first requirements. |
| Cached catalog offers | Learners need attributable sourcing choices. | Static links cannot show freshness, alternatives, or source state. |
| Discovery operation records | Long-running typed progress and safe resumability need auditable state. | Anonymous transient responses cannot support gates, errors, or proposal promotion. |
