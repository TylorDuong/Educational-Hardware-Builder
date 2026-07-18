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
