import assert from "node:assert/strict";
import test from "node:test";

import { BuildIntentSchema, SafetyDecisionSchema, type BuildIntent } from "@educational-hardware-builder/schemas";

import { callModel } from "../src/agents.js";

const safeIntent: BuildIntent = {
  normalizedGoal: "Build a USB desk light.",
  capabilities: ["low-voltage assembly"],
  exclusions: ["mains power"],
  constraints: ["usb-power-only"],
  retrievalTerms: ["USB LED module"],
  safety: { outcome: "approved", categories: ["none"], blockReasons: [], callout: "Use USB power only." },
};
const blockedIntent = {
  ...safeIntent,
  normalizedGoal: "Wire a mains desk light.",
  safety: { outcome: "blocked", categories: ["mains_ac"], blockReasons: ["mains_ac"], callout: "Mains AC is hard-blocked in Beginner mode." },
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
  assert.equal(result.value.safety.outcome, "approved");
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

test("records forbidden hazards as a hard-blocked safety decision", () => {
  const decision = SafetyDecisionSchema.parse(blockedIntent.safety);
  assert.equal(decision.outcome, "blocked");
  assert.deepEqual(decision.blockReasons, ["mains_ac"]);
  assert.throws(() => SafetyDecisionSchema.parse({ ...blockedIntent.safety, outcome: "approved" }), /Approved safety decisions cannot include block reasons/);
});
