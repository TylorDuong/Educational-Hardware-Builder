# Open Workshop API Contract

## Discovery classification

`POST /api/discovery` retains the free-form request shape. Its operation result
contains a typed `classification`:

```json
{ "outcome": "approved", "reason": "Relevant technical hardware request" }
```

or, before any retrieval, catalog, lesson, or solver work:

```json
{ "outcome": "rejected", "reason": "Request is off-topic for technical hardware building" }
```

`reason` is one of the shared relevance or malicious-intent values. No physical
hazard, learner-mode, battery, or voltage value produces rejection.

## Workshop lesson

`POST /api/discovery/{operationId}/select` returns the selected cited lesson.
Every step contains `title`, `instruction`, `completionCondition`, `citations`,
symbolic mating selections when applicable, and `skills`.

```json
{
  "skills": [
    {
      "title": "USB power-path basics",
      "sourceUrl": "https://example.test/usb-led-guide",
      "locator": "Assembly",
      "relevance": "Explains the power connection used in this step"
    }
  ]
}
```

The response contains no checkpoint, quiz, correct-answer, lock, or grading
data. The application removes the checkpoint-grading route; selecting any
Workshop step is allowed for the selected build.
