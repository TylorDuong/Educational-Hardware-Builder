# Ingestion API Contract

## `POST /api/ingest/v2/upsert`

This authenticated endpoint is the sole write boundary for n8n source/vendor
workflows. It accepts an allowlisted source identity, source-policy revision,
canonical citation/provenance, normalized document chunks, catalog facts, and
cached offers. It returns typed accepted/rejected counts and an ingestion run
identifier.

The server rejects payloads with any of the following:

- unknown/disabled source policy or URL outside its allowed pattern;
- missing citation title, locator, source URL, content hash, or fetch time;
- missing/ambiguous CAD license or source URL;
- invalid offer URL, non-positive price/quantity, invalid currency, or expiry
  before observation;
- duplicate external identity with conflicting immutable provenance; or
- untyped/unsupported fields.

## Idempotency and failure behavior

The upsert key combines source policy, provider/external identity, and content
or offer version. Replays are safe; changed valid records produce a new
version/re-embedding atomically. A failed request writes an audit result,
leaves last-known-good data intact, and returns a typed retryable or permanent
error. n8n backs off within a bounded retry policy and never writes database
tables directly.

## Source policy

The application owns source policies. Each declares permitted HTTPS host/path,
source class, allowed facts, refresh interval, and credential reference. v1
uses explicitly configured primary documentation and vendor APIs only; arbitrary
URLs, scraping, and browser automation are excluded.
