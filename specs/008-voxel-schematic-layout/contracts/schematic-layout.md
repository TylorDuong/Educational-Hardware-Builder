# Schematic Layout Contract

## Agent-facing graph

The Extractor and Architect may emit only the strict shared graph contract:

```json
{
  "gridUnitMm": 1,
  "nodes": [
    {
      "partId": "uuid",
      "role": "base",
      "anchors": [{ "name": "top", "face": "top" }]
    }
  ],
  "connections": []
}
```

The contract intentionally has no `position`, `coordinate`, `transform`,
`quaternion`, `matrix`, mesh, or arbitrary geometry field. Agent output is
validated by the shared Zod schema, retried once on validation failure, and
falls back to a typed failure/review response.

## Deterministic layout input and result

The solver combines the graph with approved CAD asset metadata. It emits one of
three typed outcomes:

- `ready`: integer placements and zero or more orthogonal flexible routes;
- `quarantined`: one or more parts lack dimensions at the 0.85 confidence
  threshold; or
- `rejected`: the graph is invalid, a solid collides, a part is out of bounds,
  an anchor is unknown, no flexible route exists, or the canonical assembly
  sequence violates a prerequisite.

All positions in a `ready` result are deterministic solver output, never model
output. The renderer consumes only `ready` placements and routes.
