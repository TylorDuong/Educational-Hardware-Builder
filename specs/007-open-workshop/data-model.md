# Data Model: Open Workshop

| Entity | Key fields | Relationships and validation |
| --- | --- | --- |
| Request Classification | outcome, reason, relevance terms | `approved` or `rejected`; a rejected result has one typed relevance or malicious reason and no proposal. |
| Discovery Request | prompt, constraints, inventory context | Has one classification and, when approved, one cited proposal. No learner mode controls access. |
| Discovery Proposal | intent, ranked BOM, alternatives, citations, freshness | Exists only for an approved classification; provenance and licensing remain required. |
| Guided Lesson | proposal, ordered steps, troubleshooting | Each step is directly navigable and carries no quiz or answer state. |
| Skill Library Entry | title, source URL, locator, relevance | Each entry is cited and linked from one or more Workshop steps. |

## State transitions

```text
queued -> classifying -> retrieving -> catalog-matched -> generating -> validating -> ready
queued -> rejected
any non-terminal state -> error
ready -> selected -> workshop-active -> complete
```

Only off-topic or malicious classifications use `rejected`. Step navigation
does not change server authorization state.
