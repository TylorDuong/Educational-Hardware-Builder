# Educational Hardware Builder — Agent Guide

## Repository overview

pnpm TypeScript monorepo for a local-first educational hardware-building app.

- `apps/web/`: Node HTTP API, agent orchestration, Workshop UI, and Vite 3D sandbox.
- `packages/schemas/`: shared Zod contracts, fixtures, and mocks. Treat as the source of truth for cross-package data.
- `packages/solver/`: deterministic symbolic mating-selection to transform solver.
- `packages/scad-service/`: OpenSCAD-facing validation service.
- `infra/`: Docker Compose stack, Postgres/pgvector schema, and headless OpenSCAD container.
- `ingestion/`: idempotent cited knowledge-corpus seeding script.
- `specs/`: approved feature specifications, plans, contracts, and task lists.
- `.sprint/`: shared sprint state; only change it when completing the corresponding approved sprint task.

## Setup and common commands

Use Node 22 LTS and pnpm 11.9.0.

```powershell
pnpm install --frozen-lockfile

pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web build:sandbox
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/schemas typecheck
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/solver typecheck
pnpm --filter @educational-hardware-builder/scad-service test
pnpm --filter @educational-hardware-builder/scad-service typecheck
```

Run local infrastructure when exercising the API, real retrieval, model paths, or OpenSCAD:

```powershell
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml down
```

## Development rules

- Use strict TypeScript and ESM imports with explicit `.js` extensions where the existing package conventions require them.
- Add or update focused tests beside the affected package. The web app uses `node:test` and `node:assert/strict`; packages use Vitest.
- Validate all cross-boundary data with the shared Zod schemas. Update schemas, mocks, fixtures, and consumers together.
- Agent output must stay structured and schema-validated. Never allow model-generated raw spatial coordinates or transform matrices; use the deterministic solver.
- Keep factual learning content cited. Preserve source URL, locator, and title with retrieved or seeded material.
- Keep server-side checkpoint gating server-side; a client-only lock is insufficient.
- Preserve `DEMO_SAFE_MODE` fallbacks for model-dependent paths and ensure tests can run without Docker, GPU, or live Ollama.
- Do not commit secrets, `.env` files, generated build output, `node_modules`, or persistent Docker data.

## Change and verification workflow

1. Read the relevant `specs/<feature>/` artifacts and affected shared contracts before editing.
2. Make the narrowest implementation change that satisfies the task.
3. Run the most specific test and typecheck first; run related package tests before handoff.
4. For Compose changes, validate with `docker compose -f infra/docker-compose.yml config` before starting services.
5. Preserve existing user changes. Do not reset, overwrite, or reformat unrelated files.

## Sprint work

For sprint work, follow `.agents/skills/sprint-run/SKILL.md` and the matching owner execution guide. Respect hard gates in `.sprint/status.yml`, work only on the assigned branch, and do not merge without the required review.
