---
name: sprint-run
description: Execute or resume one owner’s gated task sequence for the Educational Hardware Builder 7-day MVP sprint. Use when coordinating sprint owner A/Tylor, B/Ani, or C/Arveen: gate checks, guide-driven Spec-Kit work, merge review stops, and .sprint/status.yml updates.
---

# Sprint Runner

Run exactly one owner’s sequence. Do not infer gates, read external trackers, contact teammates, or start future tasks. Do state the exact message the owner must send; the human, not the agent, sends it.

## Context

Obtain `ME` (`A`, `B`, or `C`) and `NAME`; ask if either is absent. Before every run, read the project blueprint, matching execution guide, `.sprint/status.yml`, and any `.sprint/<ME>-plan.md` / `.sprint/<ME>.cursor`. Stop and name a missing blueprint or guide.

The guide is authoritative for verbatim Spec-Kit prompts, Done-when checks, fallback, tracker cell, offline preparation, and reviewer. Read [coordination reference](references/sprint-coordination.md) for sequences, dependencies, merge tasks, and the status template.

## Owner branches and GitHub workflow

Use this active branch roster. The feature-named branches from the original planning documents are historical unless explicitly listed here; do not silently switch to them.

| Owner | Name | Active branch | History branches not for new sprint work |
| --- | --- | --- | --- |
| A | Tylor | `Tylor-A` | `feature/001-platform-data` |
| B | Ani | `Ani-B` | `feature/002-spatial-3d` |
| C | Arveen | `feature/003-agents-ux` | `Arveen-C`, `feature/003-agents-workshop` |

Before executing a code, emit this work order and require its branch:

```
WORK ORDER  <CODE> — <owner name>
  Complete: <current task goal from the owner guide>.
  Work branch: <active owner branch>; GitHub PR target: main.
  Before coding: git fetch origin; git switch <branch>; git rebase origin/main.
```

For every merge task, stop after the active branch is rebased and checks pass. Tell the owner to push it, open a GitHub PR **from the listed work branch into `main`**, obtain the guide’s reviewer approval, and only then merge. After a GitHub merge, tell the owner to run `git switch main` and `git pull --ff-only origin main` before updating the tracker. A non-merge task remains on the owner branch and is pushed for recovery/review; it is not merged to `main` early.

For G2, use `feature/004-integration` created from current `main`; integration changes are seams-only. Do not create it before C6 completes. For G3/G4, work from current `main` unless a narrowly scoped fix needs a reviewed branch.

## Mandatory human handoffs

Every `DONE`, `BLOCKED`, and `NEEDS REVIEW` notice must name a person, their next code, and the branch they must use. Use these exact merge-train messages:

| Event | Tell the completing owner to message | Required next task and branch |
| --- | --- | --- |
| C5 merged | Tylor | `C5 is merged to main. Complete A6 — first merge in the train — on Tylor-A; rebase on main first.` |
| A6 merged | Ani | `A6 is merged to main. Complete B6 — second merge in the train — on Ani-B; rebase on main first.` |
| B6 merged | Arveen | `B6 is merged to main. Complete C6 — final merge in the train — on feature/003-agents-ux; rebase on main first.` |
| C6 merged | Tylor, Ani, and Arveen | `The merge train is complete. Begin your G2 share only after switching to main; use feature/004-integration only for seams-only fixes.` |
| G2 done | Tylor, Ani, and Arveen | `G2 is done. Complete your G3 share from current main: A8 demo ops, B8 performance/print, C8 prompt tuning and rehearsals.` |
| G3 done | Tylor, Ani, and Arveen | `G3 is done. Switch to current main for G4: Tylor opens and runs fallback controls; Arveen drives the demo; Ani owns the 3D moment.` |

For earlier dependency completions, use the coordination reference to identify every downstream owner, then state: `Message <name>: <CODE> is done on main / ready. Your next task is <NEXT CODE> on <branch>.` If a dependency blocks the cursor, state: `Message <blocking owner>: please complete <DEP CODE> on <branch>, push it, and merge its reviewed PR into main; I will resume <CODE> after that.`

## First run

If the plan is missing, create `.sprint/<ME>-plan.md` from the owner sequence and guide. Each code needs cell, day, hard/soft waits, copied Done-when list, fallback, and `status: pending`. Set `.sprint/<ME>.cursor` to its first code, show the plan, and stop for explicit approval.

## Execution

At the cursor:

1. Announce the required `WORK ORDER`, then `▶ <CODE> — <goal> (cell <Hxx>, day <n>)`.
2. Re-read the status file. If any hard gate is not `done`, emit `BLOCKED` and end without code changes. For a soft gate, announce and use its fallback; add `TODO(reconcile <CODE>)` at the integration point.
3. For merge tasks, verify the listed active branch is rebased on `origin/main` and green, emit `NEEDS REVIEW` with the PR source branch and `main` target, then stop. Never merge without review. Enforce A6 → B6 → C6.
4. Run the guide’s exact current-task-only Spec-Kit sequence: specify, plan, tasks (prune as directed), implement. Verify every Done-when item and fix failures.
5. Mark the code `done` in `.sprint/status.yml` with `by: <NAME>` and an ISO-8601 `at` timestamp; advance the cursor and emit `DONE`.
6. Continue only when the next code’s hard gates are done; otherwise emit `BLOCKED` and end.

Do not add tracker rows: A7/B7/C7 = G2/H26; A8/B8/C8 = G3/H27. Finish with codes done today, cursor, and precise human action to resume.

## Notices

```
✅ DONE  <CODE>  (tracker <Hxx>)
   Update the sheet: set <Hxx> = Done.
   Human message to send: <named teammate> → <CODE> is on main / ready. Complete <NEXT CODE> on <branch>.
   Next up: <NEXT CODE> — gates: <list + done/pending each>
```

```
⛔ BLOCKED  <CODE>  cannot start.
   Waiting on (HARD): <DEP CODE> — owner <X> — tracker cell <Hyy> currently <status>.
   What to do: check <Hyy> in the sheet; if <X> has not finished, message <X>: complete <DEP CODE> on <branch>, push it, and merge its reviewed PR into main.
   Resume: when <Hyy> = Done, set <DEP CODE> = done in .sprint/status.yml, commit/pull,
           and re-run $sprint-run. I will continue from <CODE>.
```

```
🔄 NEEDS REVIEW  <CODE>  is rebased, green, and ready to merge.
   Reviewer: <pre-assigned name>. PR: <branch> → main. After GitHub merge, switch to main and pull `origin/main`.
   Merge-train order reminder: A6 → B6 → C6.
   After merge: set <Hxx> = Done, tell <downstream teammates>.
```
