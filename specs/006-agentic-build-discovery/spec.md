# Feature Specification: Agentic Build Discovery

**Feature Branch**: `codex/authored-build`  
**Created**: 2026-07-19  
**Status**: Approved replacement sprint  
**Input**: User-approved discovery, sourcing, and guided-build flow.

## User Scenarios & Testing

### User Story 1 - Discover a feasible build from natural language (Priority: P1)

A learner describes a hardware project in their own words, including any known
constraints such as experience, budget, existing parts, and intended outcome.
The learner receives a safe, understandable build proposal drawn from the
locally available catalog and cited knowledge, rather than an unsupported
free-form answer.

**Why this priority**: This is the first useful outcome: it converts an open
ended idea into a build that the learner can evaluate.

**Independent Test**: With prepared safe-mode data, submit a free-form request
and verify that the result contains an interpreted goal, safety outcome,
ranked parts, citations, and clear alternatives.

**Acceptance Scenarios**:

1. **Given** a learner submits a low-voltage project idea, **When** discovery
   completes, **Then** the learner sees a cited build summary, a ranked bill of
   materials, compatible alternatives, and source/shop links with freshness.
2. **Given** a learner lists parts already owned, **When** discovery completes,
   **Then** verified inventory is preferred and unverified labels are clearly
   distinguished from catalog parts.
3. **Given** a learner submits an unsafe or unsupported project idea, **When**
   discovery classifies the request, **Then** it is hard-blocked before any
   parts list or construction steps are shown.

---

### User Story 2 - Receive current, attributable sourcing choices (Priority: P1)

A learner can see why each recommended part is appropriate, where it came from,
which shop/catalog link applies, and when availability information was last
refreshed.

**Why this priority**: A useful plan must connect to verifiable parts and
sources without implying that stale or unlicensed data is current.

**Independent Test**: Load prepared catalog records with multiple offers and
verify that the learner sees provenance, license status, freshness, and a safe
alternative when an offer is stale or unavailable.

**Acceptance Scenarios**:

1. **Given** a source has refreshed an approved catalog record, **When** it is
   recommended, **Then** the learner sees its source, shop link, and refresh
   time.
2. **Given** a source is stale, unavailable, or lacks licensing/provenance,
   **When** discovery ranks parts, **Then** that source is excluded or clearly
   labeled and cannot become the sole approved choice.

---

### User Story 3 - Follow a generated beginner lesson safely (Priority: P1)

After selecting a proposal, a learner follows a detailed cited lesson with
safety callouts, ordered steps, conceptual checkpoints, and troubleshooting.

**Why this priority**: Discovery is valuable only when it leads to a usable,
safe learning path.

**Independent Test**: Start a selected proposal in fixture mode and verify that
every lesson step is cited, safety appears before instructions, a checkpoint
cannot be skipped, and a wrong answer receives a cited re-explanation.

**Acceptance Scenarios**:

1. **Given** a safe proposal is selected, **When** a lesson is created,
   **Then** each step contains source attribution, a safety classification, and
   a clear completion condition.
2. **Given** a checkpoint answer is incorrect, **When** it is submitted,
   **Then** the learner remains blocked and receives an explanation grounded in
   the proposal's sources.

---

### User Story 4 - Inspect a validated physical plan (Priority: P2)

A learner can inspect eligible parts and their assembly state without receiving
model-generated positions, transforms, or electrical design values.

**Why this priority**: It keeps the product's visual learning experience while
preserving the physical-accuracy boundary.

**Independent Test**: Use a proposal with symbolic mating selections and verify
that the displayed assembly comes only from deterministic solver output; an
invalid selection produces a typed, readable failure.

## Edge Cases

- A request is too vague, combines mutually incompatible constraints, or has no
  locally indexed result.
- A source refresh fails, returns malformed data, is rate-limited, or has a
  license that cannot be identified.
- A proposed part is unavailable, stale, absent from verified inventory, or
  lacks a compatible alternative.
- The local model returns malformed or unsafe structured data.
- A proposed build includes mains AC, LiPo charging, unverified electrical
  values, or a spatial relationship with no approved symbolic features.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST accept a learner's free-form build request and
  convert it into a validated discovery request containing goal, constraints,
  available inventory, intended learner level, and safety classification.
- **FR-002**: The system MUST return a typed, cited discovery proposal with a
  summary, ranked compatible parts, alternatives, source/shop links, and data
  freshness; it MUST NOT return arbitrary unvalidated model prose as a product
  contract.
- **FR-003**: The system MUST use only locally stored research, catalog, and
  availability data while serving a learner request.
- **FR-004**: Approved background ingestion workflows MUST collect only
  allowlisted documentation and vendor/catalog data, retain provenance,
  licensing, refresh time, and errors, and submit changes through a versioned
  application-owned upsert boundary.
- **FR-005**: The system MUST reject unlicensed CAD assets and exclude parts
  with missing provenance from approved recommendations.
- **FR-006**: The system MUST prefer verified learner inventory, identify
  unverified inventory separately, and provide compatible alternatives when a
  recommended part is unavailable or stale.
- **FR-007**: The system MUST produce an ordered, cited lesson only for an
  approved safe proposal. Every step MUST present its safety callout before its
  instruction.
- **FR-008**: Beginner checkpoints MUST remain server-enforced and unskippable;
  incorrect answers MUST receive a cited re-explanation.
- **FR-009**: The system MUST hard-block mains AC, LiPo charging, unsupported
  hazards, raw electrical values, and unvalidated substitutions before a lesson
  or shopping list is available.
- **FR-010**: Every spatial recommendation MUST use only approved symbolic part
  and feature identifiers; deterministic validation owns transforms.
- **FR-011**: The learner experience MUST remain within the existing five-tab
  information architecture and show typed progress for work lasting more than
  two seconds.
- **FR-012**: Fixture mode MUST provide deterministic discovery, sourcing, and
  lesson responses without local infrastructure or model availability.

### Constitution Compliance

- **Physical accuracy and provenance**: All lesson claims, part records, and
  recommendations retain source, locator, title, license, and freshness. The
  solver remains the exclusive owner of transforms.
- **LLM contract**: Request interpretation, proposal selection, and lesson
  generation use shared schemas, JSON mode, one validation-error retry,
  deterministic fallback, and structural temperature at or below 0.3.
- **Safety**: Research classifies all requests and proposed steps; Beginner mode
  hard-blocks prohibited hazards and renders safety guidance before instruction.
- **Local operation and typed boundaries**: Learner requests use local
  inference and local data. Background ingestion is the only allowed external
  network path. PostgreSQL/pgvector remains the sole datastore and all API/SSE
  payloads share Zod contracts.
- **Licensing**: Every CAD asset and recommended part requires a source URL and
  identifiable license; assets that cannot be redistributed are rejected.
- **Verification and performance**: The feature includes fixture contracts,
  deterministic safety/solver tests, GPU-free CI, agent smoke coverage, and
  measured retrieval and first-response targets.

### Key Entities

- **Discovery Request**: A learner's interpreted goal, constraints, inventory
  context, safety classification, and requested outcome.
- **Source Record**: An allowlisted documentation or vendor source with
  provenance, refresh state, and ingestion outcome.
- **Catalog Offer**: A part/source association with link, availability,
  freshness, compatibility facts, and licensing state.
- **Discovery Proposal**: A cited, ranked build recommendation and its safe
  alternatives.
- **Guided Lesson**: An approved proposal's ordered, cited, checkpoint-gated
  learning path.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In fixture mode, 100% of approved example requests return a
  typed proposal with at least two cited source records and one safe alternative
  in under 3 seconds on the reference machine.
- **SC-002**: 100% of recommendations displayed to learners show a source link,
  freshness state, and license/provenance status.
- **SC-003**: 100% of fixture requests containing a prohibited hazard are
  blocked before any build instructions or shopping links are displayed.
- **SC-004**: 100% of generated fixture lessons contain cited safety-first
  steps and enforce at least two server-side checkpoints.
- **SC-005**: A learner can move from a safe free-form request to a selected,
  cited lesson in under 5 minutes using the local fixture flow.

## Assumptions

- The first release uses a small, explicitly allowlisted set of public
  documentation and vendor/catalog sources; it does not scrape arbitrary sites.
- Data freshness is shown to the learner and is not represented as real-time
  availability.
- Shop links are informational handoffs; checkout, authentication, payment, and
  stock reservation are out of scope.
- The existing weather-station path remains available while fixture data grows
  to cover discovery scenarios.
- The user-approved replacement sprint supersedes the unfinished task queue in
  `specs/005-authored-build`.
