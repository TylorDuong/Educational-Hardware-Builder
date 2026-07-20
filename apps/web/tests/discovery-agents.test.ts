import assert from "node:assert/strict";
import test from "node:test";

import { BuildIntentSchema, RequestClassificationSchema, type BuildIntent } from "@educational-hardware-builder/schemas";

import { callModel } from "../src/agents.js";

const safeIntent: BuildIntent = {
  normalizedGoal: "Build a USB desk light.",
  capabilities: ["low-voltage assembly"],
  exclusions: ["mains power"],
  constraints: ["usb-power-only"],
  retrievalTerms: ["USB LED module"],
  classification: { outcome: "approved", reason: "Relevant technical hardware request." },
};
const blockedIntent = {
  ...safeIntent,
  normalizedGoal: "Wire a mains desk light.",
  classification: { outcome: "rejected", reason: "malicious", message: "Rejected malicious request." },
};

test("records a schema-valid local-model intent extraction", async () => {
  const result = await callModel({
    schema: BuildIntentSchema,
    jsonSchema: { type: "object" },
    prompt: "Interpret a beginner USB desk-light request.",
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => safeIntent,
    fetcher: (async () => Response.json({ response: JSON.stringify(safeIntent) })) as typeof fetch,
    ollamaUrl: "http://ollama.test",
  });
  assert.equal(result.source, "live");
  assert.equal(result.attempts, 1);
  assert.equal(result.value.classification.outcome, "approved");
});

test("retries malformed intent output exactly once before using the deterministic fallback", async () => {
  let calls = 0;
  const result = await callModel({
    schema: BuildIntentSchema,
    jsonSchema: { type: "object" },
    prompt: "Interpret a beginner USB desk-light request.",
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => safeIntent,
    fetcher: (async () => { calls += 1; return Response.json({ response: "not-json" }); }) as typeof fetch,
    ollamaUrl: "http://ollama.test",
  });
  assert.equal(calls, 2);
  assert.equal(result.source, "fallback");
  assert.equal(result.attempts, 2);
  assert.deepEqual(result.value, safeIntent);
});

test("records typed relevance and malicious classifications", () => {
  const decision = RequestClassificationSchema.parse(blockedIntent.classification);
  assert.equal(decision.outcome, "rejected");
  assert.equal(decision.reason, "malicious");
});
