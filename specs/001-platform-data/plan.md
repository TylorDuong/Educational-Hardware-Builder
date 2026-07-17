# Implementation Plan: Platform and Data Foundation

**Branch**: `feature/001-platform-data` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

## Summary

Deliver the local compose foundation first: healthy PostgreSQL with pgvector and a reachable
Ollama runtime. Preserve the shared schema package already merged in G1, then defer migrations,
ingestion, retrieval, model initialization, and the health endpoint to later A tasks.

## Technical Context

**Language/Version**: TypeScript on Node 20; Docker Compose YAML  
**Primary Dependencies**: pnpm workspaces, Zod, PostgreSQL with pgvector, Ollama  
**Storage**: PostgreSQL with pgvector  
**Testing**: Vitest contract tests; Compose configuration validation and service smoke checks  
**Target Platform**: Local Docker Desktop/Engine; NVIDIA GPU passthrough documented for later model use  
**Project Type**: Monorepo web application foundation  
**Performance Goals**: Database health and `ollama list` answer after compose startup  
**Constraints**: Local-first; no cloud inference; no direct background writes; compose skeleton only in A2  
**Scale/Scope**: A2 contains only `postgres` and `ollama` compose services plus their persistent volumes

## Constitution Check

- [x] No model output produces transforms or coordinates; G1 shared contracts keep selections symbolic.
- [x] Shared Zod contracts require structured, cited cross-subsystem payloads.
- [x] The deployment is local Compose and retains local Ollama as the runtime boundary.
- [x] A2 introduces no research or instructional flow that could bypass safety gates.
- [x] PostgreSQL with pgvector remains the sole datastore; ingestion is deferred.
- [x] Contract tests are GPU-free; live Compose smoke checks are separate from CI.
- [x] A2 introduces no client navigation or long-running UI operation.
- [x] A2 defers performance measurement beyond verifying the startup prerequisite.
- [x] A2 introduces no new CAD ingestion path.

## Project Structure

```text
infra/
└── docker-compose.yml       # A2 local Postgres + Ollama skeleton
packages/
└── schemas/                 # G1 shared contracts, mocks, and fixtures
specs/001-platform-data/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── compose-services.md
```

**Structure Decision**: Keep infrastructure under `infra/` and use the existing shared schema
package as the only cross-subsystem contract dependency for this slice.

## Complexity Tracking

No constitution exceptions are required.

## A5 Continuation: Retrieval API and JSON health endpoint

**Scope**: Add a small local HTTP service that validates the shared retrieval contract, embeds the
query with local Ollama, ranks cited `embeddings` rows by pgvector cosine similarity, and exposes a
machine-readable health report. The service is intentionally API-only; the rendered health page and
n8n remain deferred.

**Design decisions**:

- Reuse `RetrievalQuerySchema` and `RetrievalResultSchema` from `packages/schemas`; reject invalid
  requests before database access.
- Serve `POST /api/retrieve` and `GET /api/health` only within the Compose network. The retrieval
  response maps each database citation to the required shared citation shape.
- Query embeddings through the pgvector cosine-distance operator and cap results to the contract
  limit. Inventory filtering is accepted by the contract and applies when a chunk has a matching
  parts-catalog relation; the A4 generic corpus remains unscoped.
- Health reports database reachability, Ollama model names, detected NVIDIA VRAM when available,
  and a conservative recommended model tier without calling cloud services.

**A5 validation**: With a fresh Compose volume, seed the corpus, then curl `POST /api/retrieve` with
`connect BME280 to ESP32`; it returns cited results. Curl `GET /api/health`; it returns JSON and
reports database and model-runtime status. Unit tests mock database/Ollama boundaries so CI needs no GPU.
