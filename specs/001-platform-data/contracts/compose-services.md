# Compose Service Contract

## PostgreSQL

- Provides the project’s sole persistent datastore.
- Uses a pgvector-capable image and a persistent named volume.
- Reports healthy only after a local database readiness command succeeds.

## Ollama

- Provides only local model-runtime access.
- Persists model data in a named volume.
- Is reachable to later compose services at `http://ollama:11434`.
- Model pulls and GPU-specific execution are deferred to A3.
