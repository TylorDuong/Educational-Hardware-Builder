import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { listInventoryParts } from "../src/integration.js";

const userId = "40000000-0000-4000-8000-000000000001";

async function migration(): Promise<string> {
  return readFile(new URL("../../../infra/postgres/init/0002-agentic-build-discovery.sql", import.meta.url), "utf8");
}

test("migration enforces idempotent source and ingestion identities", async () => {
  const sql = await migration();

  assert.match(sql, /INSERT INTO source_policies/);
  assert.match(sql, /'adafruit-catalog', 1, true, 'vendor_catalog'/);
  assert.match(sql, /ON CONFLICT \(id, revision\) DO UPDATE SET/);
  assert.match(sql, /UNIQUE \(source_policy_id, source_policy_revision, external_id, content_hash\)/);
  assert.match(sql, /UNIQUE \(source_policy_id, source_policy_revision, idempotency_key\)/);
  assert.match(sql, /FOREIGN KEY \(source_policy_id, source_policy_revision\) REFERENCES source_policies \(id, revision\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS ingestion_runs_status_started_idx/);
});

test("migration keeps cached offers honest about freshness and provenance", async () => {
  const sql = await migration();

  assert.match(sql, /CREATE TABLE IF NOT EXISTS catalog_offers/);
  assert.match(sql, /source_document_id uuid NOT NULL REFERENCES source_documents\(id\)/);
  assert.match(sql, /CHECK \(purchase_url ~ '\^https:\/\/'\)/);
  assert.match(sql, /CHECK \(\(price IS NULL AND currency IS NULL\) OR \(price > 0 AND currency ~ '\^\[A-Z\]\{3\}\$'\)\)/);
  assert.match(sql, /CHECK \(expires_at >= observed_at\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS catalog_offers_part_freshness_idx/);
});

test("migration requires source license evidence and excludes transform storage", async () => {
  const sql = await migration();

  assert.match(sql, /license text NOT NULL/);
  assert.match(sql, /CHECK \(length\(trim\(license\)\) > 0\)/);
  assert.match(sql, /cad_asset_rules jsonb/);
  assert.match(sql, /symbolic_mating_selections jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.doesNotMatch(sql, /position_mm|quaternion|transform_matrix/);
});

test("migration preserves a single selected proposal and blocked-request safety state", async () => {
  const sql = await migration();

  assert.match(sql, /CHECK \(status <> 'blocked' OR safety_outcome = 'blocked'\)/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS build_proposals_one_selected_per_request_idx/);
  assert.match(sql, /ON build_proposals \(discovery_request_id\) WHERE selected/);
});

test("catalog inventory SQL retains verified and unverified rows distinctly", async () => {
  let queryText = "";
  let values: readonly unknown[] = [];
  const inventory = await listInventoryParts(userId, {
    pool: {
      query: async (sql, parameters) => {
        queryText = sql;
        values = parameters;
        return {
          rows: [
            {
              inventory_id: "50000000-0000-4000-8000-000000000001",
              quantity: 1,
              raw_label: "ESP32 DevKit",
              part_id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
              slug: "esp32-devkit",
              name: "ESP32 DevKit",
              category: "compute",
              electrical_specs: { voltage: "3.3V" },
              datasheet_url: "https://docs.example.test/esp32.pdf",
            },
            {
              inventory_id: "50000000-0000-4000-8000-000000000002",
              quantity: 2,
              raw_label: "Mystery jumper wires",
              part_id: null,
              slug: null,
              name: null,
              category: null,
              electrical_specs: null,
              datasheet_url: null,
            },
          ],
        };
      },
    },
  });

  assert.match(queryText, /FROM user_inventory i/);
  assert.match(queryText, /LEFT JOIN parts_catalog p ON p.id = i.part_id/);
  assert.deepEqual(values, [userId]);
  assert.deepEqual(inventory.map((item) => [item.verified, item.part?.slug ?? null, item.quantity]), [
    [true, "esp32-devkit", 1],
    [false, null, 2],
  ]);
});
