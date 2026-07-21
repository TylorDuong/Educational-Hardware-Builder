import assert from "node:assert/strict";
import test from "node:test";

import {
  findCompatibleAlternatives,
  findFreshCatalogOffers,
  findVerifiedInventoryMatches,
} from "../src/catalog.js";

const userId = "40000000-0000-4000-8000-000000000001";
const partId = "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const alternativeId = "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const citation = { sourceUrl: "https://docs.example.test/usb-light", locator: "Parts", title: "USB light guide" };

test("catalog repository matches only verified inventory rows for requested canonical parts", async () => {
  let sql = "";
  let values: readonly unknown[] = [];
  const matches = await findVerifiedInventoryMatches(userId, [partId], {
    pool: {
      query: async (query, parameters) => {
        sql = query;
        values = parameters;
        return { rows: [{ part_id: partId, quantity: "2", raw_label: "ESP32 DevKit" }] };
      },
    },
  });

  assert.match(sql, /i\.part_id IS NOT NULL/);
  assert.match(sql, /i\.part_id = ANY\(\$2::uuid\[\]\)/);
  assert.deepEqual(values, [userId, [partId]]);
  assert.deepEqual(matches, [{ partId, verified: true, quantity: 2, rawLabel: "ESP32 DevKit" }]);
});

test("catalog repository returns only valid cited alternatives with target provenance", async () => {
  let sql = "";
  const alternatives = await findCompatibleAlternatives(partId, {
    pool: {
      query: async (query) => {
        sql = query;
        return {
          rows: [{
            id: alternativeId,
            slug: "esp32-compatible",
            name: "ESP32-compatible board",
            category: "compute",
            electrical_specs: { voltage: "3.3V" },
            datasheet_url: "https://docs.example.test/esp32-compatible.pdf",
            cad_asset_ids: ["50000000-0000-4000-8000-000000000001"],
            citation,
            relation: "alternative",
          }],
        };
      },
    },
  });

  assert.match(sql, /c\.validity_state = 'valid'/);
  assert.match(sql, /c\.relation IN \('compatible', 'alternative'\)/);
  assert.match(sql, /NULLIF\(BTRIM\(p\.source_url\), ''\) IS NOT NULL/);
  assert.match(sql, /NULLIF\(BTRIM\(p\.license\), ''\) IS NOT NULL/);
  assert.deepEqual(alternatives[0]?.citation, citation);
  assert.equal(alternatives[0]?.part.id, alternativeId);
});

test("catalog repository filters offers by cached offer and source-document freshness", async () => {
  let sql = "";
  let values: readonly unknown[] = [];
  const now = new Date("2026-07-19T00:00:00.000Z");
  const offers = await findFreshCatalogOffers([partId], now, {
    pool: {
      query: async (query, parameters) => {
        sql = query;
        values = parameters;
        return {
          rows: [{
            external_id: "vendor:esp32:v1",
            part_id: partId,
            provider: "Example Vendor",
            provider_sku: "ESP32-DEVKIT",
            purchase_url: "https://vendor.example.test/esp32",
            availability: "in_stock",
            price: "9.99",
            currency: "USD",
            observed_at: "2026-07-18T00:00:00.000Z",
            expires_at: "2026-07-20T00:00:00.000Z",
            source_url: citation.sourceUrl,
            citation,
          }],
        };
      },
    },
  });

  assert.match(sql, /o\.expires_at > \$2/);
  assert.match(sql, /s\.expires_at > \$2/);
  assert.match(sql, /o\.thumbnail_data_url/);
  assert.match(sql, /NULLIF\(BTRIM\(s\.license\), ''\) IS NOT NULL/);
  assert.deepEqual(values, [[partId], now.toISOString()]);
  assert.equal(offers[0]?.price, 9.99);
  assert.equal(offers[0]?.availability, "in_stock");
});
