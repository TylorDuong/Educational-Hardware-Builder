<!--
Sync Impact Report
- Version change: unversioned template -> 1.0.0
- Modified principles: template placeholders -> I-IX below
- Added sections: Non-Negotiable Platform Constraints; Delivery and Review Workflow
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md: updated
  - .specify/templates/spec-template.md: updated
  - .specify/templates/tasks-template.md: updated
- Follow-up TODOs: none
-->
# Educational Hardware Builder Constitution

## Core Principles

### I. Accuracy Is More Important Than Generation

The product MUST treat physically wrong construction guidance as a critical defect. LLMs
MUST NOT emit raw spatial coordinates, transform matrices, or electrical values as free
text. Deterministic solvers operating on CAD metadata own spatial mathematics. Generated
3D geometry MUST come from parameterized templates and pass a headless OpenSCAD
compile-and-validation loop. Every factual lesson claim MUST be grounded in retrieved
sources, with its citations stored alongside the lesson content. These boundaries make
generated guidance reproducible, inspectable, and safe to construct.

### II. LLM Input and Output Are Strictly Structured

Every LLM invocation MUST declare an explicit JSON schema, request JSON-mode output, and
validate the response with the shared Zod schema. On validation failure, the caller MUST
retry exactly once with the validation error included in the prompt, then use a
deterministic default or return a user-facing error. No agent may parse free-form model
prose. Structural outputs MUST use temperature 0.3 or lower. This keeps model behavior at
typed, testable boundaries rather than making prose an application protocol.

### III. Local-First Within a Consumer-GPU Budget

The complete platform MUST run through Docker Compose on the user's machine. Runtime
inference MUST use local, quantized Ollama models sized for 8-16 GB VRAM; cloud inference
and runtime external calls are prohibited, except for n8n background ingestion pipelines.
Embedding models MUST run on CPU. Startup MUST detect available VRAM, select a compatible
model tier, and show an explicit warning when it degrades capability. This preserves
privacy, offline ownership, and predictable consumer-hardware operation.

### IV. Safety Gates Are Hard Blocks

Research MUST classify projects and steps for mains AC voltage, LiPo charging, and all
other flagged hazards. Beginner mode MUST hard-block classified hazards rather than merely
warning about them. Every instructional step MUST carry a safety category, and its safety
callout MUST render before its construction instruction. This places safety decisions
before user action and prevents hazardous beginner workflows.

### V. PostgreSQL Is the Single Datastore and Boundaries Are Typed

PostgreSQL with pgvector MUST be the only datastore. n8n pipelines MUST terminate at a
versioned application-owned upsert API and MUST NOT write database tables directly. All API
and SSE payloads MUST be Zod-typed from one shared schema package used by both server and
client. This prevents data drift and makes cross-process contracts verifiable.

### VI. Verification Is a Release Requirement

Deterministic components--including spatial solving, template-parameter validation, schema
validation, and inventory-matching SQL--MUST have unit tests using real fixture CAD files.
LLM-dependent paths MUST have recorded-fixture contract tests for output-schema conformance
and at least one live smoke test per agent runnable through a Make target. The OpenSCAD
compile-validation loop MUST test compile failures, zero-volume meshes, and
out-of-bounds parameters. CI MUST pass without a GPU by mocking Ollama with fixtures.

### VII. UX Must Limit Cognitive Load and Show Progress

The UI MUST use exactly five fixed tabs: Dashboard, Inventory, Workshop, 3D Mech View
within Workshop, and Gallery. Socratic checkpoints MUST gate step progression and MUST NOT
be skippable in Beginner mode. Any agent operation longer than two seconds MUST stream
visible progress to the UI through SSE. Beginner and Intermediate MUST be one mode flag
threaded through all agents, never separate forked logic trees. These rules keep learning
flows coherent and prevent invisible waits.

### VIII. Performance Targets Are Product Requirements

3D Mech View MUST maintain 60 fps on integrated graphics for assemblies of up to 30 parts,
using Draco-compressed GLTF or binary STL and instanced fasteners. On the reference
12-GB-VRAM machine, every agent MUST deliver its first token within three seconds; vector
retrieval MUST complete within 200 ms at 100,000 embeddings; and a clean-machine
`docker compose up` through the first successful chat round-trip, including model pulls,
MUST complete in under 15 minutes. Plans and releases MUST measure these targets.

### IX. Asset Licensing Is Enforced at Ingestion

Every CAD asset row MUST store its license and source URL. Only redistributable or
Creative-Commons-licensed parts may ship in the seed library. Ingestion MUST reject assets
without an identifiable license. This protects users and maintainers from untraceable or
non-redistributable design assets.

## Non-Negotiable Platform Constraints

- Features MUST preserve the local Docker Compose deployment model, PostgreSQL with
  pgvector as the sole datastore, local Ollama runtime inference, and CPU embeddings.
- Features that create spatial, electrical, instructional, geometry, retrieval, ingestion,
  or agent behavior MUST identify their deterministic/typed boundary, safety category,
  provenance record, and verification strategy before implementation begins.
- New client navigation MUST fit the five-tab information architecture; long-running work
  MUST include typed SSE progress states.
- A feature cannot substitute a warning, manual review, or best-effort fallback for a hard
  safety, schema, license, or physical-validation gate.

## Delivery and Review Workflow

Before research, every plan MUST pass the Constitution Check for physical accuracy, schema
contracts, local resource use, safety classification, datastore ownership, required tests,
UX/SSE behavior, performance targets, and licensing. Specifications MUST express the
applicable requirements as testable acceptance criteria. Tasks MUST include the required
fixtures, unit and contract tests, GPU-free CI behavior, and measured performance work;
they are not optional when covered by this constitution.

Before merging, reviewers MUST confirm that the implementation preserves the principles,
that safety callouts precede instructions, and that every schema, asset, claim, and
performance-sensitive path has its required evidence. A justified exception requires a
formal constitution amendment before implementation; it cannot be introduced by a feature
plan, task list, or code review.

## Governance

This constitution supersedes repository conventions, plans, specifications, and task lists.
Amendments require a documented rationale, an impact review of affected templates and
runtime guidance, and an updated Sync Impact Report in this file. The versioning policy is
semantic: MAJOR for removing or incompatibly redefining governance, MINOR for adding or
materially expanding principles or sections, and PATCH for clarifications that do not
change governance meaning.

Every feature plan and implementation review MUST record constitution compliance. A
non-compliant implementation MUST be changed, deferred, or preceded by a ratified
amendment; it MUST NOT be accepted as technical debt. The project uses
`.specify/memory/constitution.md` as the authoritative governance document.

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16
