# Functional End-to-End MVP Plan

This plan supersedes the presentation-focused parts of the original execution guides.
It is the authority for the remaining sprint work: G3 and the owner shares A8, B8,
and C8. The historical G4 presentation task is retired and must not be scheduled,
gated, or reported as work remaining.

## Objective

Deliver a repeatable local-first weather-station MVP that a learner can complete
end to end. The accepted path may use committed fixtures where the Day-5
live-versus-fixture decision pinned a step through `DEMO_SAFE_MODE`; it must not
depend on recordings, rehearsals, presenter roles, a camera path, or a 3D print.

## Current state and scope guard

- G2 is already complete: the integration seams are closed and the current golden
  path is fixture-pinned because the required local-model tags are unavailable.
- G3, tracker cell H27, is now **Functional MVP acceptance**, not a rehearsal day.
- Do not add features or revive the retired G4 work. Fix only defects that prevent
  the acceptance path below from working.
- `DEMO_SAFE_MODE` is a product reliability mechanism, not a presentation fallback:
  it must serve deterministic authored content when live models are unavailable.

## Owner shares for G3

### A8 - Runtime reset and resilience

- Run the documented reset flow twice against the local stack; it must return the
  seeded data and golden-path fixtures to a known state without manual database edits.
- Confirm the reset flow reports unavailable model warmup honestly and leaves the
  application usable with `DEMO_SAFE_MODE` enabled.
- Verify the compose configuration and the web integration reset/fallback tests.

### B8 - Spatial and template acceptance

- Run solver golden/property tests and SCAD-service validation tests.
- Build the sandbox and verify the weather-station view consumes solver-traced
  transforms, supports normal viewer interaction, and reaches the template happy path.
- Verify invalid template parameters, compile failure, and zero-volume output remain
  typed, readable rejection paths rather than UI crashes.

### C8 - Learner-flow acceptance

- Execute the weather-station flow from start to completion using the configured
  fixture/live decisions: cited research and lessons, plan, parts/substitution data,
  Workshop, 3D state, and completion.
- Prove server-side checkpoint gating: a locked next step is denied; a wrong answer
  receives re-explanation; a correct answer unlocks progress.
- Verify a solver rejection reaches the retry path and the recovered selection
  produces solver-traced transforms. Confirm no model-facing spatial payload exposes
  raw coordinates or transform matrices.

## Group acceptance gate for G3

Mark H27/G3 done only after all three owner shares pass and this evidence is recorded:

1. `pnpm --filter @educational-hardware-builder/schemas test` and `typecheck` pass.
2. `pnpm --filter @educational-hardware-builder/solver test` and `typecheck` pass.
3. `pnpm --filter @educational-hardware-builder/scad-service test` and `typecheck` pass.
4. `pnpm --filter @educational-hardware-builder/web test`, `typecheck`, and
   `build:sandbox` pass.
5. `docker compose -f infra/docker-compose.yml config` passes, and the local
   environment has either completed the reset/fixture acceptance flow or supplied
   explicit human evidence for a Docker- or hardware-dependent check.
6. The functional path is repeatable after a second reset. Any live-model
   unavailability is handled by the documented fixture path, not by skipping the
   flow.

## Completion

G3 is the final sprint code. When it passes, leave every owner cursor at `DONE` and
report the recorded functional evidence. Do not create, update, or wait on G4/H28.
