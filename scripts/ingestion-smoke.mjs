import { readFile } from "node:fs/promises";

const fixturePath = new URL("../ingestion/fixtures/adafruit-catalog-upsert.json", import.meta.url);
const payload = JSON.parse(await readFile(fixturePath, "utf8"));

if (payload.version !== "v2" || payload.sourcePolicyId !== "adafruit-catalog" || !payload.idempotencyKey || payload.chunks.length !== 1) {
  throw new Error("The deterministic ingestion fixture is malformed.");
}

const endpoint = process.env.INGEST_API_URL;
const token = process.env.INGEST_API_TOKEN;
if (!endpoint || !token) {
  console.log("Fixture validation passed. Set INGEST_API_URL and INGEST_API_TOKEN to run the live n8n-to-upsert smoke.");
  process.exit(0);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`Ingest smoke failed (${response.status}): ${JSON.stringify(result)}`);
if (result.status !== "accepted" || result.acceptedCount < 1) throw new Error(`Unexpected ingest result: ${JSON.stringify(result)}`);
console.log(`Ingest smoke passed: ${result.ingestionRunId}`);
