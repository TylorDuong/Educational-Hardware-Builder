# Product Roadmap

The original MVP is complete. This roadmap converts its remaining operational and product risks into a sequence that keeps the fixture-backed demo reliable while expanding live capability deliberately.

## Now: stabilize the MVP

1. **Make the default demo repeatable.** Add a CI job that runs `pnpm test`, `pnpm typecheck`, and `pnpm build`; document its green result in release notes.
2. **Add a smoke test for `pnpm quickstart`.** Start the built server in `DEMO_SAFE_MODE=true`, request `/api/health`, and load the workshop root to prevent a broken first-run path.
3. **Publish a demo checklist.** Cover browser support, reset procedure, fixture-mode behavior, screenshots, and the expected recovery message when a live dependency is unavailable.

Exit criteria: a new contributor can clone, install, run `pnpm quickstart`, and complete the weather-station flow without Docker or model downloads.

## Next: validate live services

1. **Pin and verify model availability.** Confirm the exact Ollama tags (`llama3.2:3b`, `llama3.1:8b`, `qwen2.5-coder:7b`, and `nomic-embed-text`) before a live rehearsal.
2. **Exercise the Compose stack end to end.** Start services, run `scripts/demo-reset.ps1`, seed the cited corpus, verify `/api/health`, and record a live/fixture decision for each workshop step.
3. **Harden operations.** Add health/readiness reporting for Postgres, Ollama, and OpenSCAD, timeouts around model calls, and a concise operator recovery guide.

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
