import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApiServer, health, retrieve, type ApiDependencies } from "../src/server.js";

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

test("streams typed agent progress over the SSE endpoint", async () => {
  const server = createApiServer(dependencies());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/agents/progress`);
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    assert.match(await response.text(), /event: progress/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("serves the built workshop at the root route", async () => {
  const staticDir = await mkdtemp(join(tmpdir(), "hardware-builder-workshop-"));
  await writeFile(join(staticDir, "index.html"), "<!doctype html><title>Workshop</title>");
  const server = createApiServer(dependencies({ staticDir }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(await response.text(), /Workshop/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(staticDir, { recursive: true, force: true });
  }
});

test("server exposes every reference Workshop step and removes checkpoint grading", async () => {
  const server = createApiServer(dependencies());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const root = `http://127.0.0.1:${address.port}`;
    const sessionId = "c4-server-gate";
    const step = await fetch(`${root}/api/workshop/steps/10000000-0000-4000-8000-000000000006?sessionId=${sessionId}`);
    assert.equal(step.status, 200);
    const removedRoute = await fetch(`${root}/api/workshop/checkpoints`, { method: "POST" });
    assert.equal(removedRoute.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
