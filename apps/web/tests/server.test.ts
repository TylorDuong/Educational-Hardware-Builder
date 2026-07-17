import assert from "node:assert/strict";
import test from "node:test";

import { health, retrieve, type ApiDependencies } from "../src/server.js";

const citation = {
  sourceUrl: "https://example.test/bme280",
  locator: "Wiring",
  title: "BME280 guide",
};

function dependencies(overrides: Partial<ApiDependencies> = {}): ApiDependencies {
  return {
    pool: {
      query: async (sql: string) => sql === "SELECT 1"
        ? { rows: [] }
        : { rows: [{ id: "d2719a8a-8cc8-4c52-babb-455a70b1f631", content: "Connect SDA and SCL to the selected ESP32 I2C pins.", citation, score: 0.91 }] },
    } as ApiDependencies["pool"],
    fetcher: (async (url: string | URL) => {
      if (String(url).endsWith("/api/embed")) return Response.json({ embeddings: [Array.from({ length: 768 }, () => 0.01)] });
      return Response.json({ models: [{ name: "nomic-embed-text" }] });
    }) as ApiDependencies["fetcher"],
    ollamaUrl: "http://ollama.test",
    ...overrides,
  };
}

test("retrieves a cited BME280 result with a mocked local embedding model", async () => {
  const result = await retrieve({ query: "connect BME280 to ESP32" }, dependencies());
  assert.equal(result.length, 1);
  assert.deepEqual(result[0]?.citations, [citation]);
  assert.equal(result[0]?.score, 0.91);
});

test("rejects malformed retrieval requests before querying dependencies", async () => {
  await assert.rejects(() => retrieve({ query: "" }, dependencies()), { status: 400 });
});

test("reports a degraded health state when local dependencies are unavailable", async () => {
  const unavailable = dependencies({
    pool: { query: async () => { throw new Error("database offline"); } } as ApiDependencies["pool"],
    fetcher: (async () => { throw new Error("ollama offline"); }) as ApiDependencies["fetcher"],
  });
  assert.deepEqual(await health(unavailable), {
    status: "degraded",
    database: "unavailable",
    ollama: "unavailable",
    models: [],
    vramMb: null,
    recommendedModelTier: "cpu-safe",
  });
});
