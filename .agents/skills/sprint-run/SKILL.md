---
name: sprint-run
description: Execute or resume the single-developer Second Authored Beginner Build task queue from specs/005-authored-build/tasks.md.
---

# Single-Developer Authored-Build Runner

Run the active authored-build queue for one developer. The source of truth is `specs/005-authored-build/tasks.md`; do not infer work from the completed A/B/C sprint, old execution guides, or `.sprint/status.yml`.

## Context

Obtain `NAME`; ask for it if absent. Before every run, read:

1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `specs/005-authored-build/spec.md`
4. `specs/005-authored-build/plan.md`
5. `specs/005-authored-build/tasks.md`
6. `specs/005-authored-build/build-brief.md` when it exists
7. `.sprint/authored-build.cursor` when it exists

The historical `.sprint/status.yml`, `A/B/C` plans, owner guides, and G1-G3 artifacts are read-only history. Never update them, recreate their gates, or request a teammate handoff.

## Work branch and scope

Use `codex/authored-build` for implementation and target `main` for a final pull request. If the branch does not exist, tell the developer to create it from current `main`; do not silently work on an old owner branch.

Before implementation, emit:

```
WORK ORDER  <TASK ID> — <developer name>
  Complete: <task text from specs/005-authored-build/tasks.md>.
  Work branch: codex/authored-build; eventual PR target: main.
  Before coding: git fetch origin; git switch codex/authored-build; git rebase origin/main.
```

Do not expand the feature beyond one additional authored beginner build. Preserve the weather-station path, the five-tab UI, cited content, server-side checkpoint gating, `DEMO_SAFE_MODE`, symbolic model boundaries, and solver-owned transforms.

## First run

If `.sprint/authored-build.cursor` is missing, create it with the first unchecked task ID in `specs/005-authored-build/tasks.md`. Report the task outline and stop for explicit approval before changing implementation files.

If `T001` is unchecked, the build brief is the only work allowed. Do not invent the build's components, citations, hazards, CAD metadata, or license; record validated choices in `specs/005-authored-build/build-brief.md` first.

## Execution loop

1. Read the cursor and locate its unchecked checklist item in `specs/005-authored-build/tasks.md`. If it is checked, advance to the next unchecked item.
2. Confirm all prior, non-parallel checklist items are checked. If a prerequisite is incomplete, emit `BLOCKED`, name its task ID, and end without code changes.
3. Emit the `WORK ORDER`, then complete only the current checklist item. Read the files named in the task before editing.
4. Run the narrowest task-relevant verification. For schema, solver, SCAD, web, server, workshop, safety, fixture, or model-boundary changes, add or update the focused test required by the task and preserve GPU-free execution.
5. Require evidence before completion: command output for local checks; explicit developer confirmation for browser, Docker, hardware, or pull-request checks. Never substitute a unit test for a required human confirmation.
6. When evidence passes, change only the current task marker from `- [ ]` to `- [x]` in `specs/005-authored-build/tasks.md`, write the next unchecked ID (or `DONE`) to `.sprint/authored-build.cursor`, and emit `DONE`.
7. Continue to the next task only if it is a documentation or planning task with no new approval boundary. After implementation, test, browser, Docker, or pull-request tasks, stop and ask the developer to re-run `$sprint-run` after reviewing the evidence.

## Completion evidence

When the developer returns results, treat them as evidence for the current task. Re-read the task text, map every stated result to its acceptance need, and run any safe narrow local verification that is still missing. If a required command fails, leave the checklist and cursor unchanged. If all required evidence is explicit and passing, update the checklist and cursor in the same turn.

T027 requires an explicit browser confirmation for both authored paths in `DEMO_SAFE_MODE=true`. T028 requires an explicit developer confirmation that the pull request was prepared; do not claim it was merged unless the developer says so.

## Notices

```
✅ DONE  <TASK ID>
   Evidence: <commands or explicit confirmation>.
   Updated: specs/005-authored-build/tasks.md and .sprint/authored-build.cursor.
   Next: <next task ID and exact checklist text, or DONE>.
```

```
⛔ BLOCKED  <TASK ID>
   Waiting on: <prior task ID or named approval/evidence>.
   What to do: <one concrete developer action>.
   Resume: re-run $sprint-run NAME=<developer name> after it is complete.
```
