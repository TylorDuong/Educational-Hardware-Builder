# Data Model: Deterministic 3D Schematic Layout

## CAD Asset Physical Metadata

Existing CAD records gain source-backed integer outer bounds and a confidence
record. The CAD source URL, license, and hash remain required. The layout
engine accepts a record only when its dimensional confidence is at least 0.85.

## Schematic Constraint Graph

The Architect output contains no coordinate or transform field.

| Entity | Key fields | Rules |
| --- | --- | --- |
| Node | part ID, role, optional parent, optional parent anchor, named anchors | IDs are unique; roles are container, base, component, or flexible. |
| Anchor | name, semantic face | A referenced anchor must exist on the parent/node. |
| Flexible connection | ID, optional flexible-part ID, source node/anchor, destination node/anchor | Both endpoints must resolve after rigid placement. |
| Assembly step | canonical order, action, referenced part/connection IDs | Prerequisites must occur before dependent parts and connections. |
| Graph | grid unit, nodes, connections | Grid unit is exactly 1 mm; roots and parent chains must be unambiguous. |

## Solver Layout Result

| Entity | Key fields | Rules |
| --- | --- | --- |
| Placement | part ID, solver-owned integer world position, integer bounds | Rigid placements cannot overlap and must respect their parent container/boundary rule. |
| Route | connection ID, ordered solver-owned integer points | First/last point equal named endpoints; intermediate points cannot occupy a rigid voxel. |
| Quarantine record | part ID, observed confidence, required confidence, reason | Produced before placement when evidence is insufficient. |
| Rejection | machine-readable code and safe message | Used for invalid graph, collision, bounds, anchor, or route failures. |
| Sequence validation | pass/fail and prerequisite errors | Evaluates canonical assembly order only; it never locks Workshop navigation. |

## State Transitions

```text
structured entities → cited dimensions → verified | quarantined
verified + constraint graph → deterministic layout → ready | rejected
ready + canonical assembly sequence → validated | sequence-rejected
```

The Workshop can show existing explanatory steps in every state; a rejected or
quarantined schematic does not lock Workshop navigation.
