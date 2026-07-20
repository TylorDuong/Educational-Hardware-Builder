import assert from "node:assert/strict";
import test from "node:test";

import {
  findCompatibleAlternatives,
  findFreshCatalogOffers,
} from "../src/catalog.js";

const partId = "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const compatiblePartId = "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const citation = {
  sourceUrl: "https://docs.example.test/usb-light",
  locator: "Parts",
  title: "USB light guide",
};

test("catalog offer API returns only locally cached fresh offers with attributed shop links", async () => {
  const now = new Date("2026-07-19T00:00:00.000Z");
  let sql = "";
  const offers = await findFreshCatalogOffers([partId], now, {
    pool: {
      query: async (query) => {
        sql = query;
        return {
          rows: [{
            external_id: "vendor:esp32:v2",
            part_id: partId,
            provider: "Example Vendor",
            provider_sku: "ESP32-DEVKIT",
            purchase_url: "https://vendor.example.test/esp32",
            availability: "in_stock",
            price: "8.99",
            currency: "USD",
            thumbnail_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            observed_at: "2026-07-18T00:00:00.000Z",
            expires_at: "2026-07-20T00:00:00.000Z",
            source_url: citation.sourceUrl,
            citation,
          }],
        };
      },
    },
  });

  assert.match(sql, /JOIN source_documents s/);
  assert.match(sql, /o\.expires_at > \$2/);
  assert.match(sql, /s\.expires_at > \$2/);
  assert.deepEqual(offers, [{
    externalId: "vendor:esp32:v2",
    partId,
    provider: "Example Vendor",
    providerSku: "ESP32-DEVKIT",
    purchaseUrl: "https://vendor.example.test/esp32",
    availability: "in_stock",
    price: 8.99,
    currency: "USD",
    thumbnailDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    observedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-20T00:00:00.000Z",
    sourceUrl: citation.sourceUrl,
    citation,
  }]);
});

test("catalog compatibility API returns only cited, provenance-backed alternatives", async () => {
  const alternatives = await findCompatibleAlternatives(partId, {
    pool: {
      query: async () => ({
        rows: [{
          id: compatiblePartId,
          slug: "esp32-compatible",
          name: "ESP32-compatible board",
          category: "compute",
          electrical_specs: { voltage: "3.3V" },
          datasheet_url: "https://docs.example.test/esp32-compatible.pdf",
          cad_asset_ids: [],
          citation,
          relation: "compatible",
        }],
      }),
    },
  });

  assert.deepEqual(alternatives, [{
    part: {
      id: compatiblePartId,
      slug: "esp32-compatible",
      name: "ESP32-compatible board",
      category: "compute",
      electricalSpecs: { voltage: "3.3V" },
      datasheetUrl: "https://docs.example.test/esp32-compatible.pdf",
      cadAssetIds: [],
    },
    citation,
    relation: "compatible",
  }]);
});
