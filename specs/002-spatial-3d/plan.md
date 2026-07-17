# Implementation Plan: Spatial Accuracy and 3D Viewer

**Branch**: `Ani-B` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

## Summary

Deliver B2 only: five hand-authored, source-linked weather-station CAD metadata records validated
through the shared schema package. Defer automatic detection, remaining part metadata, solver,
templates, compile validation, and MechView to B3-B5.

## Technical Context

**Language/Version**: TypeScript on Node 20  
**Primary Dependencies**: Zod shared schemas and Vitest  
**Storage**: Versioned fixture metadata in the schema package  
**Testing**: Vitest schema-validation tests and TypeScript typecheck  
**Target Platform**: Local development and GPU-free CI  
**Project Type**: Monorepo shared-contract package  
**Performance Goals**: Validation completes without GPU or remote calls  
**Constraints**: Hand-authored ground truth only; no coordinate-generating model path  
**Scale/Scope**: Five of ten weather-station parts for B2

## Constitution Check

- [x] Mating facts are hand-authored ground truth; later solvers own all transforms.
- [x] The shared Zod CAD-asset contract remains the typed boundary.
- [x] No cloud inference, runtime service, or GPU dependency is introduced.
- [x] No instructional or hazard flow is introduced.
- [x] Fixture data is local and does not introduce another datastore.
- [x] GPU-free schema tests cover valid and invalid records.
- [x] No client UI or long-running operation is introduced.
- [x] Viewer performance measurement is deferred to B5.
- [x] Every record includes source and license provenance.

## Project Structure

```text
packages/schemas/
├── fixtures/weather-station-parts.ts
├── tests/weather-station-parts.test.ts
└── src/index.ts
specs/002-spatial-3d/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/cad-asset-metadata.md
└── tasks.md
```

**Structure Decision**: Keep curated metadata adjacent to the shared contracts so agents and
future spatial services consume one typed source of truth.

## Complexity Tracking

No constitution exceptions are required.
