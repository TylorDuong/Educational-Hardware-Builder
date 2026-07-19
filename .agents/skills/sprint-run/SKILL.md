---
name: sprint-run
description: Execute or resume the single-developer Agentic Build Discovery queue from specs/006-agentic-build-discovery/tasks.md.
---

# Single-Developer Agentic Build Discovery Runner

Run the active discovery queue for one developer. The source of truth is
`specs/006-agentic-build-discovery/tasks.md`. The completed A/B/C and
superseded `005-authored-build` artifacts are read-only history.

## Context

Obtain `NAME`; ask for it if absent. Before every run, read:

1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `specs/006-agentic-build-discovery/spec.md`
4. `specs/006-agentic-build-discovery/plan.md`
5. `specs/006-agentic-build-discovery/tasks.md`
6. `specs/006-agentic-build-discovery/research.md`
7. `specs/006-agentic-build-discovery/data-model.md`
8. `specs/006-agentic-build-discovery/contracts/` and `quickstart.md`
9. `.sprint/agentic-build-discovery.cursor` when it exists

Never update `.sprint/status.yml` or treat `specs/005-authored-build` as active.

## Work branch and scope

Use `codex/authored-build` and target `main` for the final pull request. Before
implementation, emit:

```
WORK ORDER  <TASK ID> — <developer name>
  Complete: <task text from specs/006-agentic-build-discovery/tasks.md>.
  Work branch: codex/authored-build; eventual PR target: main.
  Before coding: git fetch origin; git switch codex/authored-build; git rebase origin/main.
```

Preserve local-only learner requests, background-only external ingestion,
strictly typed/cited model boundaries, hard safety blocks, solver-owned
transforms, five tabs, server-side checkpoints, and `DEMO_SAFE_MODE`.

## First run

If `.sprint/agentic-build-discovery.cursor` is missing, create it with the first
unchecked task ID, report the task outline, and stop for explicit approval
before changing implementation files.

## Execution loop

1. Read the cursor and locate its unchecked checklist item. If checked, advance
   to the next unchecked item.
2. Confirm all prior non-parallel checklist items are checked. If a prerequisite
   is incomplete, emit `BLOCKED`, name it, and end without code changes.
3. Emit the work order, read the named files, and complete only the current item.
4. Run the narrowest task-relevant verification. Schema, ingestion, safety,
   model, server, workshop, solver, and UI changes require the focused tests
   specified by the task and must preserve GPU-free execution.
5. Require command output for local checks and explicit developer confirmation
   for browser, Docker/n8n, local-model smoke, hardware, and pull-request checks.
6. When evidence passes, change only the current marker to `- [x]`, write the
   next unchecked ID (or `DONE`) to `.sprint/agentic-build-discovery.cursor`, and
   emit `DONE`.
7. Continue only to a documentation/planning task with no new approval boundary.
   After implementation, test, browser, Docker/n8n, local-model, or PR tasks,
   stop and ask the developer to rerun `$sprint-run NAME=<developer name>`.

## Completion evidence

Treat returned developer results as evidence for the active task. Re-read the
task, map each stated result to acceptance needs, and run any safe narrow local
check still missing. Do not substitute a unit test for required human evidence.
T033, T034, T035, and T036 require their explicit developer confirmations.

## Notices

```
✅ DONE  <TASK ID>
   Evidence: <commands or explicit confirmation>.
   Updated: specs/006-agentic-build-discovery/tasks.md and .sprint/agentic-build-discovery.cursor.
   Next: <next task ID and exact checklist text, or DONE>.
```

```
⛔ BLOCKED  <TASK ID>
   Waiting on: <prior task ID or named approval/evidence>.
   What to do: <one concrete developer action>.
   Resume: re-run $sprint-run NAME=<developer name> after it is complete.
```
