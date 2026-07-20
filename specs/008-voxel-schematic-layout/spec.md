# Feature Specification: Deterministic 3D Schematic Layout

**Feature Branch**: `008-voxel-schematic-layout`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Plan and implement a deterministic, agent-orchestrated 3D schematic layout system that turns structured parts and assembly relationships into collision-free integer-grid layouts and accurate Workshop rendering, with confidence-gated dimensions and no model-generated coordinates."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Inspect a physically coherent assembly (Priority: P1)

As a learner, I can inspect a Workshop assembly whose displayed parts retain
their real relative positions, scale, and collision-free fit instead of being
spread into a decorative grid.

**Why this priority**: The current view can show a solver trace while visually
overriding it, which undermines the learning value and physical credibility of
the 3D schematic.

**Independent Test**: A fixture assembly can be laid out and rendered from one
deterministic result, with no visual offset unrelated to the calculated layout.

**Acceptance Scenarios**:

1. **Given** verified fixture parts and named assembly relationships, **When**
   the layout is requested, **Then** every rigid part receives a deterministic
   placement on a one-millimetre grid without overlapping another rigid part.
2. **Given** a completed layout, **When** a learner opens the 3D view, **Then**
   the visible locations and dimensions correspond to that layout rather than
   an index-based presentation arrangement.

---

### User Story 2 - Review uncertain dimensions before layout (Priority: P1)

As a learner or facilitator, I am told when an assembly cannot be accurately
laid out because a required part's dimensions are not sufficiently verified.

**Why this priority**: An appealing but guessed schematic is less useful than a
clear request for verified dimensions; this is the hard accuracy boundary of
the proposed approach.

**Independent Test**: A layout request containing one low-confidence part is
stopped before placement and identifies that part for review.

**Acceptance Scenarios**:

1. **Given** a part whose dimensions do not meet the required confidence
   threshold, **When** it is included in an assembly, **Then** it is placed in
   a review queue and the layout is not produced.
2. **Given** a part with verified dimensions and recorded provenance, **When**
   it is included in an assembly, **Then** it may participate in layout using
   those dimensions.

---

### User Story 3 - Understand connected assemblies (Priority: P2)

As a learner, I can see flexible connections represented as routes that travel
between named connection points without passing through rigid components.

**Why this priority**: Wiring and other flexible items are central to hardware
schematics, but must not be allowed to hide invalid paths through components.

**Independent Test**: A fixture connection is routed from one named anchor to
another around occupied assembly space, and an impossible route reports a clear
failure rather than a fabricated path.

**Acceptance Scenarios**:

1. **Given** two reachable named connection points, **When** a flexible
   connection is laid out, **Then** its route begins and ends at those points
   and avoids occupied rigid-part space.
2. **Given** no free route exists within the assembly boundary, **When** a
   flexible connection is laid out, **Then** the assembly reports that route as
   unresolved and does not present it as valid.

---

### User Story 4 - Trust the assembly sequence (Priority: P2)

As a learner, I can trust that the schematic's checked arrangement supports
the intended construction order even though I remain free to read Workshop
steps in any order.

**Why this priority**: A layout can be collision-free but still be impossible
to assemble if it seals a container or connects a part before its anchor exists.

**Independent Test**: A canonical sequence that places each prerequisite first
passes validation, while a sequence that installs a child before its parent is
rejected with a typed explanation.

**Acceptance Scenarios**:

1. **Given** a constraint graph and canonical assembly steps, **When** the
   deterministic validator checks the completed layout, **Then** it confirms
   parent and connection prerequisites precede dependent operations.
2. **Given** a canonical assembly step that violates a prerequisite, **When**
   validation runs, **Then** it returns a clear failure without changing the
   learner's ability to inspect any Workshop step.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- A relationship references an unknown part, an unknown anchor, or a parent
  that has not been placed.
- A rigid part does not fit within its declared container or would collide with
  a previously placed rigid part.
- A dimension is non-integral, non-positive, missing provenance, or below the
  confidence threshold.
- A cyclic containment relationship or more than one root makes the assembly
  ambiguous.
- A flexible connection has no route within the bounded layout space.
- A canonical assembly sequence places a dependent part or connection before
  its prerequisite.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept only structured part, dimension, and
  assembly-relationship records at the schematic-layout boundary.
- **FR-002**: The system MUST prevent model-produced spatial coordinates,
  transforms, matrices, and free-form geometry from entering the layout engine.
- **FR-003**: The system MUST require a cited dimensional record with a
  confidence score of at least 0.85 for every part that participates in layout.
- **FR-004**: The system MUST quarantine every lower-confidence or otherwise
  unverifiable dimensional record and halt the affected layout until it is
  reviewed or replaced.
- **FR-005**: The system MUST derive all part placements from deterministic,
  integer-grid spatial rules and must reject collisions, out-of-bounds parts,
  ambiguous parentage, and invalid anchors.
- **FR-006**: The system MUST support containers, bases, rigid components, and
  flexible connections through named semantic relationships rather than
  model-provided coordinate values.
- **FR-007**: The system MUST deterministically route each flexible connection
  through unoccupied assembly space or report it as unresolved.
- **FR-008**: The Workshop 3D view MUST use the calculated layout for part
  positions and dimensions, with no decorative index-based placement offset.
- **FR-009**: The system MUST retain the source URL, locator, title, and
  license/provenance already required for CAD and instructional material.
- **FR-010**: The system MUST make the layout result inspectable through typed
  placement, route, and validation information without exposing model-generated
  geometry.
- **FR-011**: The system MUST deterministically validate canonical assembly
  order against parent and connection prerequisites without treating that order
  as a learner-navigation lock.

### Constitution Compliance *(mandatory where applicable)*

- **Physical accuracy and provenance**: Only deterministic layout code may
  calculate placement or routing. CAD metadata supplies dimensions and anchors;
  cited instructional claims remain unchanged.
- **LLM contract**: Extractor and Architect outputs are strict shared schemas,
  use JSON-mode at temperature 0.3 or lower, retry one validation failure, and
  fall back to a typed review/error result. They may name relationships but
  cannot provide spatial values.
- **Relevance and good-faith use**: The feature operates after existing
  relevance/malicious classification, so it does not introduce a new
  hazard-based restriction or Workshop progression gate.
- **Local operation and typed boundaries**: The initial implementation uses
  local fixture/CAD records and the existing typed client boundary; it adds no
  cloud runtime calls or datastore.
- **Licensing**: Existing CAD source URL, license, and hash requirements apply
  to every dimensional record used by the layout.
- **Verification and performance**: GPU-free tests cover schemas, deterministic
  placement, collision rejection, quarantine, routing, and renderer inputs.
  The view must retain the existing 60-fps-for-30-parts target.

### Key Entities *(include if feature involves data)*

- **Dimensional Record**: A cited, confidence-scored physical size for a
  catalogued part, eligible for layout only when verified.
- **Schematic Node**: A named part with a semantic role, verified dimensions,
  and named semantic anchors.
- **Constraint Graph**: The typed parent, mounting, and connection
  relationships that describe an assembly without positions.
- **Layout Result**: Deterministic part placements, flexible routes, and any
  typed validation/review outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every verified fixture assembly produces one repeatable,
  collision-free placement result across 100 repeated layout calculations.
- **SC-002**: 100% of fixture parts rendered in the Workshop correspond to
  deterministic layout placements; none receives a presentation-only offset.
- **SC-003**: 100% of fixture dimensional records below the 0.85 confidence
  threshold are held for review before a layout is emitted.
- **SC-004**: Every routable fixture connection avoids occupied rigid-part
  space, and every unroutable fixture connection produces an explicit typed
  failure.
- **SC-005**: A 30-part fixture layout completes within one second on the
  supported local development machine and preserves the existing interactive
  rendering performance target.
- **SC-006**: Every fixture sequence with a missing prerequisite produces a
  typed validation failure, while every ordered fixture sequence passes.

## Assumptions

- One voxel represents one millimetre; the first implementation supports
  axis-aligned bounding boxes and six-direction flexible routing.
- The current fixture CAD metadata is the initial source of dimensional truth;
  live web research and persistent review-queue workflow are planned follow-on
  work, not new runtime dependencies in this increment.
- Semantic anchors use named faces/connection points; rotation-aware mesh
  fitting and high-poly collision are future work.
- The existing Workshop's five-tab structure and freely navigable steps remain
  unchanged.
