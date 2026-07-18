# Implementation Plan: Guided Weather-Station Workshop

**Branch**: feature/003-agents-ux | **Date**: 2026-07-17 | **Spec**: spec.md

## Summary

Deliver the hand-authored weather-station reference fixture that anchors the workshop demo and fallback. C2 includes specification artifacts, the fixture, and validation only.

## Technical Context

**Language/Version**: TypeScript, Node.js 20+  
**Primary Dependencies**: Existing shared schema package and web app  
**Storage**: Existing PostgreSQL ownership; C2 adds no persistence  
**Testing**: Node test runner  
**Target Platform**: Local Docker Compose development and demo machines  
**Project Type**: Monorepo web app  
**Constraints**: Local-only inference, symbolic-only spatial choices, cited factual content, authored fallback  
**Scope**: One Beginner weather-station plan; 12 steps and 3 checkpoints

## Constitution Check

- [x] C2 uses existing CAD fixture identifiers and never outputs transforms.
- [x] C2 validates authored data with shared contracts; future LLM boundaries are planned.
- [x] C2 adds no cloud, datastore, or embedding path.
- [x] Every fixture step declares a safety category.
- [x] C2 adds no untyped API or direct datastore access.
- [x] Fixture validation is added now; required later coverage is scheduled.
- [x] C2 preserves the fixed navigation, checkpoint, and typed-progress constraints.
- [x] C2 adds no performance-sensitive path or new CAD asset.

## Project Structure

apps/web/fixtures/weather-station.ts contains the fixture.  
apps/web/tests/weather-station.fixture.test.ts validates it.  
specs/003-agents-workshop contains the Spec-Kit artifacts.

**Structure Decision**: The app owns the fixture and consumes the shared schema plus B-owned fixture identifiers.
