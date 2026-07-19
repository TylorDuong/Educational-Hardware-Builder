# Implementation Plan: Second Authored Beginner Build

**Branch**: `codex/authored-build`  
**Spec**: `specs/005-authored-build/spec.md`

## Technical approach

Create a typed authored-build manifest and registry instead of adding a second set of weather-station conditionals. Keep each build's steps, checkpoints, citations, symbolic mating selections, and optional template requests in its own fixture module. Resolve the selected manifest on the server before Workshop access and pass the same selection through the existing five-tab UI.

The developer chooses the specific beginner build only after completing a source, safety, inventory, CAD-license, and solver-feature brief. This avoids inventing unsupported parts or treating a product idea as verified instructional content.

## Affected areas

| Area | Planned change |
| --- | --- |
| `packages/schemas/src/index.ts` | Shared authored-build manifest and build identifier contracts |
| `apps/web/fixtures/` | Build brief, new authored fixture, and fixture registry |
| `apps/web/src/workshop.ts` | Build-scoped session, step access, and checkpoint grading |
| `apps/web/src/server.ts` | Typed build selection and validation at the HTTP boundary |
| `apps/web/src/sandbox.tsx` | Build selector and build-scoped plan, lesson, parts, and workshop rendering |
| `apps/web/src/spatial-integration.ts` | Build-scoped solver traces and typed spatial errors when required |
| `ingestion/demo_seed.sql` | Verified catalog and inventory data only for approved new parts |
| `apps/web/tests/` and package tests | Fixture, server, workshop, spatial, and quickstart regression coverage |

## Constitution check

- Cite every instructional claim and preserve source URL, title, and locator.
- Keep selected-build, workshop, and model boundaries Zod-validated.
- Hard-block hazards before instructions; do not choose a build requiring mains AC or LiPo charging.
- Keep transforms solver-owned and CAD assets source/licence identified.
- Preserve fixture-first operation and the five-tab information architecture.
- Run deterministic unit tests, contract tests, SCAD negative-path tests when templates/assets change, and a GPU-free quickstart smoke check.
