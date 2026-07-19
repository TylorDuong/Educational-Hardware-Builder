# Educational Hardware Builder

A local-first, guided workshop for learning to build an ESP32 weather station. The MVP pairs cited lessons, server-enforced checkpoints, a deterministic mating solver, and an interactive 3D view. It works as a reliable fixture-backed demo without Docker or local models; optional services enable live retrieval, inventory, and local-model experiments.

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

Open [http://localhost:3000](http://localhost:3000). The command builds the Workshop UI and starts the API in `DEMO_SAFE_MODE=true`, so the full guided weather-station flow is available even when Postgres and Ollama are not running. Press `Ctrl+C` to stop it.

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

Use Docker when testing live retrieval, persisted inventory, headless OpenSCAD, or local Ollama models. The initial model download needs substantial disk space and may take a while.

```powershell
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

## Architecture

| Area | Location | Responsibility |
| --- | --- | --- |
| Workshop API and UI | `apps/web` | HTTP API, agent boundary, checkpoints, and Vite/React 3D experience |
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

Tests are designed to run without Docker, a GPU, or live Ollama. For the complete demo reset and integration verification sequence, see [specs/004-integration/quickstart.md](specs/004-integration/quickstart.md).

## Project status and roadmap

The original 7-day MVP acceptance work is complete: all G1-G3 gates in `.sprint/status.yml` are marked done. The next prioritized work is captured in [docs/roadmap.md](docs/roadmap.md). Use the Codex project guide in [.codex/README.md](.codex/README.md) when asking an agent to work in this repository.

## Contributing guardrails

- Keep cross-package data in `packages/schemas` and update its fixtures and mocks with schema changes.
- Preserve citations for factual learning content.
- Keep checkpoint gating server-side and preserve `DEMO_SAFE_MODE` fallbacks.
- Never accept model-produced coordinates or transform matrices; route symbolic selections through the solver.
- Do not commit `.env` files, build output, `node_modules`, or Docker data.

Feature specifications and historical sprint artifacts live in `specs/` and `.sprint/`.
