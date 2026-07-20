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
