# Research: Platform and Data Foundation

## Decisions

### Compose only the two A2 foundation services

- **Decision**: Add PostgreSQL with pgvector and Ollama now; defer web, n8n, OpenSCAD, migrations,
  and model initialization to A3 and later slices.
- **Rationale**: The A2 acceptance checks exercise only database health and `ollama list`; adding
  later services would increase failure surface before their owning tasks.
- **Alternatives considered**: A full stack compose file was rejected for A2 because it violates the
  guide's compose-skeleton-only boundary.

### Keep model initialization out of startup

- **Decision**: Persist Ollama data but do not pull models automatically in A2.
- **Rationale**: Pulling the four-model set is A3 work and would make the A2 health check slow and
  hardware-dependent.
- **Alternatives considered**: Pulling a default model in A2 was rejected as premature scope.

### Use health checks for database readiness

- **Decision**: The database service exposes a command-based health check and a named persistent
  volume.
- **Rationale**: Compose can report readiness deterministically before later services depend on it.
- **Alternatives considered**: Application-level health endpoints are deferred to A5.
