# Quickstart: Agentic Build Discovery

## Fixture demonstration

1. Install workspace dependencies with the repository's pinned pnpm command.
2. Set `DEMO_SAFE_MODE=true`.
3. Start the existing local quickstart path.
4. On Dashboard, submit a prepared safe request and watch typed progress.
5. Verify Research shows citations/freshness, Inventory/Parts distinguishes
   verified inventory, and Workshop starts only after safe proposal selection.
6. Answer both checkpoints incorrectly then correctly; confirm server gating
   and cited re-explanation.
7. Submit a fixture mains/LiPo request and confirm a hard block before offers
   or lesson instructions appear.

## Local-stack ingestion smoke

1. Start Docker Compose after its configuration check passes.
2. Configure only the approved source-policy fixtures and the ingestion API
   credential for n8n; do not grant n8n direct database credentials.
3. Run one allowlisted documentation/catalog workflow and inspect the returned
   ingestion run ID, accepted/rejected counts, source URLs, licenses, and
   freshness fields.
4. Run the same workflow again and confirm idempotency; inject a malformed or
   unlicensed record and confirm it is rejected without replacing valid data.
5. Run one local-Ollama discovery smoke using the Make target created by the
   implementation and record the result.

## Required verification evidence

- Schema, web, solver, and SCAD tests/typechecks run without GPU or live
  Ollama.
- Retrieval/first-token/clean-start measurements are recorded.
- Human browser confirmation covers a safe discovery flow, blocked hazard, five
  tabs, progress, selection, citations/freshness, and checkpoint gate.
