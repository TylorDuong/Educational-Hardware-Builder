# Educational Hardware Builder

A local-first, guided workshop for learning to build safe hardware projects. The Agentic Build Discovery flow turns a learner request into a typed, cited proposal, cached sourcing choices, and a server-gated lesson. It works as a reliable fixture-backed demo without Docker or local models; optional services enable local retrieval, inventory, background ingestion, and local-model experiments.

## Quickstart

Prerequisites: Node.js 22 LTS and pnpm 11.9.0. Docker Desktop is optional for the full local stack.

```powershell
pnpm install --frozen-lockfile
pnpm quickstart
```

If `pnpm` is not installed, enable it with Corepack from an elevated PowerShell session, then reopen the terminal:

```powershell
corepack enable
```

Open [http://localhost:3000](http://localhost:3000). The command builds the Workshop UI and starts the API in `DEMO_SAFE_MODE=true`, so a cited discovery-and-lesson flow is available even when Postgres and Ollama are not running. Submit a relevant technical request such as “Build a USB desk light,” then confirm the cited proposal, cached sourcing choices, freely navigable Workshop steps, and linked skills. Press `Ctrl+C` to stop it.

Fixture mode is the default first run. It never needs a live model or a vendor request; the deterministic fixtures supply the retrieval, catalog, and lesson data. Relevant technical requests remain available; only off-topic or malicious requests are rejected before discovery.

### Everyday commands

```powershell
# Run all package tests or all type checks
pnpm test
pnpm typecheck

# Build and start separately (uses current environment settings)
pnpm build
pnpm start

# Iterate on the standalone Vite 3D sandbox
pnpm dev
```

The fixture demo is the recommended first run. `pnpm dev` serves only the Vite sandbox; use `pnpm quickstart` for the complete API-backed workshop.

## Full local stack (optional)

Use Docker when testing local retrieval, persisted inventory, background ingestion, headless OpenSCAD, or local Ollama models. The initial model download needs substantial disk space and may take a while.

```powershell
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps
.\scripts\demo-reset.ps1
```

Then start the server with live paths enabled:

```powershell
$env:DEMO_SAFE_MODE = "false"
pnpm start
```

Check service state with `Invoke-RestMethod http://localhost:3000/api/health`. Shut down the optional services with:

```powershell
docker compose -f infra/docker-compose.yml down
```

The reset script is only for the running Compose stack: it truncates the demo tables, reloads deterministic inventory, reseeds cited weather-station guidance, and optionally warms local models. Do not run it against a database you want to retain.

### Source-policy and ingestion boundary

Learner discovery requests use only local records. External access is limited to background ingestion and is governed by [ingestion/source-policy.yml](ingestion/source-policy.yml). The n8n workflows in `ingestion/workflows/` may send typed payloads only to `POST /api/ingest/v2/upsert`; they must not receive direct PostgreSQL credentials or use browser automation, checkout, or arbitrary scraping.

To validate the deterministic ingestion fixture locally after the stack is healthy, provide the web upsert endpoint and its configured token, then run:

```powershell
$env:INGEST_API_URL = "http://localhost:3000/api/ingest/v2/upsert"
$env:INGEST_API_TOKEN = "local-dev-ingest-token"
node scripts/ingestion-smoke.mjs
```

For a real n8n rehearsal, import only the allowlisted workflow and verify its returned ingestion run proves API-only access; repeat it to check idempotency, then submit the unlicensed fixture and confirm last-known-good data remains unchanged.

## Architecture

| Area | Location | Responsibility |
| --- | --- | --- |
| Workshop API and UI | `apps/web` | HTTP API, agent boundary, freely navigable cited steps, skills links, and Vite/React 3D experience |
| Shared contracts | `packages/schemas` | Zod schemas, fixtures, and mocks used across package boundaries |
| Spatial solver | `packages/solver` | Deterministic symbolic mating selection to transform validation |
| CAD validation | `packages/scad-service` | OpenSCAD-facing validation adapter |
| Local services | `infra` | Postgres/pgvector, Ollama, OpenSCAD, and Compose configuration |
| Cited corpus | `ingestion` | Idempotent weather-station knowledge seeding |

The safety boundary is intentional: model-facing assembly choices are symbolic and schema-validated; the deterministic solver is the only component that returns transforms. Learning content remains associated with source URL, locator, and title.

## Verification

Run focused checks while working in an area:

```powershell
pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web build:sandbox
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/scad-service test
```

Tests are designed to run without Docker, a GPU, or live Ollama. The web suite includes a fixture quickstart smoke covering discovery, typed SSE, static assets, and the fixed five-tab shell. For the Agentic Build Discovery verification sequence and required human evidence, see [specs/006-agentic-build-discovery/quickstart.md](specs/006-agentic-build-discovery/quickstart.md).

## Project status and roadmap

The original MVP and superseded authored-build artifacts are historical. Active work is the Agentic Build Discovery specification in `specs/006-agentic-build-discovery/`; its remaining Docker, local-model, browser, and pull-request checks require recorded developer evidence. The next prioritized work is captured in [docs/roadmap.md](docs/roadmap.md). Use the Codex project guide in [.codex/README.md](.codex/README.md) when asking an agent to work in this repository.

## Contributing guardrails

- Keep cross-package data in `packages/schemas` and update its fixtures and mocks with schema changes.
- Preserve citations for factual learning content.
- Preserve freely navigable Workshop steps, cited skill-library links, and `DEMO_SAFE_MODE` fallbacks.
- Never accept model-produced coordinates or transform matrices; route symbolic selections through the solver.
- Do not commit `.env` files, build output, `node_modules`, or Docker data.

Feature specifications and historical sprint artifacts live in `specs/` and `.sprint/`.
