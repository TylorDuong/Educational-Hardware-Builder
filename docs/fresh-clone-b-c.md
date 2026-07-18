# Fresh-clone guide: B and C programmers

Use this guide if you have just cloned `main` and are joining the spatial/3D (B) or agents/Workshop (C) sprint work. It gives you a clean local baseline, the correct existing branch, and the next task you may work on.

## 1. Install the required tools

Install and sign into these before cloning:

- Git and GitHub CLI (`gh`), with push access to this repository.
- Node.js 22 LTS and Corepack (pnpm 11.9.0).
- Docker Desktop with Compose enabled.
- OpenAI Codex CLI, signed in with `codex login`.
- Python 3.11+ for the seed script.
- OpenSCAD desktop app if you are working B's local compile fallback.

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
gh auth login
npm install -g @openai/codex
codex login
```

## 2. Clone `main` and prove the baseline

```powershell
git clone https://github.com/TylorDuong/Educational-Hardware-Builder.git
Set-Location Educational-Hardware-Builder
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile

pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/scad-service test
```

Use the Docker stack for real retrieval, live local models, or the OpenSCAD service. The first model pull takes time and significant disk space.

```powershell
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml exec ollama ollama list
```

Stop it when finished with `docker compose -f infra/docker-compose.yml down`.

## 3. Choose your role and branch

Fetch the team branches before switching. Do **not** create a new branch for the active task—continue the assigned owner branch.

| Role | Owner branch | Fresh-clone branch command | Current task |
| --- | --- | --- | --- |
| B — spatial/3D | `Ani-B` | `git switch --track origin/Ani-B` | B6 — second merge in the train; hard-waiting on A6 |
| C — agents/Workshop | `feature/003-agents-ux` | `git switch --track origin/feature/003-agents-ux` | C5 — Assembly agent and full mock flow; ready to complete |

Run this immediately after switching, and again before opening a PR:

```powershell
git fetch origin --prune
git rebase origin/main
```

If `git switch --track` reports that the local branch already exists, use `git switch Ani-B` for B or `git switch feature/003-agents-ux` for C, then rebase it as above.

## 4. Run Sprint Runner

Start Codex from the repository root and give it the command for your role:

```text
$sprint-run ME=B NAME=Ani
```

```text
$sprint-run ME=C NAME=Arveen
```

Sprint Runner is authoritative for the current cursor, gate checks, Spec-Kit steps, completion criteria, and required messages. Do not edit `.sprint/status.yml` manually or begin a hard-gated task early.

## 5. Your immediate work

### C programmer — complete C5 now

On `feature/003-agents-ux`, complete C5 only:

- Build the symbolic Assembly-to-solver retry path and reject coordinate leaks.
- Complete checkpoint grading, the full weather-station mock flow, and targeted UI/SSE polish.
- Verify the web tests, especially the agent and fixture paths:

  ```powershell
  pnpm --filter @educational-hardware-builder/web test
  pnpm --filter @educational-hardware-builder/web typecheck
  pnpm --filter @educational-hardware-builder/web build:sandbox
  ```

- Push the branch, open a reviewed GitHub PR **from `feature/003-agents-ux` into `main`**, and merge only after approval and green checks.
- After merge, switch to `main` and synchronize it:

  ```powershell
  git switch main
  git pull --ff-only origin main
  ```

Message Tylor: `C5 is merged to main. Complete A6 — first merge in the train — on Tylor-A; rebase on main first.`

### B programmer — prepare B6, then wait

B6 has a hard wait on A6. Until Tylor confirms A6 is merged, do not change sprint code or update tracker status. You may rebase `Ani-B` on current `main`, run the focused checks, and resolve existing conflicts locally.

```powershell
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/scad-service test
pnpm --filter @educational-hardware-builder/web build:sandbox
```

When Tylor messages that A6 is merged, rebase `Ani-B` on updated `main`, verify the solver golden tests, then push a reviewed PR **from `Ani-B` into `main`**. After it merges, switch to and pull `main`, then message Arveen:

`B6 is merged to main. Complete C6 — final merge in the train — on feature/003-agents-ux; rebase on main first.`

## 6. Merge-train rule

The order cannot change:

```text
C5 → main
A6 (Tylor-A) → main
B6 (Ani-B) → main
C6 (feature/003-agents-ux) → main
```

For every merge, rebase on the latest `origin/main`, run role-appropriate checks, push with `git push --force-with-lease` if rebasing changed published history, and merge through a reviewed GitHub PR. Once C6 lands, start G2 only from current `main`; any seams-only integration fixes use `feature/004-integration`.

## 7. Guardrails

- Keep cross-package contracts in `packages/schemas` Zod-validated; change mocks and fixtures alongside any schema change.
- Model output must be structured, cited, and never contain raw coordinates or transform matrices.
- Checkpoint gating belongs on the server, not only in the UI.
- Preserve `DEMO_SAFE_MODE`; tests must not require a GPU, Docker, or live Ollama.
- Do not commit `.env` files, generated output, `node_modules`, Docker volumes, or unrelated changes.
