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

## A5 retrieval and health validation

After A4 has seeded the cited ESP32/BME280 corpus, start the API service and exercise both
machine-readable endpoints:

```powershell
docker compose -f infra/docker-compose.yml up -d --build web
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/retrieve -ContentType application/json -Body '{"query":"connect BME280 to ESP32","limit":3}'
Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/health
```

The retrieval response contains relevant BME280 wiring guidance and a citation for each result.
Health reports `database: "ok"`, `ollama: "ok"`, locally available model names, and the selected
model tier. The A5 acceptance run repeats these commands against a clean Compose volume after
running `python ingestion/seed_weather_station.py`.
