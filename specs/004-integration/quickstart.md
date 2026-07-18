# Golden-Path Integration Validation

## GPU-free verification

Run the owner-A integration coverage and typecheck:

```powershell
pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/web typecheck
```

The integration test verifies that the agent research boundary obtains cited content from
the real retrieval service, a model outage returns cited deterministic fallback content,
and persisted inventory rows retain their verified/unverified status.

## Demo-machine reset

Start the Compose stack, then run:

```powershell
.\scripts\demo-reset.ps1
```

The operation clears demo data, loads the fixed ESP32/BME280 catalog and inventory,
reseeds 50 cited knowledge chunks, and attempts to warm the configured local models. It
targets one minute only after the model images and model weights are already available.

If local model warmup is unavailable, finish the demo in `DEMO_SAFE_MODE`; the integrated
research route retains cited fixture fallback content rather than crashing.

## Shared G2 handoff

This validates seams 1-2 only. B and C must separately close the solver, viewer,
compile-validation, and live-GPU seams before C makes the live/fixture call and the team
marks G2 done.

## Recorded verification (2026-07-17)

- Web: 16 tests pass; strict typecheck passes.
- Schemas: 6 tests and typecheck pass.
- Solver: 3 tests and typecheck pass.
- SCAD service: its three L-bracket tests and typecheck pass through installed workspace
  tooling. Its package-local `pnpm test` and `pnpm typecheck` currently cannot resolve
  `vitest` or `tsc` because `packages/scad-service/package.json` declares neither tool;
  this pre-existing package manifest issue is outside the seams-only G2 scope.

## B7 verification (2026-07-17)

- Web: 19 tests, including three real-solver/trace/template tests, pass; strict typecheck and
  production sandbox build pass.
- Solver: 3 tests and typecheck pass.
- SCAD service: its three L-bracket tests and strict typecheck pass through the workspace
  toolchain. Package-local scripts remain unavailable because its manifest has no `vitest` or
  `typescript` dependency; this pre-existing manifest gap is not changed by G2.

## C7 readiness decision (2026-07-18)

- All deterministic seams pass on the integration branch: 20 web tests and strict web
  typecheck pass; the production sandbox build, 3 solver tests/typecheck, and 3 focused SCAD
  service tests/typecheck pass.
- The demo machine has Ollama available, but only `llama3.2:latest` is installed. The required
  `llama3.2:3b` router and `llama3.1:8b` lesson/assembly model tags are unavailable.
- Pin golden-path steps 1–12 to the authored fixture by starting the demo server with
  `DEMO_SAFE_MODE=true`. The server entrypoint now forwards that explicit switch to the agent
  boundary; the test suite rejects ambiguous values such as `enabled`.
- This is an all-fixture decision for the current demo machine. Reconsider individual steps only
  after the required model tags are installed and a live end-to-end rehearsal is completed.
