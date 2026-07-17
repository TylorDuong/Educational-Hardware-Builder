---
name: sprint-run
description: Execute or resume one owner’s gated task sequence for the Educational Hardware Builder 7-day MVP sprint. Use when coordinating sprint owner A/Tylor, B/Ani, or C/Arveen: gate checks, guide-driven Spec-Kit work, merge review stops, and .sprint/status.yml updates.
---

# Sprint Runner

Run exactly one owner’s sequence. Do not infer gates, read external trackers, contact teammates, or start future tasks.

## Context

Obtain `ME` (`A`, `B`, or `C`) and `NAME`; ask if either is absent. Before every run, read the project blueprint, matching execution guide, `.sprint/status.yml`, and any `.sprint/<ME>-plan.md` / `.sprint/<ME>.cursor`. Stop and name a missing blueprint or guide.

The guide is authoritative for verbatim Spec-Kit prompts, Done-when checks, fallback, tracker cell, offline preparation, and reviewer. Read [coordination reference](references/sprint-coordination.md) for sequences, dependencies, merge tasks, and the status template.

## First run

If the plan is missing, create `.sprint/<ME>-plan.md` from the owner sequence and guide. Each code needs cell, day, hard/soft waits, copied Done-when list, fallback, and `status: pending`. Set `.sprint/<ME>.cursor` to its first code, show the plan, and stop for explicit approval.

## Execution

At the cursor:

1. Announce `▶ <CODE> — <goal> (cell <Hxx>, day <n>)`.
2. Re-read the status file. If any hard gate is not `done`, emit `BLOCKED` and end without code changes. For a soft gate, announce and use its fallback; add `TODO(reconcile <CODE>)` at the integration point.
3. For merge tasks, verify the branch is rebased on `main` and green, emit `NEEDS REVIEW`, then stop. Never merge without review. Enforce A6 → B6 → C6.
4. Run the guide’s exact current-task-only Spec-Kit sequence: specify, plan, tasks (prune as directed), implement. Verify every Done-when item and fix failures.
5. Mark the code `done` in `.sprint/status.yml` with `by: <NAME>` and an ISO-8601 `at` timestamp; advance the cursor and emit `DONE`.
6. Continue only when the next code’s hard gates are done; otherwise emit `BLOCKED` and end.

Do not add tracker rows: A7/B7/C7 = G2/H26; A8/B8/C8 = G3/H27. Finish with codes done today, cursor, and precise human action to resume.

## Notices

```
✅ DONE  <CODE>  (tracker <Hxx>)
   Update the sheet: set <Hxx> = Done.
   Notify: <downstream teammates> → <CODE> is on main / ready.
   Next up: <NEXT CODE> — gates: <list + done/pending each>
```

```
⛔ BLOCKED  <CODE>  cannot start.
   Waiting on (HARD): <DEP CODE> — owner <X> — tracker cell <Hyy> currently <status>.
   What to do: check <Hyy> in the sheet; if <X> has not finished, ping them now.
   Resume: when <Hyy> = Done, set <DEP CODE> = done in .sprint/status.yml, commit/pull,
           and re-run $sprint-run. I will continue from <CODE>.
```

```
🔄 NEEDS REVIEW  <CODE>  is rebased, green, and ready to merge.
   Reviewer: <pre-assigned name>. Branch: <branch>.
   Merge-train order reminder: A6 → B6 → C6.
   After merge: set <Hxx> = Done, tell <downstream teammates>.
```
