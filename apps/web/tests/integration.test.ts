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
