# Quickstart: Verify Deterministic 3D Schematic Layout

## Prerequisites

- Node 22 LTS and pnpm 11.9.0.
- Dependencies installed with `pnpm install --frozen-lockfile`.

## Automated verification

Run the focused checks first:

```powershell
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/schemas typecheck
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/solver typecheck
pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web build:sandbox
```

Expected results:

- Schema tests reject coordinate-bearing agent graphs and invalid physical
  evidence.
- Solver tests prove repeatability, collision rejection, quarantine, parent
  composition, and obstacle-avoiding flexible routes.
- Web tests prove the fixture scene obtains positions/dimensions from a ready
  solver layout and the viewer has no index-based presentation grid.

## Manual Workshop check

1. Run `pnpm dev` with `DEMO_SAFE_MODE=true` when a model is unavailable.
2. Open the Workshop and inspect the 3D view at its default explode setting.
3. Confirm parts retain their calculated relative layout rather than a regular
   presentation grid.
4. Move the explode control and confirm it derives separation from the solved
   assembly, then return it to zero for the physically faithful view.
5. Continue navigating any Workshop step; a quarantined or rejected schematic
   must explain its typed state without blocking step access.

## Recorded verification (2026-07-20)

- `@educational-hardware-builder/schemas`: 19 tests passed; typecheck passed.
- `@educational-hardware-builder/solver`: 12 tests passed; typecheck passed.
  This includes the 30-component layout assertion, which completed below its
  one-second acceptance limit.
- `@educational-hardware-builder/web`: 77 tests passed; typecheck passed;
  production sandbox build passed.
- Browser QA used the built app with `DEMO_SAFE_MODE=1`: the fixture reached
  the Workshop 3D view, displayed eight source-backed bounding-box proxies and
  two checked flexible routes, and produced no browser-console errors.
- The Vite build retains a non-blocking advisory for the lazily loaded
  `MechView` chunk (about 245 kB gzip); accuracy verification is unaffected.
