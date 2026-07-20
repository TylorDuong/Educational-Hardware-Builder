# Implementation Plan: Open Workshop

**Branch**: `codex/authored-build` | **Date**: 2026-07-19 | **Spec**: [spec.md](spec.md)

## Summary

Replace the hazard-gated, quiz-driven discovery experience with open technical
discovery and a self-directed Workshop. Relevant good-faith requests return
typed, cited proposals; only off-topic and malicious prompts are rejected.
Lessons retain citations and solver-owned transforms while replacing checkpoints
with direct step navigation and cited skill-library links.

## Technical Context

**Language/Version**: TypeScript (strict ESM) on Node 22 LTS

**Primary Dependencies**: Existing Zod, node HTTP server, local Ollama,
PostgreSQL/pgvector, Vite/React Workshop, and Docker Compose

**Storage**: PostgreSQL with pgvector only; the initial skills library is a
cited fixture/lesson contract and does not add a datastore

**Testing**: Vitest for schemas/solver/SCAD and node:test for web fixture,
contract, integration, and Workshop tests

**Target Platform**: Local Docker Compose and the existing browser Workshop

**Project Type**: pnpm TypeScript monorepo with web service and web client

**Performance Goals**: Fixture discovery under three seconds; retrieval under
200 ms at 100,000 embeddings; first local-model token under three seconds; 60
fps for assemblies of up to 30 parts

**Constraints**: Learner requests remain local-first; n8n alone may contact
allowlisted external sources in the background. All model boundaries remain
JSON/Zod validated, retried once, and deterministically fall back. Workshop
steps cannot be locked or require learner answers.

**Scale/Scope**: One open discovery flow, the existing five-tab Workshop, a
fixture-backed initial skills library, and no checkout, authentication, or
runtime vendor calls

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- [x] Physical outputs use deterministic CAD-metadata solvers and parameterized,
      headless-OpenSCAD-validated templates; lesson claims retain cited sources.
- [x] Every LLM boundary has shared JSON/Zod schemas, JSON mode, one validation-error
      retry, deterministic/user-facing fallback, and temperature <= 0.3 for structure.
- [x] Deployment is local Docker Compose, inference is local Ollama within detected VRAM,
      embeddings are CPU-based, and no prohibited runtime external calls are introduced.
- [x] Request handling accepts relevant technical work and rejects only off-topic or
      malicious requests before discovery; it does not impose hazard- or mode-based blocks.
- [x] PostgreSQL with pgvector remains the sole datastore; n8n uses versioned upsert APIs;
      API and SSE payloads use one shared Zod schema package.
- [x] Required CAD fixtures, deterministic unit tests, LLM contract/live-smoke tests,
      OpenSCAD negative tests, and GPU-free CI coverage are planned.
- [x] UX preserves the five fixed tabs, freely navigable Workshop steps with explanatory
      skill-library links, and SSE progress for work over two seconds.
- [x] The plan measures applicable 3D, first-token, retrieval, and clean-start targets.
- [x] CAD ingestion records source URL and license and rejects unidentified licenses.

## Project Structure

### Documentation

```text
specs/007-open-workshop/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/open-workshop-api.md
└── tasks.md
```

### Source Code

```text
apps/web/
├── src/agents.ts             # structured request classification
├── src/discovery.ts          # discovery and guided lesson generation
├── src/workshop.ts           # direct Workshop step access
├── src/server.ts             # typed discovery and Workshop HTTP routes
├── src/sandbox.tsx           # five-tab learner experience
├── src/demo-flow.ts          # deterministic open-workshop fixture data
└── tests/                    # node:test contract and integration coverage
packages/schemas/
├── src/index.ts              # shared request, lesson, and skills schemas
└── tests/                    # Vitest schema fixtures
```

**Structure Decision**: Extend the existing web and schema packages. The
application remains the typed boundary; the Workshop client consumes validated
lesson and skills-link payloads only.

## Delivery Phases

1. Replace safety decisions and checkpoint schema state with typed request
   classification and cited skill-link contracts.
2. Deliver open relevant discovery and typed relevance/malicious rejections.
3. Remove Workshop answer/grading/locking behavior end to end.
4. Render skills links and direct step navigation in the five-tab UI.
5. Update fixtures, documentation, automated tests, and browser verification.

## Complexity Tracking

No constitutional exceptions are required after the v2.0.0 amendment.
