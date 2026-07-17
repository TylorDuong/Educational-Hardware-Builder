---
name: sprint-run
description: Execute or resume one owner’s gated task sequence for the Educational Hardware Builder 7-day MVP sprint. Use when coordinating sprint owner A/Tylor, B/Ani, or C/Arveen: gate checks, guide-driven Spec-Kit work, merge review stops, and .sprint/status.yml updates.
---

# Sprint Runner

Run exactly one owner’s sequence. Do not infer gates, read external trackers, contact teammates, or start future tasks.

## Context

Obtain `ME` (`A`, `B`, or `C`) and `NAME`; ask if either is absent. Before every run, read the project blueprint, matching execution guide, `.sprint/status.yml`, and any `.sprint/<ME>-plan.md` / `.sprint/<ME>.cursor`. Stop and name a missing blueprint or guide.

The guide is authoritative for verbatim Spec-Kit prompts, Done-when checks, fallback, tracker cell, offline preparation, and reviewer. Read [coordination reference](references/sprint-coordination.md) for sequences, dependencies, merge tasks, and the status template.

## Branches, sync, and communication

Keep `main` protected and releasable. Never commit directly to it or merge without the required
review. Use the guide's branch when it names one; otherwise use:

- `feature/000-contracts` for G1;
- `feature/001-platform-data` for A;
- `feature/002-spatial-3d` for B;
- `feature/003-agents-ux` for C; and
- `feature/004-integration` for G2 seam work.

Before code changes, inspect `git status --short --branch`. Preserve and name unrelated user
changes; never stash, discard, commit, or overwrite them. Fetch and fast-forward local `main`
from `origin/main`, create or switch to the task branch, and rebase it on `origin/main` before
review. If a rebase conflicts, stop without force-pushing and tell the user the conflicting files
and the exact human decision required.

For every pushed branch, tell the user the branch, commit or PR URL when available, checks and
results, reviewer, downstream owners, and next human action. Do not message teammates yourself;
print ready-to-send text. On a cursor stopped at `NEEDS REVIEW`, fetch `origin/main` on the next
run and treat the task as merged only if its reviewed branch tip is an ancestor of `origin/main`.
A pushed branch, verbal claim, or green check alone is not proof of merge.

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

## Git and status execution rules

Apply these rules before and after the numbered execution steps; they override a conflicting
generic instruction above.

- Announce the active branch and whether it is current with `origin/main` when starting a code.
- For a merge task, after every Done-when item passes, stage its `.sprint/status.yml` completion
  and cursor advance in the review branch, commit and push it, then emit `NEEDS REVIEW`. Do not
  emit `DONE` or tell the user to update the sheet until a later run verifies the merge.
- After a verified merge, `origin/main` is the shared status source. Confirm the merged status and
  cursor, then emit `DONE` with the tracker and ready-to-send downstream message.
- For a non-merge task, update only the owner's code in `.sprint/status.yml`, commit and push the
  coordination update on the owner branch, and explicitly name the branch that dependent owners
  must pull before relying on its gate.
- Never mark another person's code. Shared codes require all named shares to be complete: C1
  before G1, all three shares before G2 and G3.
- Never change the external tracker. Tell the user its exact cell and required value.

Use these exact human-action lines in every relevant notice:

```
Send reviewer: "Please review <CODE> on <BRANCH>. Checks passed: <CHECKS>. Merge when approved,
then set <Hxx> = Done and announce it is on main."
```

```
Send downstream owner: "<CODE> is on main / ready on <BRANCH>. Pull <main / BRANCH>, refresh
.sprint/status.yml, then continue with <NEXT CODE>."
```

```
Send blocking owner: "<DEP CODE> is blocking <CODE>. Please merge or push its status update,
set <Hyy> = Done, and tell me which branch to pull."
```

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
