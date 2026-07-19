# Codex Workspace Guide

This directory contains repository-local prompts for Codex. Start from the project root so `AGENTS.md`, the shared schemas, and feature specifications are in scope.

## Current state

The seven-day MVP sprint is complete: G1, G2, and G3 are marked done in `.sprint/status.yml`. Treat `.sprint/` and the owner execution guides as historical evidence, not as an active queue. New work should begin with [docs/roadmap.md](../docs/roadmap.md), the relevant `specs/` artifacts, and the implementation guardrails in `AGENTS.md`.

## Useful prompts

- `$project-status` reads the current project state and recommends the smallest safe next slice.
- `$sprint-run NAME=<developer>` executes the single-developer queue in `specs/005-authored-build/tasks.md`; the old A/B/C sprint files remain historical.

## Working conventions

1. Read the relevant spec and shared Zod contracts before changing code.
2. Preserve `DEMO_SAFE_MODE`; a developer must be able to run the fixture workshop through `pnpm quickstart` without Docker, a GPU, or local models.
3. Update focused tests and run the smallest relevant test, typecheck, and build before handoff.
4. Keep model output structured and symbolic. Only the deterministic solver may create transforms.
5. Preserve citations, server-side checkpoint gating, and existing user changes.

Use the root [README](../README.md) for installation and commands.
