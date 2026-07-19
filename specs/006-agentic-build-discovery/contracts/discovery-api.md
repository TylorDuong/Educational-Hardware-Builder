# Discovery API Contract

## `POST /api/discovery`

Accepts free-form learner input and optional structured constraints. The server
returns `202` with a typed operation reference; it does not return raw agent
prose.

```json
{
  "prompt": "I want a beginner desk light using parts I already own",
  "mode": "beginner",
  "userId": "uuid",
  "budget": { "currency": "USD", "maxAmount": 30 },
  "inventoryPartIds": ["uuid"],
  "constraints": ["usb-power-only"]
}
```

Response:

```json
{ "operationId": "uuid", "status": "queued" }
```

## `GET /api/discovery/{operationId}` and events

Returns a validated operation state and, once ready, its `BuildProposal`.
`GET /api/discovery/{operationId}/events` emits typed SSE states: `queued`,
`safety`, `intent`, `retrieving`, `catalog`, `generating`, `validating`,
`solver`, `complete`, `blocked`, or `error`.

## Proposal contract

A ready proposal includes: validated intent, safety decision, cited ranked BOM,
inventory matches/gaps, alternatives, freshness-labeled cached offers, cited
lesson steps/checkpoints, troubleshooting, and symbolic mating selections.
Every citation must be present in the local retrieval set. Unknown part IDs,
expired sole offers, raw transforms, missing safety, or uncited claims cause a
typed validation error and one retry/fallback.

## Workshop promotion

`POST /api/discovery/{operationId}/select` promotes a ready safe proposal to a
build-scoped Workshop session. Existing server-side step and checkpoint routes
remain authoritative and require the selected build/session identity.
