# Feature Specification: Open Workshop

**Feature Branch**: `codex/authored-build`  
**Created**: 2026-07-19  
**Status**: Approved superseding direction  
**Input**: Accept relevant technical hardware requests without hazard- or
learner-mode blocks; reject only off-topic or malicious content. Replace
Workshop quizzes and gates with freely navigable, cited explanations and links
to a skills library.

## User Scenarios & Testing

### User Story 1 - Explore any relevant technical build (Priority: P1)

A learner describes any technical hardware project in their own words and gets
a cited build proposal when the request is relevant and made in good faith.
The learner is not blocked because of voltage, battery chemistry, or an
experience-level label.

**Why this priority**: Open technical exploration is the product's primary
purpose.

**Independent Test**: In fixture mode, submit a mains-powered project and a
battery-related project. Each returns a typed, cited proposal rather than a
hazard block. Submit an off-topic prompt and a malicious prompt; each returns a
typed rejection before retrieval or proposal generation.

**Acceptance Scenarios**:

1. **Given** a learner submits a relevant technical hardware request, **When**
   discovery completes, **Then** the learner receives a typed, cited proposal
   regardless of project hazard or learner mode.
2. **Given** a learner submits a non-technical request, **When** discovery
   classifies it, **Then** the learner receives a relevance rejection before
   parts, offers, lessons, or solver work are shown.
3. **Given** a learner submits malicious content, **When** discovery classifies
   it, **Then** the learner receives a typed good-faith rejection before
   retrieval or generation begins.

---

### User Story 2 - Follow a self-directed workshop (Priority: P1)

After selecting a proposal, a learner can read and navigate every cited
Workshop step in any order without answering quizzes or completing checkpoints.

**Why this priority**: Learners control the pace and sequence of their own
technical exploration.

**Independent Test**: Select a fixture proposal, open Workshop, visit every
step in arbitrary order, and verify that no answer, lock, or server-gated
progression state appears.

**Acceptance Scenarios**:

1. **Given** a selected proposal, **When** the learner opens Workshop, **Then**
   every step is selectable immediately.
2. **Given** a learner visits any Workshop step, **When** it renders, **Then**
   it shows a cited explanation and a clear completion condition without a
   quiz or required response.

---

### User Story 3 - Learn required skills on demand (Priority: P2)

For each Workshop step, a learner can open relevant skills-library material to
learn an unfamiliar technique without leaving the build context.

**Why this priority**: Linked skill material replaces quiz gating with
self-directed learning support.

**Independent Test**: Open a fixture Workshop step and verify that every
listed skill link has a title, source, locator, and stated relevance to the
step.

**Acceptance Scenarios**:

1. **Given** a Workshop step requires a skill, **When** it renders, **Then**
   the learner sees one or more cited skill-library links and why each applies.
2. **Given** no additional skill is required, **When** the step renders,
   **Then** the learner sees a clear statement that no separate skill material
   is needed.

### Edge Cases

- A request is vague but still technical and should receive a clarifying
  proposal or alternatives rather than a hazard block.
- A request mixes technical language with an unrelated or malicious intent.
- A skills-library record is missing its citation, locator, title, or link.
- A selected proposal has no skill links for a step.
- A prior checkpoint-bearing lesson is loaded after the new Workshop contract
  is deployed.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST accept relevant technical hardware requests
  without blocking them by voltage, battery chemistry, project hazard, or
  learner mode.
- **FR-002**: The system MUST classify requests only for technical relevance
  and malicious intent before discovery work starts.
- **FR-003**: The system MUST return a typed rejection, with a clear reason,
  for off-topic or malicious requests before retrieval, catalog matching,
  proposal generation, lesson generation, or solver work.
- **FR-004**: The system MUST return a typed, cited discovery proposal for a
  relevant, good-faith request and MUST preserve local source, catalog, and
  offer provenance.
- **FR-005**: Every Workshop step MUST be directly reachable without a quiz,
  answer submission, checkpoint, progression lock, or learner-mode gate.
- **FR-006**: Every Workshop step MUST show a cited explanation and completion
  condition.
- **FR-007**: Every Workshop step MUST show relevant skill-library links with
  title, source URL, locator, and step-specific relevance, or explicitly say
  that no separate skill material is required.
- **FR-008**: The system MUST not expose raw spatial coordinates or transform
  matrices from model output; deterministic solver output remains the only
  spatial transform source.
- **FR-009**: The learner experience MUST use the four-tab Dashboard, Research,
  Parts, and Workshop information architecture, with the Workshop combining the
  former Build view, and show typed progress for work lasting more than two
  seconds.
- **FR-010**: Fixture mode MUST provide deterministic open-discovery,
  self-directed Workshop, and skills-library responses without local
  infrastructure or model availability.

### Constitution Compliance

- **Physical accuracy and provenance**: Lesson claims and skill links retain
  source URL, locator, and title. The deterministic solver remains the sole
  owner of transforms.
- **LLM contract**: Relevance classification, proposal selection, lesson
  generation, and skill selection use shared schemas, JSON mode, one
  validation-error retry, and deterministic fallback.
- **Relevance and good-faith use**: Requests are rejected only when they are
  off-topic or malicious; relevant technical requests are not hazard- or
  mode-blocked.
- **Local operation and typed boundaries**: Learner requests use local
  inference and local data. Background ingestion is the only allowed external
  network path. PostgreSQL/pgvector remains the sole datastore and all API/SSE
  payloads share Zod contracts.
- **Licensing**: Every CAD asset and recommended part requires a source URL and
  identifiable license; assets that cannot be redistributed are rejected.
- **Verification and performance**: The feature includes fixture contracts for
  relevance, malicious rejection, free navigation, and cited skills; GPU-free
  CI; and existing performance coverage.

### Key Entities

- **Request Classification**: The relevance and good-faith outcome for a
  learner prompt, with a typed reason when rejected.
- **Discovery Proposal**: A cited, ranked technical build recommendation and
  its provenance-backed alternatives.
- **Workshop Step**: A directly navigable, cited explanation and completion
  condition associated with a selected proposal.
- **Skill Library Entry**: A cited learning resource with a title, source URL,
  locator, and explanation of its relevance to one or more Workshop steps.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In fixture mode, 100% of approved relevant technical example
  requests return a typed, cited proposal in under three seconds.
- **SC-002**: In fixture mode, 100% of off-topic and malicious example requests
  are rejected before any proposal, parts, offers, lesson, or solver result is
  exposed.
- **SC-003**: A learner can navigate from the first to the final Workshop step
  in any order without submitting an answer or encountering a lock.
- **SC-004**: 100% of fixture Workshop steps show a cited explanation,
  completion condition, and either a cited skill-library entry or an explicit
  no-additional-skills statement.
- **SC-005**: A learner can move from a relevant free-form request to any
  selected Workshop step in under five minutes using the local fixture flow.

## Assumptions

- Technical relevance is limited to hardware-building, electronics, mechanics,
  fabrication, and closely related skills.
- Malicious intent means a request whose stated purpose is to harm, sabotage,
  or evade safeguards; it is distinct from a challenging but good-faith
  technical project.
- The existing cited corpus can seed the initial skills library; no runtime
  external lookup is introduced.
- The safety-gated `006-agentic-build-discovery` artifacts remain historical;
  their unchecked verification tasks are not evidence for this feature.
