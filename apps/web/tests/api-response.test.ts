import assert from "node:assert/strict";
import test from "node:test";

import { parseApiJson } from "../src/api-response.js";

test("parseApiJson preserves valid API JSON", async () => {
  const payload = await parseApiJson<{ operationId: string }>(new Response(JSON.stringify({ operationId: "abc" }), {
    headers: { "content-type": "application/json" },
  }));

  assert.equal(payload.operationId, "abc");
});

test("parseApiJson makes an empty Vite-only API response actionable", async () => {
  await assert.rejects(
    parseApiJson(new Response(null, { status: 404, statusText: "Not Found" })),
    /empty response \(HTTP 404 Not Found\).*pnpm quickstart/,
  );
});

test("parseApiJson identifies a non-JSON response", async () => {
  await assert.rejects(
    parseApiJson(new Response("<html>not an API</html>", {
      status: 502,
      statusText: "Bad Gateway",
      headers: { "content-type": "text\/html" },
    })),
    /not JSON \(HTTP 502 Bad Gateway\) \(text\/html\).*pnpm quickstart/,
  );
});
