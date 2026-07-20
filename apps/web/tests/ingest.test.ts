import assert from "node:assert/strict";
import test from "node:test";

import type { SourcePolicy } from "@educational-hardware-builder/schemas";
import { IngestApiError, upsertIngestion } from "../src/ingest.js";
import { applicationSourcePolicies } from "../src/source-policies.js";

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
  offers: [{ externalId: "vendor:one:offer", partId: "40000000-0000-4000-8000-000000000001", provider: "Vendor", providerSku: "ONE", purchaseUrl: "https://vendor.example.test/products/one", availability: "in_stock", price: 9.99, currency: "USD", thumbnailDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", observedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-02T00:00:00.000Z", sourceUrl: "https://vendor.example.test/products/one", citation: { sourceUrl: "https://vendor.example.test/products/one", locator: "product", title: "One" } }],
};

function database(failAt?: RegExp) {
  const sql: string[] = [];
  return {
    sql,
    connect: async () => ({
      query: async (statement: string) => {
        sql.push(statement);
        if (failAt?.test(statement)) throw new Error("database failure");
        if (statement.includes("INSERT INTO ingestion_runs")) {
          return { rows: [{ id: "50000000-0000-4000-8000-000000000001" }] };
        }
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

test("application-owned policies include the allowlisted vendor refresh endpoint", () => {
  assert.deepEqual(applicationSourcePolicies.find((candidate) => candidate.id === "adafruit-catalog"), {
    id: "adafruit-catalog",
    revision: 1,
    enabled: true,
    sourceClass: "vendor_catalog",
    allowedUrlPatterns: [
      "https://www.adafruit.com/product/**",
      "https://cdn-shop.adafruit.com/datasheets/**",
    ],
    allowedFacts: ["citation", "catalog_offer", "part_metadata", "datasheet"],
    refresh: { intervalHours: 24, maxStalenessHours: 72 },
    terms: {
      evidenceRequired: true,
      acceptedStatuses: ["public-catalog", "redistribution-permitted"],
      prohibitedUses: ["checkout", "credentialed-purchase", "browser-automation", "unapproved-scraping"],
    },
    offers: {
      cachedLinksOnly: true,
      checkoutAllowed: false,
      requireObservedAt: true,
      requireExpiresAt: true,
      requireProviderSku: true,
    },
  });
});

test("application-owned policies allow only the eBay Browse API and cached listing media", () => {
  const policy = applicationSourcePolicies.find((candidate) => candidate.id === "ebay-browse-catalog");
  assert.ok(policy);
  assert.deepEqual(policy.allowedUrlPatterns, [
    "https://api.ebay.com/buy/browse/**",
    "https://www.ebay.com/itm/**",
    "https://i.ebayimg.com/**",
  ]);
  assert.equal(policy.offers?.cachedLinksOnly, true);
  assert.equal(policy.offers?.checkoutAllowed, false);
});

test("uses conflict-safe identities for replayed ingestion", async () => {
  const db = database();
  const result = await upsertIngestion(payload, db, [policy]);
  assert.ok(db.sql.some((statement) => statement.includes("ON CONFLICT (source_policy_id, source_policy_revision, idempotency_key)")));
  assert.ok(db.sql.some((statement) => statement.includes("ON CONFLICT (source_policy_id, source_policy_revision, external_id, content_hash)")));
  assert.ok(db.sql.some((statement) => statement.includes("thumbnail_data_url")));
  assert.ok(db.sql.includes("COMMIT"));
  assert.equal(result.ingestionRunId, "50000000-0000-4000-8000-000000000001");
});

test("rolls back failed writes so prior valid records remain untouched", async () => {
  const db = database(/source_document_chunks/);
  await assert.rejects(() => upsertIngestion(payload, db, [policy]), (error: unknown) => error instanceof IngestApiError && error.code === "INGEST_TRANSACTION_FAILED");
  assert.ok(db.sql.includes("ROLLBACK"));
  assert.ok(!db.sql.includes("COMMIT"));
});
