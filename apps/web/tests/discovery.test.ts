import assert from "node:assert/strict";
import test from "node:test";

import { WorkshopPromotionResponseSchema } from "@educational-hardware-builder/schemas";
import { createApiServer, type ApiDependencies } from "../src/server.js";

const userId = "40000000-0000-4000-8000-000000000001";
const partId = "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const alternativePartId = "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const citation = {
  sourceUrl: "https://example.test/usb-led-guide",
  locator: "Assembly",
  title: "USB LED guide",
};
const safeIntent = {
  normalizedGoal: "Build a USB desk light.",
  capabilities: ["low-voltage assembly"],
  exclusions: ["mains power"],
  constraints: ["usb-power-only"],
  retrievalTerms: ["USB LED module"],
  safety: { outcome: "approved", categories: ["none"], blockReasons: [], callout: "Use USB power only." },
};
const catalogAlternative = {
  id: alternativePartId,
  slug: "esp32-compatible",
  name: "ESP32-compatible board",
  category: "compute",
  electrical_specs: { voltage: "3.3V" },
  datasheet_url: "https://docs.example.test/esp32-compatible.pdf",
  cad_asset_ids: [],
  citation,
  relation: "alternative",
};
const freshOffer = {
  external_id: "vendor:esp32:v1",
  part_id: partId,
  provider: "Example Vendor",
  provider_sku: "ESP32-DEVKIT",
  purchase_url: "https://vendor.example.test/esp32",
  availability: "in_stock",
  price: "9.99",
  currency: "USD",
  observed_at: "2026-07-18T00:00:00.000Z",
  expires_at: "2099-07-20T00:00:00.000Z",
  source_url: citation.sourceUrl,
  citation,
};

type GenerateResponse = (call: number) => Response | Promise<Response>;

function dependencies(overrides: Partial<ApiDependencies> = {}, generate: GenerateResponse = () => Response.json({ response: JSON.stringify(safeIntent) })): ApiDependencies {
  let generateCalls = 0;
  return {
    pool: {
      query: async (query: string) => {
        if (query.includes("FROM user_inventory")) {
          return { rows: [{ part_id: partId, quantity: "2", raw_label: "ESP32 DevKit" }] };
        }
        if (query.includes("FROM compatibility_records")) return { rows: [catalogAlternative] };
        if (query.includes("FROM catalog_offers")) return { rows: [freshOffer] };
        return { rows: [{
          id: "d2719a8a-8cc8-4c52-babb-455a70b1f631",
          content: "Connect the LED module only to the USB power path.",
          citation,
          score: 0.91,
        }] };
      },
    } as unknown as ApiDependencies["pool"],
    fetcher: (async (url: string | URL) => {
      if (String(url).endsWith("/api/embed")) {
        return Response.json({ embeddings: [Array.from({ length: 768 }, () => 0.01)] });
      }
      if (String(url).endsWith("/api/generate")) return generate(++generateCalls);
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

async function startDiscovery(root: string, prompt: string, inventoryPartIds: string[] = []): Promise<string> {
  const response = await fetch(`${root}/api/discovery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, mode: "beginner", userId, inventoryPartIds, constraints: ["usb-power-only"] }),
  });
  assert.equal(response.status, 202);
  const payload = await response.json() as { operationId: string; status: string };
  assert.equal(payload.status, "queued");
  return payload.operationId;
}

test("discovery API returns a cited safe proposal and typed progress events", async () => {
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "I want a beginner USB desk light.");
    const status = await fetch(`${root}/api/discovery/${operationId}`);
    assert.equal(status.status, 200);
    const payload = await status.json() as { status: string; safety: { outcome: string }; proposal: { summary: string; citations: typeof citation[] } };
    assert.equal(payload.status, "complete");
    assert.equal(payload.safety.outcome, "approved");
    assert.equal(payload.proposal.summary, safeIntent.normalizedGoal);
    assert.deepEqual(payload.proposal.citations, [citation]);

    const rankedBom = (payload.proposal as typeof payload.proposal & {
      billOfMaterials: Array<{
        quantity: number;
        offers: Array<{ availability: string; purchaseUrl: string; sourceUrl: string }>;
        alternatives: Array<{ id: string }>;
        freshness: string;
      }>;
    }).billOfMaterials;
    assert.equal(rankedBom.length, 1);
    assert.equal(rankedBom[0]?.quantity, 1);
    assert.equal(rankedBom[0]?.freshness, "fresh");
    assert.equal(rankedBom[0]?.offers.length, 1);
    assert.equal(rankedBom[0]?.offers[0]?.availability, "in_stock");
    assert.equal(rankedBom[0]?.offers[0]?.purchaseUrl, freshOffer.purchase_url);
    assert.equal(rankedBom[0]?.offers[0]?.sourceUrl, citation.sourceUrl);
    assert.equal(rankedBom[0]?.alternatives[0]?.id, alternativePartId);

    const events = await fetch(`${root}/api/discovery/${operationId}/events`);
    assert.equal(events.headers.get("content-type"), "text/event-stream");
    const stream = await events.text();
    for (const stage of ["queued", "safety", "intent", "retrieving", "catalog", "complete"]) {
      assert.match(stream, new RegExp(`\\\"stage\\\":\\\"${stage}\\\"`));
    }
  });
});

test("selected discovery proposal returns a public cited lesson without checkpoint answers", async () => {
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "I want a beginner USB desk light.");
    const response = await fetch(`${root}/api/discovery/${operationId}/select`, { method: "POST" });
    assert.equal(response.status, 200);
    const promotion = WorkshopPromotionResponseSchema.parse(await response.json());
    assert.equal(promotion.buildId, "30000000-0000-4000-8000-000000000001");
    assert.ok(promotion.lesson.steps[0]?.citations.length);
    assert.ok(promotion.lesson.troubleshooting.length);
    assert.equal("correctAnswer" in (promotion.lesson.steps[0]?.checkpoint ?? {}), false);
  }, dependencies({ demoSafeMode: true }));
});

test("discovery prefers verified inventory and labels an unavailable cached offer stale", async () => {
  const deps = dependencies({
    pool: {
      query: async (query: string) => {
        if (query.includes("FROM user_inventory")) {
          return { rows: [{ part_id: partId, quantity: "2", raw_label: "ESP32 DevKit" }] };
        }
        if (query.includes("FROM compatibility_records")) return { rows: [catalogAlternative] };
        if (query.includes("FROM catalog_offers")) return { rows: [{ ...freshOffer, availability: "out_of_stock" }] };
        return { rows: [{
          id: "d2719a8a-8cc8-4c52-babb-455a70b1f631",
          content: "Connect the LED module only to the USB power path.",
          citation,
          score: 0.91,
        }] };
      },
    } as ApiDependencies["pool"],
  });
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "I already own an ESP32 and want a USB desk light.", [partId]);
    const payload = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as {
      status: string;
      proposal: {
        billOfMaterials: Array<{
          inventoryMatch: { partId: string; verified: boolean; quantity: number } | null;
          offers: unknown[];
          alternatives: Array<{ id: string }>;
          freshness: string;
        }>;
      };
    };
    const entry = payload.proposal.billOfMaterials[0];
    assert.equal(payload.status, "complete");
    assert.equal(entry?.inventoryMatch?.partId, partId);
    assert.equal(entry?.inventoryMatch?.verified, true);
    assert.equal(entry?.inventoryMatch?.quantity, 2);
    assert.deepEqual(entry?.offers, []);
    assert.equal(entry?.alternatives[0]?.id, alternativePartId);
    assert.equal(entry?.freshness, "stale");
  }, deps);
});

test("discovery API accepts a vague learner request and returns a typed local proposal", async () => {
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "Help me make something simple.");
    const status = await fetch(`${root}/api/discovery/${operationId}`);
    const payload = await status.json() as { status: string; proposal: { billOfMaterials: unknown[]; citations: typeof citation[] } };
    assert.equal(payload.status, "complete");
    assert.equal(payload.proposal.billOfMaterials.length, 1);
    assert.deepEqual(payload.proposal.citations, [citation]);
  });
});

test("discovery API hard-blocks mains requests before retrieval or proposal generation", async () => {
  let embeddingCalls = 0;
  const deps = dependencies({
    fetcher: (async (url: string | URL) => {
      if (String(url).endsWith("/api/embed")) embeddingCalls += 1;
      if (String(url).endsWith("/api/generate")) return Response.json({ response: JSON.stringify(safeIntent) });
      return Response.json({ models: [] });
    }) as ApiDependencies["fetcher"],
  });
  await withServer(async (root) => {
    const operationId = await startDiscovery(root, "Wire a 120 V mains desk light.");
    const status = await fetch(`${root}/api/discovery/${operationId}`);
    const payload = await status.json() as { status: string; safety: { outcome: string; blockReasons: string[] }; proposal: null };
    assert.equal(payload.status, "blocked");
    assert.equal(payload.safety.outcome, "blocked");
    assert.deepEqual(payload.safety.blockReasons, ["mains_ac"]);
    assert.equal(payload.proposal, null);
    assert.equal(embeddingCalls, 0);

    const stream = await (await fetch(`${root}/api/discovery/${operationId}/events`)).text();
    assert.match(stream, /\"stage\":\"blocked\"/);
    assert.doesNotMatch(stream, /\"stage\":\"retrieving\"/);
  }, deps);
});

test("discovery API retries malformed model output once and returns the deterministic fallback", async () => {
  let calls = 0;
  const deps = dependencies({}, () => {
    calls += 1;
    return Response.json({ response: "not-json" });
  });
  await withServer(async (root) => {
    const prompt = "Build a beginner USB desk light.";
    const operationId = await startDiscovery(root, prompt);
    const payload = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as { status: string; proposal: { summary: string } };
    assert.equal(payload.status, "complete");
    assert.equal(calls, 2);
    assert.equal(payload.proposal.summary, prompt);
  }, deps);
});

test("discovery API uses the safe-mode fallback without calling the local model", async () => {
  let modelCalls = 0;
  const deps = dependencies({
    demoSafeMode: true,
    fetcher: (async (url: string | URL) => {
      if (String(url).endsWith("/api/generate")) modelCalls += 1;
      if (String(url).endsWith("/api/embed")) return Response.json({ embeddings: [Array.from({ length: 768 }, () => 0.01)] });
      return Response.json({ models: [] });
    }) as ApiDependencies["fetcher"],
  });
  await withServer(async (root) => {
    const prompt = "Build a beginner USB desk light.";
    const operationId = await startDiscovery(root, prompt);
    const payload = await (await fetch(`${root}/api/discovery/${operationId}`)).json() as { status: string; proposal: { summary: string } };
    assert.equal(payload.status, "complete");
    assert.equal(payload.proposal.summary, prompt);
    assert.equal(modelCalls, 0);
  }, deps);
});
