# Local foundation (A2)

Start the two-service skeleton from the repository root:

```powershell
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml exec ollama ollama list
```

`postgres` must report healthy. An empty model list is expected until A3 adds model initialization.
The A2 services are intentionally internal to Compose, so they do not bind host ports. Stop the
stack with `docker compose -f infra/docker-compose.yml down`.
