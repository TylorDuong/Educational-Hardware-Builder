# A2 Validation Quickstart

## Prerequisites

- Docker Desktop or Docker Engine with Compose support.
- A local checkout on `feature/001-platform-data`.

## Validate

```powershell
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml exec ollama ollama list
```

## Expected results

- `postgres` reports healthy.
- `ollama list` returns successfully inside the Ollama container; an empty model list is valid for
  this A2 skeleton.

## Cleanup

```powershell
docker compose -f infra/docker-compose.yml down
```
