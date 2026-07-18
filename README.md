# Educational Hardware Builder

Local-first software for teaching DIY hardware through guided, grounded builds. This is the pre-sprint setup and handoff guide for Tylor (A), Ani (B), and Arveen (C).

## Install before development

Complete this checklist before starting a Sprint Runner task. The project is a pnpm TypeScript monorepo with local Docker services for PostgreSQL/pgvector, Ollama, and headless OpenSCAD.

| Technology | Version / purpose | Verify |
| --- | --- | --- |
| Git | Current version; configure your name and email | `git --version` |
| GitHub account + GitHub CLI | Repository push access and PR review | `gh auth status` |
| Node.js | Node 22 LTS (Node 20+ is supported by the authored specs) | `node --version` |
| pnpm | 11.9.0, via Corepack | `pnpm --version` |
| Docker Desktop / Engine | Docker Compose support for Postgres, Ollama, OpenSCAD, and web | `docker compose version` |
| Python | 3.11+ for the corpus seed script | `python --version` |
| OpenAI Codex CLI | Runs `$sprint-run` and `$speckit-*` | `codex --version` |
| Spec-Kit CLI | Required for Spec-Kit workflow; maintained by Tylor | `specify check` |
| OpenSCAD desktop | Recommended local fallback for Ani's B4 work | `openscad --version` |

Ollama runs inside Docker, so a host Ollama installation is not required. For live models and the demo, use the designated demo machine with a supported GPU and roughly 12–16 GB VRAM. CPU-only development remains suitable for fixtures, schemas, tests, and `DEMO_SAFE_MODE`, but model pulls and inference will be slower.

### One-time workstation setup

Install Git, Node.js, Docker Desktop, Python, GitHub CLI, and (for Ani) OpenSCAD through your approved installer. Then run:

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
gh auth login
npm install -g @openai/codex
codex login
```

Tylor additionally owns the team Spec-Kit installation and command generation:

```powershell
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify check
```

If needed, install `uv` using [Astral's installation guide](https://docs.astral.sh/uv/getting-started/installation/). The repository already contains the Codex command files, so Ani and Arveen normally do not need to regenerate them.

## Clone, install, and run

```powershell
git clone https://github.com/TylorDuong/Educational-Hardware-Builder.git
Set-Location Educational-Hardware-Builder
pnpm install --frozen-lockfile
pnpm --filter @educational-hardware-builder/web test
pnpm --filter @educational-hardware-builder/schemas test
pnpm --filter @educational-hardware-builder/solver test
pnpm --filter @educational-hardware-builder/scad-service test
```

Bring up the full local stack when working on platform, ingestion, agents, or integration:

```powershell
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml exec ollama ollama list
```

The initial model setup pulls `llama3.2:3b`, `llama3.1:8b`, `qwen2.5-coder:7b`, and `nomic-embed-text`; allow time and disk capacity. Stop services with `docker compose -f infra/docker-compose.yml down`.

Useful development commands:

```powershell
# API server (Docker services running)
pnpm --filter @educational-hardware-builder/web start

# Vite 3D sandbox
pnpm --filter @educational-hardware-builder/web sandbox

# Cited weather-station corpus, after model initialization
python ingestion/seed_weather_station.py

# API health
Invoke-RestMethod http://localhost:3000/api/health
```

## Sprint Runner

Launch Codex in the repository root, then send exactly one of these prompts. The runner reads `.sprint/status.yml`, the matching plan, and the owner execution guide before taking action.

| Person | Prompt | Active branch | Current sprint position |
| --- | --- | --- | --- |
| Tylor (A) | `$sprint-run ME=A NAME=Tylor` | `Tylor-A` | A6, waiting for C5 |
| Ani (B) | `$sprint-run ME=B NAME=Ani` | `Ani-B` | B6, waiting for A6 |
| Arveen (C) | `$sprint-run ME=C NAME=Arveen` | `feature/003-agents-ux` | C5, ready to complete and merge |

`Arveen-C`, `feature/001-platform-data`, and `feature/002-spatial-3d` are history branches. Do not use them for remaining sprint work unless the Sprint Runner explicitly gives a recovery instruction. The active C branch is `feature/003-agents-ux`, which contains the current C3/C4 implementation.

### Required next handoff

1. Arveen: on `feature/003-agents-ux`, complete **C5 — Assembly agent and full mock flow**, push it, open a reviewed PR into `main`, and merge it. Message Tylor: “C5 is merged to `main`; run A6, first in the merge train.”
2. Tylor: switch to `Tylor-A`, rebase on updated `main`, complete **A6**, and merge its reviewed PR into `main`. Message Ani: “A6 is merged to `main`; run B6, second in the merge train.”
3. Ani: switch to `Ani-B`, rebase on updated `main`, complete **B6**, and merge its reviewed PR into `main`. Message Arveen: “B6 is merged to `main`; run C6, last in the merge train.”
4. Arveen: switch to `feature/003-agents-ux`, rebase on updated `main`, complete **C6**, and merge it to `main`. Message all three owners that the merge train is complete and G2 integration can start.

### Branch and GitHub rules

Before a task, update the work branch:

```powershell
git fetch origin
git switch <active-work-branch>
git rebase origin/main
pnpm --filter @educational-hardware-builder/web test
git push --force-with-lease
```

For a merge task, open a GitHub PR **from the active work branch into `main`**. Do not merge until the assigned reviewer approves and required checks pass. After GitHub merges the PR:

```powershell
git switch main
git pull --ff-only origin main
```

The Day-5 order is mandatory: `Tylor-A` → `main`, then `Ani-B` → `main`, then `feature/003-agents-ux` → `main`. Each downstream owner rebases on newly merged `main` before their PR. For G2 seam work, create or switch to `feature/004-integration` from current `main`; it is for integration fixes only, never new scope.

## Sprint guardrails

- Do not start a task until its hard wait is `done` in `.sprint/status.yml`.
- Keep feature work on the assigned owner branch; only reviewed GitHub PRs merge into `main`.
- Message the named downstream owner immediately after a blocking merge; Sprint Runner prints the exact handoff.
- Shared schema changes require all three owners' review plus matching mocks and fixtures.
- Use `DEMO_SAFE_MODE` for unreliable live model steps; a reliable fixture beats a flaky demo.
