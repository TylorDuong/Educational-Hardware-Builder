# Educational Hardware Builder

A local-first Workshop for learning to plan and build hardware projects. A learner can describe a technical idea, explore a typed and cited proposal, review parts and sources, and follow a freely navigable learning plan with 3D and wiring views. It works as a reliable fixture-backed demo without Docker or local models; optional services enable local retrieval, inventory, background ingestion, and local-model experiments.

## What I built

I built a TypeScript monorepo for a local-first educational hardware-building experience. The four-tab Workshop helps a learner move from an idea to an understandable build plan:

- **Dashboard** accepts a technical project request and reports typed discovery progress.
- **Research** explains the proposal in plain language and preserves cited source material.
- **Parts** shows verified inventory, cached sourcing choices, and parts the learner already owns.
- **Workshop** provides directly navigable, cited steps, skill-library links, fit checks, a deterministic 3D schematic, and wiring guidance.

The application keeps important boundaries deliberate: cross-package data is Zod-validated, cited learning content retains its provenance, and deterministic solver code rather than model output owns physical placement and transforms. `DEMO_SAFE_MODE` makes the core flow repeatable with local fixtures; Docker, PostgreSQL/pgvector, OpenSCAD, and Ollama expand the optional local stack.

## How I used Codex and GPT-5.6

I used Codex and GPT-5.6 as development tools while retaining responsibility for the product scope, review, and verification.

| Tool | How I used it |
| --- | --- |
| Codex | I used Codex as my engineering workspace to inspect the repository and feature specs, make focused implementation and documentation changes, add or refine tests, and run the project verification commands. |
| GPT-5.6 | I used GPT-5.6 through Codex for coding and reasoning assistance: translating requirements into TypeScript and React changes, checking schema and API-boundary edge cases, and drafting focused tests and documentation for review. |

The AI tools assisted the development workflow; they are not a dependency of the learner-facing runtime. I reviewed the resulting changes and relied on the repository's type checks, tests, deterministic fixtures, and safety/provenance rules before keeping them. The optional live application path uses local Ollama, while fixture mode remains deterministic and works without a live model.

## Setup and quickstart

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

### eBay price and thumbnail refresh

The Parts tab can display a cached eBay listing thumbnail, price, and outbound link without making vendor requests from the browser. After `docker compose -f infra/docker-compose.yml up -d --build`, create an n8n **HTTP Basic Auth** credential named `eBay Browse API client credentials` (username: eBay Client ID; password: eBay Client Secret). Import [ingestion/workflows/ebay-browse-catalog-refresh.json](ingestion/workflows/ebay-browse-catalog-refresh.json), then run its manual trigger once. It refreshes the approved ESP32 DevKit and BME280 queries, keeps only US new fixed-price listings, downloads each thumbnail into the local catalog cache, and submits it through the existing authenticated ingest endpoint. The displayed price is labelled with its check date and expires after 24 hours.

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

Tests are designed to run without Docker, a GPU, or live Ollama. The web suite includes a fixture quickstart smoke covering discovery, typed SSE, static assets, and the four-tab shell. For the Open Workshop verification sequence and recorded human evidence, see [specs/007-open-workshop/quickstart.md](specs/007-open-workshop/quickstart.md).

## Project status and roadmap

The original MVP, superseded authored-build work, and safety-gated Agentic Build Discovery artifacts are historical. The active direction is [Open Workshop](specs/007-open-workshop/spec.md): open technical discovery, freely navigable cited lessons, and on-demand skill links. The next prioritized work is captured in [docs/roadmap.md](docs/roadmap.md). Repository-specific development guidance is in [AGENTS.md](AGENTS.md).

## Contributing guardrails

- Keep cross-package data in `packages/schemas` and update its fixtures and mocks with schema changes.
- Preserve citations for factual learning content.
- Preserve freely navigable Workshop steps, cited skill-library links, and `DEMO_SAFE_MODE` fallbacks.
- Never accept model-produced coordinates or transform matrices; route symbolic selections through the solver.
- Do not commit `.env` files, build output, `node_modules`, or Docker data.

Feature specifications and historical sprint artifacts live in `specs/` and `.sprint/`.
