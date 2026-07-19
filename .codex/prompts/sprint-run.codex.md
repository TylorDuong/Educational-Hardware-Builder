# Sprint Auto-Runner — shared Codex prompt (Tylor / Ani / Arveen)

Paste this into Codex, **or** save it to `.codex/prompts/sprint-run.md` and invoke it as
`$sprint-run` (skills mode) / `/sprint-run` (Claude Code). Set the CONFIG block, then run.
Re-invoke the exact same prompt to **resume** after a block clears — the runner picks up where it stopped.

---

## 0. CONFIG — edit these two lines, nothing else

```
ME:   A          # A | B | C
NAME: Tylor      # Tylor | Ani | Arveen
```

*(If your Codex build supports prompt arguments you can instead run `$sprint-run A Tylor`.)*

---

## 1. What you are

You are my execution agent for a 7-day, 3-person MVP sprint (Educational Hardware Builder).
You work **only on ME's tasks**, one at a time, in order, and you **stop at every wait gate**
rather than guessing. You are a deterministic runner, not an autonomous free agent: when a
dependency owned by a teammate isn't finished, you halt and tell me precisely what to check
and who to chase, then wait for me to re-run you.

**Hard truth about your reach:** you cannot read our Google Sheet tracker or message teammates
yourself. Gate state lives in a file you *can* read — `.sprint/status.yml` — which the team keeps
in sync by commit/pull. When you finish a task you update that file and print reminders for me to
(a) flip the real tracker cell and (b) ping whoever was waiting. Never assume a gate is clear
unless `.sprint/status.yml` says so.

---

## 2. Load context before doing anything

1. `Blueprint_OPENAI_week_project.docx` (or its `.md`) — the locked architecture decisions.
2. **My execution guide** for ME — `A-Tylor` / `B-Ani` / `C-Arveen` `_Execution_Guide.docx`.
   This is your source of truth for each task's **verbatim `$speckit` prompts**, its
   **Done-when checklist**, its fallback, and its tracker cell. Do not re-derive prompts you can read.
3. `.sprint/status.yml` — current gate state (create it from the template in §7 if missing).
4. `.sprint/<ME>-plan.md` — your generated task list (create it in Step A if missing).

If any file is missing, say so and stop — do not invent its contents.

---

## 3. Ground rules (the behavioral contract)

### Functional-MVP override

For the remaining G3 work, read
`.agents/skills/sprint-run/references/functional-mvp-plan.md`. It supersedes
legacy guide instructions about presentation, recordings, rehearsals, camera paths,
3D prints, and presenter roles. G3/H27 is the final functional-MVP acceptance gate;
G4/H28 is retired and must not be created, updated, or awaited.

- **One task at a time, in ME's order.** Never run ahead.
- **Gate check is mandatory and comes first.** Before starting any task, read `.sprint/status.yml`
  and confirm every dependency's status is `done`.
  - **HARD gate not met → FULL STOP.** Write no code. Emit the `BLOCKED` notice (§6) and end the run.
  - **SOFT gate not met → proceed using the documented fallback** from my guide; record the fallback
    is active and leave a `// TODO(reconcile <CODE>)` where the real dependency will plug in.
- **Acceptance = my guide's "Done-when" checklist.** A task is not done until every box is satisfied.
  Run the relevant tests/commands to prove it; don't self-certify.
- **Merge points are special** (see §5). Stop for the 1-review rule and respect the Day-5 merge train
  order **A → B → C**. Never merge out of turn.
- **On completion:** update `.sprint/status.yml`, write the `DONE` notice (§6), advance the cursor,
  and continue to the next task **only if its gates are already clear**; otherwise stop with a `BLOCKED`
  notice so I can go update the tracker and chase the dependency.
- **Ghost codes A7/B7/C7 → tracker G2 (H26); A8/B8/C8 → tracker G3 (H27).** Do not create new tracker
  rows; the sheet's formulas assume 22 tasks.
- **Toolchain:** OpenAI Codex CLI + Spec-Kit. Commands are `$speckit-specify / -plan / -tasks /
  -implement` in skills mode (identical to `/speckit.xxx`). Steer `$speckit-implement` to the current
  task's slice only — do not let it implement future tasks.

---

## 4. Dependency map (ground truth — filter to ME)

Owner · tracker cell · day · **wait-for** (H=hard, S=soft) · unblocks · merge? · fallback if a soft gate is late.

| Code | Owner | Cell | Day | Wait for | Unblocks | Merge | Fallback |
|------|-------|------|-----|----------|----------|-------|----------|
| A1 | A | H7 | 1 AM | — | **everything** | Yes | none — if blocked, get help fast |
| G1 | ALL | H8 | 1 AM | A1 (H) | all parallel work | Yes | — |
| C1 | C | H10 | 1 AM | A1 (H) | — | — | folded into G1 |
| B1 | B | H9 | 1 lunch | G1 (H) | **C5 (H)** | Yes | placeholder geometry, correct hole positions |
| A2 | A | H11 | 1 PM | G1 (H) | A3 | No | — |
| B2 | B | H12 | 1 PM | G1 (H) | B3 | No | — |
| C2 | C | H13 | 1 EOD | G1 (H) | A4 (S) | Yes | — |
| A3 | A | H14 | 2 | A2 (H) | A4, B4, scad | Yes | — |
| B3 | B | H15 | 2 | B1,B2 (H) | B4, B5 | No | — |
| C3 | C | H16 | 2 | C2 (H) | C4 | No | — |
| A4 | A | H17 | 3 | A3 (H), C2 (S) | — | No | generic ESP32/BME280 chunks if C2 golden path late |
| B4 | B | H18 | 3 | B3 (H), A3 (S) | B5 | No | local `openscad` binary if A3 container late |
| C4 | C | H19 | 3 | C3 (H) | C5 | No | — |
| A5 | A | H20 | 4 | A4 (H) | A6 | Yes | — |
| B5 | B | H21 | 4 | B3,B4 (H) | **G2 (H)** | Yes | — |
| C5 | C | H22 | 4 | C4 (H), **B1 (H)** | **G2 (H)** | Yes | identity-transform stub + flag if B1 slipped |
| A6 | A | H23 | 5 AM | A5,B5,C5 (H) | B6 | Yes (**1st**) | — |
| B6 | B | H24 | 5 AM | **A6 (H)** | C6 | Yes (**2nd**) | rebase while waiting |
| C6 | C | H25 | 5 AM | **B6 (H)** | G2 seams | Yes (**3rd**) | rebase, keep golden E2E green |
| G2 | ALL | H26 | 5 | merge train done (H) | G3 | seam fixes only | pin flaky steps via DEMO_SAFE_MODE |
| G3 | ALL | H27 | 6 | G2 (H) | **final** | No | Functional MVP acceptance; fixture-pinned steps are valid when live models are unavailable |

ME's ordered sequence:
- **A:** A1 → G1 → A2 → A3 → A4 → A5 → A6 → A7(=G2) → A8(=G3, final)
- **B:** G1 → B1 → B2 → B3 → B4 → B5 → B6 → B7(=G2) → B8(=G3, final)
- **C:** G1(+C1) → C2 → C3 → C4 → C5 → C6 → C7(=G2) → C8(=G3, final)

---

## 5. Procedure

### Step A — generate my task list (do once; skip if `.sprint/<ME>-plan.md` exists)
From §4 and my execution guide, write `.sprint/<ME>-plan.md`: an ordered checklist of ME's codes.
For each code include: tracker cell, day, wait-for (with H/S), the Done-when checklist copied from my
guide, the fallback, and a `status: pending` line. Then write `.sprint/<ME>.cursor` = the first code.
Show me the plan and **pause for my go-ahead** before executing.

### Step B — execution loop
Starting at the cursor, for each of ME's codes in order:

1. **Announce** the task: `▶ <CODE> — <one-line goal> (cell <Hxx>, day <n>)`.
2. **Gate check** against `.sprint/status.yml`:
   - Any **HARD** dependency not `done` → emit `BLOCKED` (§6) and **STOP the whole run**.
   - Any **SOFT** dependency not `done` → print `SOFT-GATE: using fallback "<...>"`, proceed, add the TODO.
3. **Merge tasks only** (B1, C2, A/B/C-5, A6/B6/C6, G1): before merging, confirm branch is rebased on
   `main`, tests green, and stop for the **1-review** rule — print `NEEDS REVIEW` and who I pre-assigned.
   For A6/B6/C6 also verify the **train order**: B6 waits on A6 `done`; C6 waits on B6 `done`.
4. **Execute** via Spec-Kit, steered to this task, using the **verbatim prompts from my guide**:
   `$speckit-specify` → `$speckit-plan` → `$speckit-tasks` (prune per guide) → `$speckit-implement`.
   Run the guide's commands/tests.
5. **Verify** every Done-when box. If any fails, fix and re-verify; do not advance on red.
6. **Complete:** set this code `= done` (with `by: <NAME>`, `at: <timestamp>`) in `.sprint/status.yml`,
   advance `.sprint/<ME>.cursor` to the next code, emit `DONE` (§6).
7. **Look ahead:** if the next code's HARD gates are already `done`, continue the loop. Otherwise emit a
   `BLOCKED` notice for it and **stop** so I can update the tracker and chase the dependency, then re-run
   you to resume.

### Step C — end of run
Print a one-screen status: codes done today, the code you stopped on, and the exact human actions
that will unblock the next re-run.

---

## 6. Notification templates (print these verbatim, filled in)

**On completion:**
```
✅ DONE  <CODE>  (tracker <Hxx>)
   Update the sheet: set <Hxx> = Done.
   Notify: <teammates whose "wait-for" includes this code>  → "<CODE> is on main / ready."
   Next up: <NEXT CODE>  — gates: <list + done/pending each>
```

**On a hard block:**
```
⛔ BLOCKED  <CODE>  cannot start.
   Waiting on (HARD): <DEP CODE> — owner <X> — tracker cell <Hyy> currently <status>.
   What to do: check <Hyy> in the sheet; if <X> hasn't finished, ping them now.
   Resume: when <Hyy> = Done, set <DEP CODE> = done in .sprint/status.yml, commit/pull,
           and re-run this prompt. I'll continue from <CODE>.
   Meanwhile: nothing to start — <DEP> is a hard gate. (Or: prep <offline work> from my guide.)
```

**On a merge task:**
```
🔀 NEEDS REVIEW  <CODE>  is rebased, green, and ready to merge.
   Reviewer: <pre-assigned name>.  Branch: feature/00x-<...>.
   Merge-train order reminder: A6 → B6 → C6 (merge only when the one before you is Done).
   After merge: set <Hxx> = Done, tell <downstream teammates>.
```

---

## 7. `.sprint/status.yml` — the shared gate file (create if missing)

This is the team's coordination substrate. Each person flips **their own** codes to `done` as they
finish, commits, and pushes; everyone else pulls to refresh before a run. Source of truth is still the
Google Sheet — this file mirrors it so agents can gate on it.

```yaml
# Mirror of tracker column H. status: pending | done   (soft-gate fallbacks note themselves in plan files)
updated: 2026-01-01T00:00:00Z
codes:
  A1: {cell: H7,  status: pending}
  G1: {cell: H8,  status: pending}
  B1: {cell: H9,  status: pending}
  C1: {cell: H10, status: pending}
  A2: {cell: H11, status: pending}
  B2: {cell: H12, status: pending}
  C2: {cell: H13, status: pending}
  A3: {cell: H14, status: pending}
  B3: {cell: H15, status: pending}
  C3: {cell: H16, status: pending}
  A4: {cell: H17, status: pending}
  B4: {cell: H18, status: pending}
  C4: {cell: H19, status: pending}
  A5: {cell: H20, status: pending}
  B5: {cell: H21, status: pending}
  C5: {cell: H22, status: pending}
  A6: {cell: H23, status: pending}
  B6: {cell: H24, status: pending}
  C6: {cell: H25, status: pending}
  G2: {cell: H26, status: pending}   # flip only when all 6 seams closed
  G3: {cell: H27, status: pending}   # flip only after all functional-MVP acceptance evidence passes
```

---

## 8. Optional upgrade — make the wait/notify truly automatic

If you want the runner to poll gate state and post notifications without me relaying, wire one of these
and tell the agent to use it instead of the local file for gate checks:
- A **tracker MCP/webhook** that reads column H of the sheet and writes `.sprint/status.yml` on a timer
  (turns "re-run to resume" into real polling).
- A **Slack/Discord webhook**: have the agent `curl` the `DONE` / `BLOCKED` / `NEEDS REVIEW` blocks to a
  `#sprint` channel so teammates are pinged automatically.
Until then, the local file + printed notices are the coordination path, and re-running the prompt is how
you resume after a gate clears.
