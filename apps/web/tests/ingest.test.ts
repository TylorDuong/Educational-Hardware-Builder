import assert from "node:assert/strict";
import test from "node:test";

import type { SourcePolicy } from "@educational-hardware-builder/schemas";
import { IngestApiError, upsertIngestion } from "../src/ingest.js";

const policy: SourcePolicy = {
  id: "vendor-catalog", revision: 1, enabled: true, sourceClass: "vendor_catalog" as const,
  allowedUrlPatterns: ["https://vendor.example.test/**"], allowedFacts: ["citation", "catalog_offer"],
  refresh: { intervalHours: 24, maxStalenessHours: 72 },
  terms: { evidenceRequired: true as const, acceptedStatuses: ["public-catalog"], prohibitedUses: ["checkout"] },
  offers: { cachedLinksOnly: true as const, checkoutAllowed: false as const, requireObservedAt: true as const, requireExpiresAt: true as const, requireProviderSku: true as const },
};
const payload = {
  version: "v2", sourcePolicyId: "vendor-catalog", sourcePolicyRevision: 1, idempotencyKey: "vendor:one:v1",
  source: { externalId: "vendor:one", canonicalUrl: "https://vendor.example.test/products/one", title: "One", locator: "product", contentHash: "a".repeat(64), license: "catalog terms", termsStatus: "public-catalog", fetchedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-02T00:00:00.000Z" },
  chunks: [{ externalId: "vendor:one:chunk", content: "Cited product", citation: { sourceUrl: "https://vendor.example.test/products/one", locator: "product", title: "One" } }],
};

function database(failAt?: RegExp) {
  const sql: string[] = [];
  return {
    sql,
    connect: async () => ({
      query: async (statement: string) => {
        sql.push(statement);
        if (failAt?.test(statement)) throw new Error("database failure");
        return { rows: statement.includes("source_documents") ? [{ id: "60000000-0000-4000-8000-000000000001" }] : [] };
      },
      release: () => undefined,
    }),
  };
}

test("denies unknown source policies before a transaction opens", async () => {
  const db = database();
  await assert.rejects(() => upsertIngestion(payload, db, []), (error: unknown) => error instanceof IngestApiError && error.code === "SOURCE_POLICY_DENIED");
  assert.deepEqual(db.sql, []);
});

test("uses conflict-safe identities for replayed ingestion", async () => {
  const db = database();
  await upsertIngestion(payload, db, [policy]);
  assert.ok(db.sql.some((statement) => statement.includes("ON CONFLICT (source_policy_id, source_policy_revision, idempotency_key)")));
  assert.ok(db.sql.some((statement) => statement.includes("ON CONFLICT (source_policy_id, source_policy_revision, external_id, content_hash)")));
  assert.ok(db.sql.includes("COMMIT"));
});

test("rolls back failed writes so prior valid records remain untouched", async () => {
  const db = database(/source_document_chunks/);
  await assert.rejects(() => upsertIngestion(payload, db, [policy]), (error: unknown) => error instanceof IngestApiError && error.code === "INGEST_TRANSACTION_FAILED");
  assert.ok(db.sql.includes("ROLLBACK"));
  assert.ok(!db.sql.includes("COMMIT"));
});
