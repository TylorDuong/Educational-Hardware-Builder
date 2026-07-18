# Research: Guided Weather-Station Workshop

## Decisions

### Hand-author the fixture

- **Decision**: Author the golden path directly.
- **Rationale**: A fallback must be known-good, not generated content with hidden invalid mates or missing citations.
- **Alternative rejected**: Model-generated seed content.

### Reuse shared symbolic identifiers

- **Decision**: Use B's part and feature IDs from shared fixture metadata.
- **Rationale**: It prevents a second identifier system and keeps solver integration testable.
- **Alternative rejected**: Application-local identifiers.

### Keep the template request distinct from the step

- **Decision**: Attach the typed L-bracket request to its step by identifier.
- **Rationale**: The existing step contract does not contain a template request while the shared template contract validates it.
- **Alternative rejected**: Untyped step fields.
