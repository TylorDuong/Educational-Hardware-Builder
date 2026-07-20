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
