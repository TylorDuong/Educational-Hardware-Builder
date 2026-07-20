# Implementation Plan: Deterministic 3D Schematic Layout

**Branch**: `008-voxel-schematic-layout` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-voxel-schematic-layout/spec.md`

## Summary

Replace the current presentation-only fixture grid with a deterministic,
inspectable 3D schematic scene. Structured agents may extract entities and
symbolic relationships, but a local integer-grid solver owns all placement,
collision checks, parent-world composition, flexible-route calculation, and
canonical assembly-sequence validation.
Low-confidence dimensional records enter a typed review state rather than
producing a guess. The first vertical slice consumes fixture/CAD metadata and
renders truthful bounding-box proxies while validated browser-ready CAD meshes
remain a separate ingestion milestone.

## Technical Context

**Language/Version**: TypeScript (strict ESM) on Node 22 LTS

**Primary Dependencies**: Existing Zod contracts, React Three Fiber/Drei,
Vite, and the workspace solver package. The sparse occupancy grid and bounded
A* implementation use standard TypeScript data structures; no new runtime
package is needed.

**Storage**: Existing PostgreSQL/pgvector remains the only datastore. This
increment uses source-backed fixture CAD records and adds no persistence or
runtime network call.

**Testing**: Vitest for schemas and solver; node:test for web integration and
source-level Workshop regression coverage. All tests run without Docker, GPU,
or a live Ollama model.

**Target Platform**: Existing local Docker Compose deployment and Vite/React
Workshop on integrated graphics.

**Project Type**: pnpm TypeScript monorepo with shared schemas, deterministic
solver, and browser Workshop.

**Performance Goals**: Layout of a 30-part bounded fixture completes in under
one second; the 3D view retains the constitutional 60-fps target for up to 30
parts.

**Constraints**: A one-millimetre integer grid is used for MVP axis-aligned
bounding boxes and six-direction routes. Agent schemas contain no coordinate,
matrix, transform, or arbitrary geometry fields. Physical dimensional evidence
must be at least 0.85 confidence and cited. Runtime research stays local-first:
future evidence refresh occurs through approved ingestion, not browser/server
vendor calls.

**Scale/Scope**: A fixture-backed vertical slice for container/base/component/
flexible roles, sparse collision detection, routing, review results, and truthful
primitive rendering. Voxelized mesh collision, rotations, container cavities,
actual browser-delivered CAD meshes, and persistent human review are planned
follow-on work.

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
specs/008-voxel-schematic-layout/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/schematic-layout.md
└── tasks.md
```

### Source Code

```text
packages/schemas/
├── src/index.ts                         # graph, evidence, layout contracts
├── fixtures/weather-station-parts.ts    # source-backed fixture bounds
└── tests/                               # schema and fixture contract tests
packages/solver/
├── src/index.ts                         # existing mating solver exports
├── src/schematic-layout.ts              # sparse grid, packing, routing
└── tests/schematic-layout.test.ts       # deterministic solver coverage
apps/web/
├── src/schematic-agents.ts              # structured Extractor/Architect boundary
├── src/schematic-scene.ts                # fixture graph and solver-to-view adapter
├── src/components/MechView.tsx          # world-accurate primitive scene
└── tests/                                # agent, integration, and render contracts
```

**Structure Decision**: Extend the existing shared-contract, solver, and web
packages. A separate Python/NumPy service is deliberately deferred: it would
create a new Docker/IPC boundary without improving the fixture-sized sparse-grid
algorithm, whereas TypeScript keeps all spatial output typed and local.

## Complexity Tracking

No constitutional exceptions are required. The MVP does not claim mesh-level
clearance or verified vendor geometry; it explicitly renders source-backed
bounding-box proxies until asset ingestion supplies validated meshes.

## Implementation evidence

Implemented on 2026-07-20:

- The solver runtime-parses its strict request contract, quarantines weak or
  missing cited dimensions, and rejects coordinate-bearing input before
  placement.
- The sparse one-millimetre solver owns parent-world placement, collision and
  containment checks, canonical sequence validation, and six-direction A*
  routes whose endpoints also remain outside rigid proxy interiors.
- The Workshop now renders source-backed bounding-box proxies from the solved
  world layout. The renderer maps the solver's Z-up width/depth/height data to
  Three.js Y-up coordinates for boxes, routes, camera targets, and explode
  vectors.
- The structured Extractor and Architect boundaries accept only strict,
  symbolic JSON, retry one invalid response, and use deterministic fallbacks.

The exact automated and browser verification record is maintained in
[quickstart.md](quickstart.md).
