# Owner C — Arveen: Sprint Execution Plan

Status file: `.sprint/status.yml`  
Cursor: `.sprint/C.cursor`

## G1 + C1 — Contract sprint: agent-facing schemas

- Cell / day: H8 (G1) + H10 (C1) / Day 1, hours 2–3
- Hard waits: A1 (H7)
- Soft waits / fallback: none.
- Merge: yes — shared constitution, schemas, mocks, and fixtures land on `main`; C1 is C's share of G1.
- Done when (copied): `StepPlan`, `Lesson`, `Checkpoint`, `AgentProgressEvent`, cited factual outputs, and symbolic-only `MatingSelection` are agreed and represented in the shared schemas/mocks; Constitution + schemas + mocks + fixtures are on main; three feature branches exist; G1 and C1 are Done.
- Status: done (completed by Arveen at 2026-07-17T21:50:22Z)

## C2 — Scaffold and hand-write the golden StepPlan

- Cell / day: H13 / Day 1, by EOD
- Hard waits: G1 (H8)
- Soft waits / fallback: none.
- Merge: yes — golden fixture and approved Spec-Kit artifacts land on `main`.
- Required Spec-Kit sequence: specify with the guide's agents/workshop prompt; plan with its architecture prompt; tasks (prune Beginner/Intermediate variants, visual polish, and Playwright if needed); do not implement beyond scaffolding and the hand-written fixture.
- Done when (copied): the golden StepPlan fixture is on main, passes Zod validation, and its mating selections reference real B fixture IDs; spec/plan/tasks are committed; A knows to align real chunks to the golden path.
- Status: done (completed by Arveen at 2026-07-18T00:22:00Z)

## C3 — callModel helper and first agents on mocks

- Cell / day: H16 / Day 2
- Hard waits: C2 (H13)
- Soft waits / fallback: none.
- Merge: no.
- Required Spec-Kit sequence: continue implement only callModel, Router, Research, Lesson, mock retrieval, SSE progress, retry/fallback, and DEMO_SAFE_MODE work.
- Done when (copied): 20 consecutive live calls either schema-validate or cleanly fall back with no unhandled failures; citations render in Research/Lesson output; DEMO_SAFE_MODE forces fixtures when set.
- Status: done (completed by Arveen at 2026-07-18T00:29:34Z)

## C4 — Workshop and server-side checkpoint gating

- Cell / day: H19 / Day 3
- Hard waits: C3 (H16)
- Soft waits / fallback: none.
- Merge: no.
- Required Spec-Kit sequence: implement only split-screen Workshop, fixture transforms, five MVP tabs, state/SSE wiring, and server-side checkpoint gating.
- Done when (copied): a direct API call for a locked step returns 403; Workshop renders MechView, lesson, and checkpoint in fixture step-sync.
- Status: done (completed by Arveen at 2026-07-18T00:33:55Z)

## C5 — Assembly agent and full mock flow

- Cell / day: H22 / Day 4
- Hard waits: C4 (H19), B1 (H9)
- Soft waits / fallback: identity-transform mock solver behind a flag if B1 slips; swap it when B1 lands.
- Merge: yes — reviewed and merged to `main` by EOD.
- Required Spec-Kit sequence: implement only symbolic Assembly-to-solver retry, coordinate-leak lint, checkpoint grading, UI polish, and the golden path on mocks.
- Done when (copied): the full weather-station flow runs start to completion on mocks; Assembly→solver→retry works against B's mock; coordinate-leak lint is green; merged to main alongside A5 and B5.
- Status: done (completed by Arveen at 2026-07-18T01:35:51Z)

## C6 — Merge last in the train

- Cell / day: H25 / Day 5 morning
- Hard waits: B6 (H24)
- Soft waits / fallback: rebase and keep the golden-path E2E green while waiting.
- Merge: yes — third, after A6 then B6.
- Done when (copied): branch is rebased after A6/B6; full golden path on main confirms the three subsystems compose; C6 is Done and integration begins.
- Status: done (completed by Arveen at 2026-07-18T05:56:47Z)

## C7 — Integration seams and live-vs-fixture decision

- Cell / day: H26 (G2) / Day 5
- Hard waits: C6 (H25; merge train complete)
- Soft waits / fallback: pin unreliable live steps to fixtures through DEMO_SAFE_MODE.
- Merge: seams-only fixes may merge; no new scope.
- Required Spec-Kit sequence: use the guide's shared G2 checklist; close all six seams and make the per-step live/fixture call.
- Done when (copied): all six seams are closed; real retrieval, inventory, solver, transforms, template validation, and live models are verified; each step is confirmed live or pinned; G2 is Done.
- Status: done (completed by Arveen at 2026-07-18T07:28:12Z; all golden-path steps pinned to fixtures because the required live-model tags are unavailable)

## C8 — Tune prompts, demo script, and rehearsals

- Cell / day: H27 (G3) / Day 6
- Hard waits: G2 (H26)
- Soft waits / fallback: pin unreliable steps through DEMO_SAFE_MODE; do not rehearse before the live/fixture decision is locked.
- Merge: no.
- Done when (copied): prompts are tuned or pinned, the demo script covers the golden path, both rehearsals run, and A records the backup video; G3 is Done.
- Status: pending

## G4 — Presentation day

- Cell / day: H28 / Day 7
- Hard waits: G3 (H27)
- Soft waits / fallback: DEMO_SAFE_MODE and the backup video.
- Merge: no.
- Done when (copied): C drives the five-to-six-minute demo through prompt, plan, parts, gated checkpoint, retry/3D beat, and completion, while A holds the fallback controls.
- Status: pending
