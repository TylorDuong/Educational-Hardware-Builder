# Data Model: Platform and Data Foundation

This A2 slice creates no migrations or tables. It preserves the G1 contracts that define the
future model boundaries:

- **PartRecord**: Canonical part identity, electrical facts, and CAD references.
- **CadAssetRecord**: Source, license, hash, and mating-feature metadata.
- **RetrievalResult**: Cited content returned for later inventory-aware retrieval.
- **IngestUpsert**: Versioned, cited chunk submission format for A4/A5 ingestion work.

Table creation, pgvector columns, relationships, and migrations are deferred to A3.
