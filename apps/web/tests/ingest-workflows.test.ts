import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowFiles = [
  "vendor-catalog-refresh.json",
  "documentation-refresh.json",
] as const;

test("allowlisted ingestion workflows derive SHA-256 provenance from fetched content", async () => {
  for (const filename of workflowFiles) {
    const source = await readFile(new URL(`../../../ingestion/workflows/${filename}`, import.meta.url), "utf8");
    const workflow = JSON.parse(source) as { nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }> };
    const payloadNode = workflow.nodes.find((node) => node.name.startsWith("Build typed"));
    const codeValue = payloadNode?.parameters?.jsCode;
    const code = typeof codeValue === "string" ? codeValue : "";
    const hashNode = workflow.nodes.find((node) => node.name === "Hash fetched content");

    assert.doesNotMatch(code, /REPLACE_WITH_SHA256/);
    assert.equal(hashNode?.type, "n8n-nodes-base.crypto");
    assert.deepEqual(hashNode?.parameters, {
      action: "hash",
      type: "SHA256",
      binaryData: false,
      value: "={{ typeof $json.body === 'string' ? $json.body : typeof $json.data === 'string' ? $json.data : JSON.stringify($json) }}",
      dataPropertyName: "contentHash",
      encoding: "hex",
    });
    assert.match(code, /const \{ contentHash, \.\.\.sourceResponse \} = \$json/);
    assert.match(code, /contentHash,/);
    assert.match(code, /const chunkContent = content\.slice\(0, 50_000\)/);
    assert.match(code, /content: chunkContent/);
  }
});

test("eBay workflow caches filtered US listing images and sends them only through the ingest API", async () => {
  const source = await readFile(new URL("../../../ingestion/workflows/ebay-browse-catalog-refresh.json", import.meta.url), "utf8");
  const workflow = JSON.parse(source) as { nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }> };
  const names = workflow.nodes.map((node) => node.name);
  const payloadNode = workflow.nodes.find((node) => node.name === "Build typed eBay catalog payload");
  const payloadCode = payloadNode?.parameters?.jsCode;
  const code = typeof payloadCode === "string" ? payloadCode : "";

  assert.ok(names.includes("Request eBay application token"));
  assert.ok(names.includes("Search approved US fixed-price listings"));
  assert.ok(names.includes("Download eBay thumbnail for local cache"));
  assert.ok(names.includes("Application ingest upsert"));
  assert.match(source, /deliveryCountry:US/);
  assert.match(source, /FIXED_PRICE/);
  assert.match(code, /thumbnailDataUrl/);
  assert.match(code, /sourcePolicyId: 'ebay-browse-catalog'/);
  assert.doesNotMatch(code, /postgres|DATABASE_URL/i);
});
