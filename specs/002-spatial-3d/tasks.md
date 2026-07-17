# Tasks: Spatial Accuracy and 3D Viewer (B2)

**Input**: Design documents from `specs/002-spatial-3d/`

## Phase 1: B2 Scoped Metadata

- [X] T001 Add five hand-authored CAD asset metadata records in `packages/schemas/fixtures/weather-station-parts.ts`.
- [X] T002 [P] Add schema validation tests for the metadata records in `packages/schemas/tests/weather-station-parts.test.ts`.
- [X] T003 Validate the package with Vitest and TypeScript using `packages/schemas/package.json`.

## Deferred Work

Automatic feature detection, the remaining five records, `packages/solver`, templates,
compile/validate work, MechView, Storybook, and Draco conversion are assigned to B3-B5.

## Dependencies and Execution Order

`T001 → T002 → T003`.

## B2 MVP

The delivery is complete when five source-linked records validate through the shared contract.
