# Implementation Plan: Golden-Path Integration — B7 Spatial Seams

**Branch**: `feature/004-integration` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

## Summary

Close only Ani's G2 seams: use the real deterministic solver for symbolic retry and viewer
transforms, and use the real L-bracket compile/validation service behind a typed UI adapter.
No new product capability, raw model coordinates, or raw compiler stderr is introduced.

## Technical Context

**Language/Version**: TypeScript, Node 22

**Primary Dependencies**: React Three Fiber, shared Zod schemas, `@educational-hardware-builder/solver`, `@educational-hardware-builder/scad-service`

**Storage**: N/A — fixture CAD metadata remains the source of truth

**Testing**: node:test for web integration; Vitest for solver and scad-service

**Target Platform**: Local Compose development and browser sandbox

**Project Type**: pnpm TypeScript monorepo

**Performance Goals**: Keep the ten-part sandbox responsive; retain the 60 fps integrated-graphics release target

**Constraints**: Solver-only transforms, no raw coordinates from model output, typed user-safe compile errors, GPU-free tests

**Scale/Scope**: B7 seams 3–5 only; no new feature scope

## Constitution Check

- [X] Physical outputs use deterministic CAD-metadata solvers and parameterized, headless-OpenSCAD-validated templates.
- [X] Every LLM boundary keeps shared JSON/Zod schemas, one validation-error retry, and deterministic fallback.
- [X] Local Compose and Ollama boundaries are preserved; this task adds no runtime external call.
- [X] Existing server-enforced safety gates and cited instructional content are unchanged.
- [X] PostgreSQL remains the sole datastore; this task persists no new state.
- [X] Fixture-backed deterministic tests and existing OpenSCAD negative tests remain GPU-free.
- [X] The fixed-tab UI and checkpoint behavior are unchanged.
- [X] The viewer keeps the 60 fps release target; a sandbox build verifies the integration surface.
- [X] Existing CAD source and license metadata remain unchanged.

## Project Structure

```text
apps/web/
├── src/agents.ts                  # symbolic retry boundary
├── src/spatial-integration.ts     # real solver and compile adapters
├── src/sandbox.tsx                # solver-traced MechView inputs
└── tests/spatial-integration.test.ts
packages/solver/src/index.ts       # deterministic solver error details
packages/scad-service/src/index.ts # bounded L-bracket validation
```

**Structure Decision**: Add a narrow web adapter rather than duplicating solver or template
logic in the UI. The adapter owns fixture-to-service lookup and safe error presentation.

## Complexity Tracking

No constitution exceptions are required.
