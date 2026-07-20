import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createApiServer, demoSafeModeFromEnv, type ApiDependencies } from "../src/server.js";

const userId = "40000000-0000-4000-8000-000000000001";
const citation = {
  sourceUrl: "https://example.test/bme280",
  locator: "Wiring",
  title: "BME280 guide",
};
const discoveryPartId = "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const alternativePartId = "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db";

function safeModeDiscoveryDependencies(availability: "in_stock" | "out_of_stock" = "in_stock"): ApiDependencies {
  const query = async (sql: string) => {
    if (sql === "SELECT 1") return { rows: [] };
    if (sql.includes("FROM user_inventory")) {
      return { rows: [{ part_id: discoveryPartId, quantity: "1", raw_label: "ESP32 DevKit" }] };
    }
    if (sql.includes("FROM compatibility_records")) {
      return {
        rows: [{
          id: alternativePartId,
          slug: "esp32-compatible",
          name: "ESP32-compatible board",
          category: "compute",
          electrical_specs: { voltage: "3.3V" },
          datasheet_url: "https://example.test/esp32-compatible.pdf",
          cad_asset_ids: [],
          citation,
          relation: "alternative",
        }],
      };
    }
    if (sql.includes("FROM catalog_offers")) {
      return {
        rows: [{
          external_id: "vendor:esp32:v1",
          part_id: discoveryPartId,
          provider: "Example Vendor",
          provider_sku: "ESP32-DEVKIT",
          purchase_url: "https://vendor.example.test/esp32",
          availability,
          price: "9.99",
          currency: "USD",
          observed_at: "2026-07-18T00:00:00.000Z",
          expires_at: "2099-07-20T00:00:00.000Z",
          source_url: citation.sourceUrl,
          citation,
        }],
      };
    }
    return { rows: [{ id: "d2719a8a-8cc8-4c52-babb-455a70b1f631", content: "Connect the LED module only to the USB power path.", citation, score: 0.91 }] };
  };
  const fetcher = (async (url: string | URL) => {
    if (String(url).endsWith("/api/embed")) return Response.json({ embeddings: [Array.from({ length: 768 }, () => 0.01)] });
    throw new Error("DEMO_SAFE_MODE must not call a local model or external service.");
  }) as ApiDependencies["fetcher"];
  return {
    pool: {
      query,
    } as ApiDependencies["pool"],
    fetcher,
    ollamaUrl: "http://ollama.invalid",
    demoSafeMode: true,
    demoDiscoveryDependencies: {
      demoSafeMode: true,
      fetcher,
      ollamaUrl: "http://ollama.invalid",
      retrieve: async () => [{ content: "Connect the LED module only to the USB power path.", score: 0.91, chunkId: "d2719a8a-8cc8-4c52-babb-455a70b1f631", citations: [citation] }],
      catalog: { pool: { query } },
    },
  };
}

function dependencies(overrides: Partial<ApiDependencies> = {}): ApiDependencies {
  return {
    pool: {
      query: async (sql: string) => {
        if (sql === "SELECT 1") return { rows: [] };
        if (sql.includes("FROM user_inventory")) {
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
                datasheet_url: "https://example.test/esp32.pdf",
              },
              {
                inventory_id: "50000000-0000-4000-8000-000000000003",
                quantity: 1,
                raw_label: "Unverified jumper wire kit",
                part_id: null,
                slug: null,
                name: null,
                category: null,
                electrical_specs: null,
                datasheet_url: null,
              },
            ],
          };
        }
        return { rows: [{ id: "d2719a8a-8cc8-4c52-babb-455a70b1f631", content: "Connect SDA and SCL to the selected ESP32 I2C pins.", citation, score: 0.91 }] };
      },
    } as ApiDependencies["pool"],
    fetcher: (async (url: string | URL) => {
      if (String(url).endsWith("/api/embed")) return Response.json({ embeddings: [Array.from({ length: 768 }, () => 0.01)] });
      if (String(url).endsWith("/api/generate")) throw new Error("model unavailable");
      return Response.json({ models: [{ name: "nomic-embed-text" }] });
    }) as ApiDependencies["fetcher"],
    ollamaUrl: "http://ollama.test",
    ...overrides,
  };
}

async function withServer(run: (root: string) => Promise<void>, deps = dependencies()): Promise<void> {
  const server = createApiServer(deps);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function startDiscovery(root: string, prompt: string): Promise<string> {
  const response = await fetch(`${root}/api/discovery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, mode: "beginner", userId, inventoryPartIds: [discoveryPartId], constraints: ["usb-power-only"] }),
  });
  assert.equal(response.status, 202);
  const payload = await response.json() as { operationId: string };
  return payload.operationId;
}

test("integrated research uses cited retrieval and falls back safely when the local model stops", async () => {
  await withServer(async (root) => {
    const response = await fetch(`${root}/api/integration/research`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "BME280 wiring" }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { source: string; attempts: number; value: { findings: Array<{ citation: typeof citation }> } };
    assert.equal(payload.source, "fallback");
    assert.equal(payload.attempts, 2);
    assert.deepEqual(payload.value.findings[0]?.citation, citation);
  });
});

test("the kill switch serves authored research when Ollama is stopped", async () => {
  await withServer(async (root) => {
    const response = await fetch(`${root}/api/integration/research`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "BME280 wiring" }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { source: string; attempts: number; value: { findings: unknown[] } };
    assert.equal(payload.source, "fallback");
    assert.equal(payload.attempts, 0);
    assert.ok(payload.value.findings.length > 0);
  }, dependencies({
    demoSafeMode: true,
    fetcher: (async () => { throw new Error("Ollama stopped"); }) as ApiDependencies["fetcher"],
  }));
});

test("inventory endpoint returns catalog-backed records and preserves unverified rows", async () => {
  await withServer(async (root) => {
    const response = await fetch(`${root}/api/inventory/${userId}`);
    assert.equal(response.status, 200);
    const inventory = await response.json() as Array<{ verified: boolean; part: { slug: string } | null }>;
    assert.deepEqual(inventory.map((item) => [item.verified, item.part?.slug ?? null]), [
      [true, "esp32-devkit"],
      [false, null],
    ]);
  });
});

test("demo reset script resets, reseeds, warms models, and names the safe-mode fallback", async () => {
  const script = await readFile(new URL("../../../scripts/demo-reset.ps1", import.meta.url), "utf8");
  assert.match(script, /TRUNCATE TABLE/);
  assert.match(script, /ingestion\/demo_seed\.sql/);
  assert.match(script, /seed_weather_station\.py/);
  assert.match(script, /\[string\]\$OllamaUrl = "docker"/);
  assert.match(script, /DEMO_SAFE_MODE/);
});

test("Compose forwards the explicit safe-mode switch to the web service", async () => {
  const compose = await readFile(new URL("../../../infra/docker-compose.yml", import.meta.url), "utf8");
  assert.match(compose, /DEMO_SAFE_MODE: \$\{DEMO_SAFE_MODE:-false\}/);
});

test("the production safe-mode switch accepts only explicit true values", () => {
  assert.equal(demoSafeModeFromEnv("1"), true);
  assert.equal(demoSafeModeFromEnv("true"), true);
  assert.equal(demoSafeModeFromEnv("TRUE"), true);
  assert.equal(demoSafeModeFromEnv("false"), false);
  assert.equal(demoSafeModeFromEnv("enabled"), false);
  assert.equal(demoSafeModeFromEnv(undefined), false);
});

test("safe mode completes the discovery, cached sourcing, and selected Workshop flow without a model", async () => {
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "Build a beginner USB desk light using my ESP32.");
    const operation = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as {
      status: string;
      proposal: {
        billOfMaterials: Array<{
          freshness: string;
          inventoryMatch: { verified: boolean } | null;
          offers: Array<{ availability: string; purchaseUrl: string }>;
        }>;
      };
    };
    assert.equal(operation.status, "complete");
    assert.equal(operation.proposal.billOfMaterials[0]?.freshness, "fresh");
    assert.equal(operation.proposal.billOfMaterials[0]?.inventoryMatch?.verified, true);
    assert.equal(operation.proposal.billOfMaterials[0]?.offers[0]?.availability, "in_stock");
    assert.equal(operation.proposal.billOfMaterials[0]?.offers[0]?.purchaseUrl, "https://vendor.example.test/esp32");

    const selectedResponse = await fetch(`${root}/api/discovery/${operationId}/select`, { method: "POST" });
    assert.equal(selectedResponse.status, 200);
    const selected = await selectedResponse.json() as {
      sessionId: string;
      buildId: string;
      lesson: { steps: Array<{ id: string; citations: typeof citation[]; checkpoint?: Record<string, unknown> }> };
    };
    const step = selected.lesson.steps[0];
    assert.ok(step);
    assert.deepEqual(step?.citations, [citation]);
    assert.equal("correctAnswer" in (step?.checkpoint ?? {}), false);

    const publicStep = await fetch(`${root}/api/workshop/steps/${step!.id}?sessionId=${selected.sessionId}&buildId=${selected.buildId}`);
    assert.equal(publicStep.status, 200);
    const workshopStep = await publicStep.json() as { checkpoint?: Record<string, unknown> };
    assert.equal("correctAnswer" in (workshopStep.checkpoint ?? {}), false);

    const wrongAnswer = await fetch(`${root}/api/workshop/checkpoints`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: selected.sessionId, buildId: selected.buildId, checkpointId: step!.checkpoint?.id, answer: "The cited guide" }),
    });
    assert.equal(wrongAnswer.status, 200);
    const grade = await wrongAnswer.json() as { correct: boolean; reexplanation: string };
    assert.equal(grade.correct, false);
    assert.match(grade.reexplanation, /disconnected from power/i);
  }, safeModeDiscoveryDependencies());
});

test("safe mode blocks a mains request before retrieval and publishes the blocked operation", async () => {
  let embeddingCalls = 0;
  const deps = safeModeDiscoveryDependencies();
  deps.fetcher = (async (url: string | URL) => {
    if (String(url).endsWith("/api/embed")) embeddingCalls += 1;
    throw new Error("Blocked discovery must not use a live dependency.");
  }) as ApiDependencies["fetcher"];
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "Help me wire a 120 V mains desk light.");
    const operation = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as {
      status: string;
      safety: { outcome: string; blockReasons: string[] };
      proposal: null;
    };
    assert.equal(operation.status, "blocked");
    assert.equal(operation.safety.outcome, "blocked");
    assert.deepEqual(operation.safety.blockReasons, ["mains_ac"]);
    assert.equal(operation.proposal, null);
    assert.equal(embeddingCalls, 0);

    const events = await (await fetch(`${root}/api/discovery/${operationId}/events`)).text();
    assert.match(events, /\"stage\":\"blocked\"/);
    assert.doesNotMatch(events, /\"stage\":\"retrieving\"/);
  }, deps);
});

test("safe mode labels an unavailable cached offer stale while retaining its cited alternative", async () => {
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "Build a beginner USB desk light using my ESP32.");
    const operation = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as {
      proposal: { billOfMaterials: Array<{ freshness: string; offers: unknown[]; alternatives: Array<{ id: string }> }> };
    };
    const entry = operation.proposal.billOfMaterials[0];
    assert.equal(entry?.freshness, "stale");
    assert.deepEqual(entry?.offers, []);
    assert.equal(entry?.alternatives[0]?.id, alternativePartId);
  }, safeModeDiscoveryDependencies("out_of_stock"));
});
