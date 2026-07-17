# Retrieval API Contract

## POST /api/retrieve

Request body is the shared `RetrievalQuery` contract: a non-empty `query`, optional `projectId`,
optional `inventoryPartIds`, and a limit from 1 through 20.

On success, return HTTP 200 with an array of shared `RetrievalResult` objects. Each result has a
database chunk ID, content, a normalized similarity score, and one or more `{ sourceUrl, locator,
title }` citations. Invalid input returns HTTP 400. An unavailable local dependency returns HTTP 503.

## GET /api/health

Return HTTP 200 JSON with `database`, `ollama`, `models`, `vramMb`, and `recommendedModelTier`.
The endpoint is informational: an unavailable dependency is represented in the response and results
in HTTP 503 rather than a misleading healthy response.
