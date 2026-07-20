# Product Roadmap

The original MVP and superseded authored-build sprint are historical. The active direction is Agentic Build Discovery: preserve the fixture-backed demo while deliberately adding cited local discovery, cached sourcing, server-gated lessons, and background-only ingestion.

## Now: complete the Agentic Build Discovery handoff

1. **Keep the fixture path repeatable.** `DEMO_SAFE_MODE=true` must complete safe discovery, source selection, and a cited lesson with no Docker, GPU, live model, or vendor request. The quickstart smoke protects discovery routes, typed SSE, static assets, and the five-tab shell.
2. **Verify the local-stack boundary.** Compose must validate before startup; n8n may use only its ingestion API credential and `POST /api/ingest/v2/upsert`, while `ingestion/source-policy.yml` limits documentation and vendor refreshes to allowlisted HTTPS records.
3. **Record the human evidence.** A developer must separately confirm the n8n API-only smoke, local-Ollama timing measurements, and browser flow. These are release gates, not claims made by fixture tests.

Exit criteria: a new contributor can clone, install, run `pnpm quickstart`, complete a safe fixture discovery, see a hard-blocked unsafe request, and follow the documented path for optional local-stack evidence.

## Next: validate live services

1. **Pin and verify model availability.** Confirm the exact Ollama tags (`llama3.2:3b`, `llama3.1:8b`, `qwen2.5-coder:7b`, and `nomic-embed-text`) before a live rehearsal, then record first-token, retrieval, and clean-start measurements.
2. **Exercise the Compose stack end to end.** Run `docker compose -f infra/docker-compose.yml config`, start services, run `scripts/demo-reset.ps1` only against disposable demo data, seed the cited corpus, verify `/api/health`, and record a live/fixture decision for each workshop step.
3. **Harden ingestion operations.** Keep source-policy revisions, ingestion errors, offer freshness, and API-only n8n audit evidence visible; add concise recovery guidance for Postgres, Ollama, OpenSCAD, and failed refreshes.

Exit criteria: a documented demo machine passes a live rehearsal and fixture mode remains an explicit, tested fallback.

## Then: broaden the learning experience

1. **Support a second authored build.** Add a cited corpus, inventory records, symbolic assembly fixtures, lessons, and checkpoints through the shared schemas.
2. **Move from a single demo session to learner projects.** Persist progress, inventory, and checkpoint history with clear reset and privacy behavior.
3. **Improve feedback loops.** Add accessible checkpoint explanations, clearer solver-retry guidance, and testable 3D fallback states.

Exit criteria: two complete, cited learning paths share the same validated contracts and both pass fixture-mode acceptance tests.

## Later: production readiness

1. **Security and access control.** Define authentication, user-data retention, input limits, and audit logging before exposing remote access.
2. **Deployment and observability.** Add environment configuration, backups, structured logs, metrics, error reporting, and a release rollback plan.
3. **Content and hardware quality.** Establish source-review, CAD-template validation, hardware safety review, and compatibility policies.

Exit criteria: the application has an approved deployment model, observable services, recoverable data, and documented content/hardware review gates.

## Decision rules

- Keep fixture mode as the baseline acceptance path; live-model work is additive, never a prerequisite for basic learning flow.
- Plan work through a spec before implementation when it changes shared schemas, model contracts, persistence, or user safety.
- Prefer one independently demonstrable slice at a time: contract, fixture, UI, test, and operator documentation together.
