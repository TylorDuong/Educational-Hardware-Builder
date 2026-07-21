import { randomUUID } from "node:crypto";

import {
  IngestUpsertSchema,
  IngestUpsertResultSchema,
  type IngestUpsert,
  type IngestUpsertResult,
  type SourcePolicy,
} from "@educational-hardware-builder/schemas";

type TransactionClient = {
  query: (sql: string, values?: readonly unknown[]) => Promise<{ rows: Array<{ id?: string }> }>;
  release: () => void;
};

export type IngestDatabase = {
  connect: () => Promise<TransactionClient>;
};

export class IngestApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function matchesAllowlist(url: string, pattern: string): boolean {
  const expression = `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*\\\*/g, ".*")}$`;
  return new RegExp(expression).test(url);
}

function validatePolicy(payload: IngestUpsert, policies: readonly SourcePolicy[]): SourcePolicy {
  const policy = policies.find((candidate) => candidate.id === payload.sourcePolicyId && candidate.revision === payload.sourcePolicyRevision);
  if (!policy || !policy.enabled) throw new IngestApiError(403, "SOURCE_POLICY_DENIED", "The ingestion source policy is not approved.");
  if (!policy.allowedUrlPatterns.some((pattern) => matchesAllowlist(payload.source.canonicalUrl, pattern))) {
    throw new IngestApiError(403, "SOURCE_URL_DENIED", "The source URL is outside the approved policy.");
  }
  if (payload.offers.length > 0 && policy.sourceClass !== "vendor_catalog") {
    throw new IngestApiError(400, "OFFER_POLICY_DENIED", "Only vendor catalog policies may ingest offers.");
  }
  if (payload.cadAssets.length > 0 && !policy.cadAssets) {
    throw new IngestApiError(400, "CAD_POLICY_DENIED", "This source policy does not permit CAD assets.");
  }
  return policy;
}

/** Application-owned transactional write boundary for background ingestion. */
export async function upsertIngestion(input: unknown, database: IngestDatabase, policies: readonly SourcePolicy[]): Promise<IngestUpsertResult> {
  const parsed = IngestUpsertSchema.safeParse(input);
  if (!parsed.success) throw new IngestApiError(400, "INVALID_INGEST_PAYLOAD", "The ingestion payload does not match the v2 contract.");
  const payload = parsed.data;
  validatePolicy(payload, policies);

  const client = await database.connect();
  const runId = randomUUID();
  try {
    await client.query("BEGIN");
    const ingestionRunResult = await client.query(
      `INSERT INTO ingestion_runs (id, source_policy_id, source_policy_revision, idempotency_key, status)
       VALUES ($1, $2, $3, $4, 'processing')
       ON CONFLICT (source_policy_id, source_policy_revision, idempotency_key)
       DO UPDATE SET status = ingestion_runs.status
       RETURNING id`,
      [runId, payload.sourcePolicyId, payload.sourcePolicyRevision, payload.idempotencyKey],
    );
    const persistedRunId = ingestionRunResult.rows[0]?.id ?? runId;
    const sourceId = randomUUID();
    const sourceResult = await client.query(
      `INSERT INTO source_documents (id, source_policy_id, source_policy_revision, external_id, canonical_url, title, locator, content_hash, license, terms_status, fetched_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (source_policy_id, source_policy_revision, external_id, content_hash)
       DO UPDATE SET fetched_at = EXCLUDED.fetched_at, expires_at = EXCLUDED.expires_at
       RETURNING id`,
      [sourceId, payload.sourcePolicyId, payload.sourcePolicyRevision, payload.source.externalId, payload.source.canonicalUrl, payload.source.title, payload.source.locator, payload.source.contentHash, payload.source.license, payload.source.termsStatus, payload.source.fetchedAt, payload.source.expiresAt],
    );
    const persistedSourceId = sourceResult.rows[0]?.id ?? sourceId;
    for (const chunk of payload.chunks) {
      await client.query(
        `INSERT INTO source_document_chunks (id, source_document_id, external_id, content, citation)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (source_document_id, external_id) DO UPDATE SET content = EXCLUDED.content, citation = EXCLUDED.citation`,
        [randomUUID(), persistedSourceId, chunk.externalId, chunk.content, JSON.stringify(chunk.citation)],
      );
    }
    for (const fact of payload.catalogFacts) {
      await client.query(
        `INSERT INTO parts_catalog (id, slug, name, category, source_url, license)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, category = EXCLUDED.category, source_url = EXCLUDED.source_url, license = EXCLUDED.license`,
        [fact.partId, fact.slug, fact.name, fact.category, fact.sourceUrl, fact.license],
      );
    }
    for (const asset of payload.cadAssets) {
      await client.query(
        `INSERT INTO cad_assets (id, part_id, file_path, sha256, source_url, license, mating_features)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (id) DO UPDATE SET file_path = EXCLUDED.file_path, sha256 = EXCLUDED.sha256, source_url = EXCLUDED.source_url, license = EXCLUDED.license, mating_features = EXCLUDED.mating_features`,
        [asset.id, asset.partId, asset.filePath, asset.sha256, asset.sourceUrl, asset.license, JSON.stringify(asset.matingFeatures)],
      );
    }
    for (const offer of payload.offers) {
      await client.query(
        `INSERT INTO catalog_offers (id, part_id, source_document_id, external_id, provider, provider_sku, purchase_url, availability, price, currency, thumbnail_data_url, observed_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (source_document_id, external_id) DO UPDATE SET availability = EXCLUDED.availability, price = EXCLUDED.price, currency = EXCLUDED.currency, thumbnail_data_url = EXCLUDED.thumbnail_data_url, observed_at = EXCLUDED.observed_at, expires_at = EXCLUDED.expires_at`,
        [randomUUID(), offer.partId, persistedSourceId, offer.externalId, offer.provider, offer.providerSku, offer.purchaseUrl, offer.availability, offer.price ?? null, offer.currency ?? null, offer.thumbnailDataUrl ?? null, offer.observedAt, offer.expiresAt],
      );
    }
    const acceptedCount = payload.chunks.length + payload.catalogFacts.length + payload.cadAssets.length + payload.offers.length;
    await client.query("UPDATE ingestion_runs SET status = 'accepted', accepted_count = $2, completed_at = now() WHERE id = $1", [persistedRunId, acceptedCount]);
    await client.query("COMMIT");
    return IngestUpsertResultSchema.parse({ ingestionRunId: persistedRunId, acceptedCount, rejectedCount: 0, status: "accepted" });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error instanceof IngestApiError ? error : new IngestApiError(503, "INGEST_TRANSACTION_FAILED", "Ingestion could not be recorded; no partial data was accepted.");
  } finally {
    client.release();
  }
}
