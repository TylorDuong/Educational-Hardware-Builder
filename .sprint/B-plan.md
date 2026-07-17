# Owner B — Ani: Sprint Execution Plan

Status file: `.sprint/status.yml`  
Cursor: `.sprint/B.cursor`

## G1 — Contract sprint: spatial schemas

- Cell / day: H8 / Day 1, hours 2–3
- Hard waits: A1 (H7)
- Soft waits / fallback: none.
- Merge: yes — constitution, schemas, mocks, and fixtures land on `main`.
- Done when (copied): `CadAssetRecord.matingFeatures`, symbolic `MatingSelection`, `AssemblyTransform` (Z-up, parent-relative), and bounded `TemplateParams` are agreed in code; Constitution + schemas + mocks + fixtures are on main; three feature branches exist; G1 is Done.
- Status: pending

## B1 — Fixture STLs, expected outputs, and mock solver

- Cell / day: H9 / Day 1, by lunch
- Hard waits: G1 (H8)
- Soft waits / fallback: simplified placeholder geometry with correct hole positions if clean meshes are slow.
- Merge: yes — reviewed and merged to `main`.
- Done when (copied): C can import the mock solver and fixtures from main and call it with a sample `MatingSelection`; every fixture STL row has license + source recorded.
- Status: pending

## B2 — Spec-Kit prompts and metadata for five parts

- Cell / day: H12 / Day 1 afternoon
- Hard waits: G1 (H8)
- Soft waits / fallback: none.
- Merge: no — stays on `feature/002-spatial-3d`.
- Required Spec-Kit sequence: specify with the guide's spatial prompt; plan with its monorepo prompt; tasks (prune auto-detection, four templates, the 30-part library, and Storybook if `/sandbox` is faster); implement only hand-authored metadata for five parts.
- Done when (copied): five of ten parts have complete, schema-valid `matingFeatures` JSON; `spec.md`, `plan.md`, and pruned `tasks.md` are committed on the branch.
- Status: pending

## B3 — Finish metadata and build the solver

- Cell / day: H15 / Day 2
- Hard waits: B1 (H9), B2 (H12)
- Soft waits / fallback: none.
- Merge: no.
- Required Spec-Kit sequence: continue implement only remaining 10-part metadata, `packages/solver`, golden-file tests, and property tests.
- Done when (copied): all golden-file tests pass; the property test passes across the fixture set; all ten parts' metadata is schema-valid.
- Status: pending

## B4 — L-bracket template and compile/validate loop

- Cell / day: H18 / Day 3
- Hard waits: B3 (H15)
- Soft waits / fallback: A3 (H14); use the local `openscad` binary and reconcile the container endpoint when it lands. Add `TODO(reconcile B4)` at the seam.
- Merge: no.
- Required Spec-Kit sequence: implement only the L-bracket, `packages/scad-service`, validation, and the three rejection-path tests.
- Done when (copied): out-of-bounds params, a forced compile failure, and a zero-volume mesh are rejected with machine-readable reasons; the happy path emits a printable STL.
- Status: pending

## B5 — MechView 3D viewer and step sync

- Cell / day: H21 / Day 4
- Hard waits: B3 (H15), B4 (H18)
- Soft waits / fallback: cut B4 first; never the solver or viewer.
- Merge: yes — reviewed and merged to `main` by EOD.
- Required Spec-Kit sequence: implement only `MechView`, `/sandbox`, typed props, fixture transforms, interaction controls, and the 10-part performance check.
- Done when (copied): `/sandbox` renders the 10-part weather-station assembly smoothly with all interactions from fixture data alone; merged to main; A5 and C5 are landing the same evening.
- Status: pending

## B6 — Merge second in the train

- Cell / day: H24 / Day 5 morning
- Hard waits: A6 (H23)
- Soft waits / fallback: rebase while waiting for A6.
- Merge: yes — second, before C6.
- Done when (copied): feature branch is rebased after A6; solver golden tests pass on main; B6 is Done and C is notified to merge next.
- Status: pending

## B7 — Integration share: seams 3–5

- Cell / day: H26 (G2) / Day 5
- Hard waits: C6 (H25; merge train complete)
- Soft waits / fallback: no new scope; integration fixes only.
- Merge: seams-only fixes may merge.
- Required Spec-Kit sequence: use the shared G2 checklist; connect the real solver, transforms, and template compile loop; prove every rendered transform traces to a solver call.
- Done when (copied): all six seams are closed; real retrieval, inventory, solver, transforms, template validation, and live models are verified; C has made the live/fixture call; G2 is Done.
- Status: pending

## B8 — Performance pass, camera path, and 3D print

- Cell / day: H27 (G3) / Day 6
- Hard waits: G2 (H26)
- Soft waits / fallback: pin unreliable steps through `DEMO_SAFE_MODE`.
- Merge: no.
- Done when (copied): the L-bracket print has started; MechView is smooth on the demo machine; camera path is rehearsed; both rehearsals run; A records the backup video; G3 is Done.
- Status: pending

## G4 — Presentation day

- Cell / day: H28 / Day 7
- Hard waits: G3 (H27)
- Soft waits / fallback: `/sandbox` stays open as B's fallback; `DEMO_SAFE_MODE` and backup video remain available.
- Merge: no.
- Done when (copied): B delivers the 3–4 minute 3D moment — exploded view, step-synced highlight, collision/retry story, compile loop, and printed L-bracket.
- Status: pending
