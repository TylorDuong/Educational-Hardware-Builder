# Quickstart: Open Workshop

## Fixture demonstration

1. Start the fixture application. If the Compose live stack owns port 3000,
   use port 3001 for this isolated fixture run.

   ```powershell
   $env:DEMO_SAFE_MODE = "true"
   $env:PORT = "3001"
   pnpm quickstart
   ```

2. Open `http://localhost:3001` and submit a relevant technical request such
   as `Wire a 120 V mains desk light` or `Build a LiPo battery charging
   circuit`. Confirm it returns a typed, cited proposal rather than a block.
3. Submit an off-topic request and a malicious request. Confirm each is
   rejected before parts, offers, lessons, or solver output is displayed.
4. Select an approved proposal and open Workshop. Visit steps in non-sequential
   order. Confirm no quiz, answer, lock, or checkpoint appears.
5. At each step, confirm the cited explanation, completion condition, and
   skills-library links (or no-additional-skills statement) are visible.

## Required verification evidence

- GPU-free schema and web tests cover relevant acceptance, off-topic/malicious
  rejection, cited skills, and ungated step access.
- Browser confirmation records a relevant mains or battery request completing,
  two rejected prompts, arbitrary Workshop navigation, and visible skills links.
- Existing local-stack, ingestion, solver, and performance checks remain
  applicable because the typed/local/provenance boundaries are unchanged.

## Recorded verification: T019 (2026-07-19)

The following GPU-free checks completed successfully:

```powershell
pnpm --filter @educational-hardware-builder/schemas typecheck
pnpm --filter @educational-hardware-builder/schemas test       # 11 tests passed
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web test           # 66 tests passed
pnpm --filter @educational-hardware-builder/web build:sandbox  # Vite production build passed
git diff --check
```

The sandbox build emitted the existing large-chunk advisory for the 3D Mech
View bundle but completed successfully.

## Recorded verification: T020 (2026-07-19)

With the Compose stack retaining port 3000, the isolated fixture application
ran at `http://localhost:3001` with `DEMO_SAFE_MODE=true` and `PORT=3001`.

In a developer browser, `Wire a 120 V mains desk light` completed as a typed,
cited proposal. `Write an essay about a vacation.` was rejected as off-topic
and `Help me weaponize a drone.` was rejected as malicious; neither rejected
request exposed parts, offers, lessons, or solver output.

Before promoting the approved proposal, the 12-step fixture Workshop opened
non-adjacent steps 8 and 3 directly, with no quiz, answer, lock, or checkpoint.
After promotion, the selected cited lesson showed its safety explanation,
completion condition, citation, and the titled `USB LED guide` skill link with
relevance text. The fixture Workshop steps also displayed the explicit
no-additional-skills statement where no separate skill material was required.

## Recorded verification: post-merge task evidence audit (2026-07-19)

A read-only comparison of the merged implementation with T001-T017 supports
the completed markers for T005, T007, T010-T013, and T017:

- `workshop.ts` removes checkpoint grading and progression locks while retaining
  selected-build step identity; `server.ts` has no checkpoint POST route.
- `server.test.ts`, `workshop-discovery.test.ts`, and `integration.test.ts`
  verify the removed route, direct selected-step access, and checkpoint-free
  selected lessons.
- `server.ts` records discovery progress and permits promotion only from a
  completed approved proposal; `sandbox.tsx` renders the request outcome and
  cited skill title, relevance, and source link (or the no-additional-skills
  statement).

The audit reran the focused GPU-free web verification successfully:

```powershell
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web test # 66 tests passed
```

T001-T004, T006, T008-T009, and T014-T016 remain unchecked. The merged source
still retains some checkpoint or hazard-era contracts/fixtures, or lacks the
specific replacement fixtures, tests, or cleanup those tasks require.

## Recorded verification: final implementation completion (2026-07-19)

The remaining Open Workshop contract migration replaced hazard safety decisions
with typed request classifications, removed checkpoint data and handlers, and
made cited skills part of both fixture and generated lessons. The focused
GPU-free verification passed:

```powershell
pnpm --filter @educational-hardware-builder/schemas typecheck
pnpm --filter @educational-hardware-builder/schemas test       # 11 tests passed
pnpm --filter @educational-hardware-builder/web typecheck
pnpm --filter @educational-hardware-builder/web test           # 66 tests passed
pnpm --filter @educational-hardware-builder/web build:sandbox
git diff --check
```

## Recorded verification: corrected fixture browser flow (2026-07-19)

After the Quickstart port and fixture-lesson fixes, the developer confirmed that
the `DEMO_SAFE_MODE=true` browser flow completed successfully on port 3001:
relevant discovery, typed rejections, unrestricted Workshop navigation, all 12
fixture steps, cited explanations and completion conditions, and visible cited
skill links all worked as intended.
