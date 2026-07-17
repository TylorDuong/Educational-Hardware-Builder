# Owner A — Tylor: Sprint Execution Plan

Status file: `.sprint/status.yml`  
Cursor: `.sprint/A.cursor`

## A1 — Create and push the repo

- Cell / day: H7 / Day 1, first hour
- Hard waits: none
- Soft waits / fallback: none; if GitHub auth or organization permissions block progress for 20 minutes, ask for help.
- Merge: yes — creates `main`.
- Done when (copied): B and C can `git clone` and `pnpm install` succeeds on their machines; `main` is protected; the workspace folders exist; A1 is Done in the tracker.
- Status: pending

## G1 — Contract sprint (chair)

- Cell / day: H8 / Day 1, hours 2–3
- Hard waits: A1 (H7)
- Soft waits / fallback: none.
- Merge: yes — constitution, schemas, mocks, and fixtures land on `main`; C simultaneously completes C1 (H10).
- Done when (copied): Constitution + schemas + mocks + fixtures are on main; three feature branches exist; G1 and C1 are Done.
- Status: pending

## A2 — Spec-Kit prompts and compose skeleton

- Cell / day: H11 / Day 1 afternoon
- Hard waits: G1 (H8)
- Soft waits / fallback: none.
- Merge: no — stays on `feature/001-platform-data`.
- Required Spec-Kit sequence: specify with the guide's platform prompt; plan with its monorepo/compose prompt; tasks (prune n8n, scheduled pipelines, health page, and live-smoke polish); implement only the compose skeleton slice.
- Done when (copied): `docker compose up` yields healthy Postgres and `ollama list` answers inside the container; `spec.md`, `plan.md`, and pruned `tasks.md` are committed on the branch.
- Status: pending

## A3 — Migrations, model init, and schemas package

- Cell / day: H14 / Day 2
- Hard waits: A2 (H11)
- Soft waits / fallback: none.
- Merge: yes — review by B or C, then merge to `main`.
- Required Spec-Kit sequence: continue implement only migration/model-init/schema tasks from A2's approved artifacts.
- Done when (copied): A fresh clone plus `docker compose up` yields a migrated DB, pulled models, and an answering OpenSCAD service; B and C import `packages/schemas` from main (confirmed at next standup); A3 is Done in the tracker.
- Status: pending

## A4 — Curate and seed knowledge corpus

- Cell / day: H17 / Day 3
- Hard waits: A3 (H14)
- Soft waits / fallback: C2 (H13); seed generic ESP32/BME280 chunks now and align them to C's golden StepPlan when it arrives. Add `TODO(reconcile A4)` at the integration point.
- Merge: no.
- Required Spec-Kit sequence: specify, plan, tasks, then implement only corpus/seed work; use the guide's required citation and versioned-upsert constraints.
- Done when (copied): at least 50 embedded, cited chunks are in the DB; the seed script re-runs cleanly (idempotent).
- Status: pending

## A5 — Retrieval API and health endpoint

- Cell / day: H20 / Day 4
- Hard waits: A4 (H17)
- Soft waits / fallback: none; cut health page, n8n, chunk count, then CI polish before missing the merge.
- Merge: yes — reviewed and merged to `main` by EOD.
- Required Spec-Kit sequence: specify, plan, tasks, then implement only retrieval and JSON health endpoint work.
- Done when (copied): the BME280-to-ESP32 curl test passes against a fresh `docker compose up`; merged to main; A5 Done. B5 and C5 should be landing the same evening.
- Status: pending

## A6 — Merge first in the train

- Cell / day: H23 / Day 5 morning
- Hard waits: A5 (H20), B5 (H21), C5 (H22)
- Soft waits / fallback: none; protect the A6 → B6 → C6 order.
- Merge: yes — first; reviewer must be pre-arranged (B or C).
- Done when (copied): feature branch is rebased on `main`; merge lands; migrations against a clean DB and contract tests pass; A6 is Done and B is notified to merge next.
- Status: pending

## A7 — Integration share: seams 1–2 and demo reset

- Cell / day: H26 (G2) / Day 5
- Hard waits: C6 (H25; merge train complete)
- Soft waits / fallback: none; integration may fix seams but must not add scope.
- Merge: seams-only integration fixes may merge.
- Required Spec-Kit sequence: on `feature/004-integration`, specify with the guide's integration prompt, tasks, then implement only the paired integration checklist.
- Done when (copied): real retrieval replaces the agent mock and displays honest citations; inventory/parts mocks use real tables; `scripts/demo-reset.sh` wipes, reseeds, and warms models in under one minute; stopping Ollama mid-build degrades to fixture content instead of crashing; all six team seams are closed and C has made the live/fixture call, then G2 is Done.
- Status: pending

## A8 — Demo operations and backup recording

- Cell / day: H27 (G3) / Day 6
- Hard waits: G2 (H26)
- Soft waits / fallback: pin unreliable steps to fixture via `DEMO_SAFE_MODE`; if rehearsal 1 fails, capture the backup in rehearsal 2.
- Merge: no.
- Done when (copied): all four models are pre-pulled; reset script and `DEMO_SAFE_MODE` work end-to-end on the demo machine; two rehearsals run; a screen-and-audio backup is stored locally and in drive/cloud; B's 3D print has started; G3 is Done.
- Status: pending

## G4 — Presentation day

- Cell / day: H28 / Day 7
- Hard waits: G3 (H27)
- Soft waits / fallback: `DEMO_SAFE_MODE` or backup video.
- Merge: no.
- Done when (copied): A opens the local-first pitch, runs reset/demo-safe operations during C's demo, has the backup video ready, and hands off for B's 3D moment.
- Status: pending
