# Research: Deterministic 3D Schematic Layout

## Decision: Keep spatial execution in the existing TypeScript solver package

**Rationale**: The current renderer and solver are already a strict TypeScript
workspace boundary. A sparse occupancy grid for a 30-part workshop fixture is
small, deterministic, and testable without adding Python, NumPy, Docker
services, or typed IPC.

**Alternatives considered**:

- A Python/NumPy service from the proposal: defer until mesh voxelization or
  substantially larger scenes make a separate compute service beneficial.
- Browser-side layout: reject because it would allow rendering logic to own
  physical decisions and weaken reproducibility.

## Decision: Use a 1 mm sparse, integer occupancy grid for MVP bounding boxes

**Rationale**: It meets the proposal's discrete spatial boundary, makes
collision rules reproducible, and keeps the source of coordinates exclusively
in deterministic code. Sparse occupancy avoids allocating a large dense cube.

**Alternatives considered**:

- Floating-point transforms: reject because they reintroduce drift and make
  validation harder to inspect.
- Voxelized CAD meshes: defer until the fixture assets are complete, licensed,
  hashed, and browser-deliverable.

## Decision: Treat sub-millimetre mating features as symbolic, not grid cells

**Rationale**: Existing 2.5 mm and 2.54 mm features cannot be faithfully
represented by a 1 mm grid. The existing mating solver continues to validate
feature compatibility; the new grid lays out verified outer bounds and derives
semantic anchors. A later mesh/half-millimetre phase can refine this boundary.

**Alternatives considered**:

- Round feature geometry into grid cells: reject because it silently changes
  physical fit.
- Change the proposal's grid unit now: defer until fixture measurements and
  expected performance are established.

## Decision: Quarantine dimensions below 0.85 confidence

**Rationale**: The supplied architecture defines 0.85 as the human-review
threshold. A typed result allows the Workshop to remain navigable while making
the missing fact visible rather than fabricating a layout.

**Alternatives considered**:

- Best-effort placement with a warning: reject under the project's accuracy
  principle.
- Runtime web lookup: reject because local-first runtime policy prohibits it;
  evidence must arrive through catalog/CAD ingestion.

## Decision: Render solver-owned bounding-box proxies, not the current grid

**Rationale**: Existing fixture STL files are incomplete and placeholder
geometry. A box sized from verified fixture bounds is more truthful than
pretending to render CAD or spreading parts into an index grid. The renderer
uses one scene-scale conversion for all solved world positions and dimensions.

**Alternatives considered**:

- Load the referenced STLs now: reject because files and hashes are incomplete
  and several meshes have no usable volume.
- Preserve presentation offsets: reject because they mask the calculated
  assembly layout.

## Decision: Use bounded six-direction A* for flexible connections

**Rationale**: Orthogonal routes are inspectable and predictable for a
schematic. The search receives occupied rigid-part voxels as obstacles and
allows only its named end anchors as entry/exit cells.

**Alternatives considered**:

- Straight-line routes: reject because they can cross rigid components.
- Unbounded search: reject because malformed input could consume unbounded CPU.
