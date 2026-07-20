# Quickstart: Agentic Build Discovery

## Fixture demonstration

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Start the fixture-only path (the quickstart defaults this switch to true):

   ```powershell
   $env:DEMO_SAFE_MODE = "true"
   pnpm quickstart
   ```

3. Open `http://localhost:3000`. On **Dashboard**, submit “Build a beginner
   USB desk light using my ESP32” and watch the typed discovery states.
4. Confirm the cited proposal exposes a freshness label, verified inventory or
   an inventory gap, a cached shop link when available, and a compatible
   alternative. Live checkout and vendor calls must be absent.
5. Select the proposal and confirm **Workshop** shows its safety callout before
   the instruction, citations, troubleshooting, and a server-gated checkpoint.
   Submit a wrong answer before the correct answer and retain the cited
   re-explanation as evidence.
6. Submit a mains request (for example, “Wire a 120 V mains desk light”) and a
   LiPo charging request. Each must block before offers, a lesson, or solver
   work becomes available.
7. Confirm the navigation still has exactly five visible tabs: Dashboard,
   Research, Build, Parts, and Workshop. The 3D Mech View remains inside the
   Workshop experience; no sixth tab is permitted.

The automated fixture smoke is GPU-free and does not replace browser evidence:

```powershell
pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/web build:sandbox
```

## Local-stack ingestion smoke

1. Validate then start the stack:

   ```powershell
   docker compose -f infra/docker-compose.yml config
   docker compose -f infra/docker-compose.yml up -d --build
   docker compose -f infra/docker-compose.yml ps
   ```

2. Configure n8n only with `INGEST_API_URL` and `INGEST_API_TOKEN`. It must not
   receive PostgreSQL credentials or direct domain-table access.
3. Import only an allowlisted workflow from `ingestion/workflows/` and a policy
   from `ingestion/source-policy.yml`. The policy permits explicit HTTPS
   documentation/vendor paths only and forbids checkout, browser automation,
   and unapproved scraping.
4. Run one documentation or catalog refresh and record its ingestion run ID,
   accepted/rejected counts, source URLs, licenses, policy revision, and offer
   freshness. Repeat the same request to confirm idempotency.
5. Submit `ingestion/fixtures/unlicensed-cad-upsert.json` (or another malformed
   record) and confirm rejection does not replace valid data. The deterministic
   API smoke may be run with:

   ```powershell
   $env:INGEST_API_URL = "http://localhost:3000/api/ingest/v2/upsert"
   $env:INGEST_API_TOKEN = "local-dev-ingest-token"
   node scripts/ingestion-smoke.mjs
   ```

6. For a disposable local demo database, run `./scripts/demo-reset.ps1` after
   the stack is healthy. It truncates and reseeds demo data; do not use it for
   retained learner data. Shut the stack down with `docker compose -f
   infra/docker-compose.yml down` when the rehearsal is complete.

## Required verification evidence

Record the following before final handoff; fixture assertions do not substitute
for these developer confirmations.

- Schema, web, solver, and SCAD tests/typechecks run without GPU or live
  Ollama, including negative-path coverage.
- The n8n local-stack rehearsal confirms n8n used only the authenticated upsert
  API and no direct database access.
- A local-Ollama discovery rehearsal records first-token, retrieval, and
  clean-start measurements. Do not claim this evidence until the required smoke
  command and measurements are available.
- A browser confirmation covers a safe discovery, blocked mains/LiPo request,
  all five tabs, typed progress, proposal selection, citations/freshness, and
  the server-side checkpoint gate. Record the developer, date, browser, and
  observed result.

## Recorded verification: T031 (2026-07-19)

The following GPU-free, Docker-free commands completed successfully:

```powershell
pnpm --filter @educational-hardware-builder/schemas test       # 11 tests passed
pnpm --filter @educational-hardware-builder/schemas typecheck
pnpm --filter @educational-hardware-builder/solver test        # 3 tests passed
pnpm --filter @educational-hardware-builder/solver typecheck
pnpm --filter @educational-hardware-builder/scad-service test  # 3 tests passed
pnpm --filter @educational-hardware-builder/scad-service typecheck
```

Required negative-path coverage passed: schemas reject malformed requests,
unknown fields, raw coordinates, uncited/unsafe lesson data, invalid licenses,
and blocked proposals that expose a BOM; the solver returns a typed error for a
missing symbolic feature; and the SCAD service rejects out-of-bounds parameters,
compiler failures, and zero-volume meshes.

## Recorded verification: T032 (2026-07-19)

The following GPU-free, Docker-free web verification commands completed
successfully:

```powershell
pnpm --filter @educational-hardware-builder/web test            # 65 tests passed
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web build:sandbox   # Vite production build passed
git diff --check
```

The sandbox build emitted the existing large-chunk advisory for the 3D Mech
View bundle but completed successfully. `git diff --check` reported no
whitespace errors.

## Recorded verification: T033 (2026-07-19)

Developer Tylor confirmed that the n8n local-stack rehearsal used only the
authenticated `POST /api/ingest/v2/upsert` API and had no direct database
access.

## Local-Ollama measurement smoke (T034)

On Windows with a native Ollama installation, set
`WEB_OLLAMA_URL=http://host.docker.internal:11434`, recreate the web service,
and confirm `/api/health` reports the local models. `make smoke-ollama` then
measures the first streamed token from `llama3.2:3b`, a cited local retrieval,
and a live discovery request. The command prints JSON suitable for the T034
record; it does not use `DEMO_SAFE_MODE`.

For the separately measured clean start, time the approved fresh-stack
rehearsal and pass its elapsed seconds in `CLEAN_START_SECONDS` before running
the target. Removing Compose volumes is destructive and requires explicit
developer approval because it deletes local Postgres, n8n, and Ollama data.

## Recorded verification: T034 (2026-07-19)

Developer Tylor confirmed that the local-Ollama discovery smoke used native
Windows Ollama on the AMD Radeon RX 9070 XT (Vulkan) and completed
successfully. The final `make smoke-ollama` result was:

```json
{
  "firstTokenMs": 403.2,
  "retrievalMs": 100.6,
  "discoveryResponseMs": 1085.4,
  "cleanStartSeconds": 102,
  "operationId": "89636f03-19c8-4c71-8d93-e58be65d2232",
  "result": "live discovery completed"
}
```

`ollama ps` reported both `llama3.2:3b` and `nomic-embed-text:latest` at
100% GPU. The measured first-token, retrieval, and clean-start times meet the
3-second, 200-ms, and 15-minute targets respectively.
