# Feature Specification: Spatial Accuracy and 3D Viewer

**Feature Branch**: `Ani-B`  
**Created**: 2026-07-17  
**Status**: Draft  
**Input**: Build the spatial accuracy engine and standalone 3D viewer for the educational hardware builder.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect trusted part metadata (Priority: P1)

As a builder, I can rely on a curated weather-station part catalog whose physical mating features
are explicitly recorded, so later assembly guidance is based on inspectable ground truth.

**Why this priority**: Physical metadata is the prerequisite for deterministic assembly and must
not be inferred from model prose.

**Independent Test**: The first five curated records validate against the shared CAD-asset contract.

**Acceptance Scenarios**:

1. **Given** the weather-station metadata set, **When** it is validated, **Then** five records have
   an identifiable source, license, and structured mating features.
2. **Given** a record with invalid physical metadata, **When** it is validated, **Then** it is rejected
   before it can be used by an assembly workflow.

### Edge Cases

- A part has no mounting hole but exposes a connector or other usable mating feature.
- A source lacks a redistributable or identifiable license.
- A future system proposes a spatial coordinate instead of symbolic feature identifiers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain hand-authored structured mating metadata for five
  weather-station parts in this delivery slice.
- **FR-002**: Each part metadata record MUST identify its source and license.
- **FR-003**: Each record MUST validate through the shared CAD-asset contract before consumers use it.
- **FR-004**: Metadata MUST describe features symbolically and preserve the project’s Z-up,
  parent-relative coordinate convention for later solver outputs.
- **FR-005**: The delivery MUST defer automated feature detection, additional templates, the
  complete ten-part set, and viewer implementation to their assigned later sprint tasks.

### Constitution Compliance *(mandatory where applicable)*

- **Physical accuracy and provenance**: This slice uses hand-authored, source-linked physical
  metadata; later deterministic solver work owns transforms and coordinates.
- **LLM contract**: No LLM is used in this slice. Future solver inputs use the shared symbolic
  `MatingSelection` contract rather than free-form spatial output.
- **Safety**: No instructional flow is introduced; consuming features retain the existing safety
  category boundary.
- **Local operation and typed boundaries**: Records are local fixture data and validate through
  the shared schema package.
- **Licensing**: Each record includes an identifiable source URL and license description.
- **Verification and performance**: Metadata validation is covered by GPU-free tests; viewer
  performance is explicitly deferred to B5.

### Key Entities *(include if feature involves data)*

- **CAD asset metadata**: A curated physical-part record with provenance and mating features.
- **Mating feature**: A named mounting hole, connector, edge, face, or axis used by deterministic assembly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Five weather-station parts validate with complete source, license, and mating-feature data.
- **SC-002**: Invalid metadata is rejected by automated validation.
- **SC-003**: The metadata validation suite completes without a GPU or external service.

## Assumptions

- The current slice uses hand-authored measurements from authoritative part documentation.
- Solver behavior, template generation, and the interactive viewer are owned by B3, B4, and B5.
