import assert from "node:assert/strict";
import test from "node:test";

import {
  BuildProposalSchema,
  GuidedLessonSchema,
} from "@educational-hardware-builder/schemas";

import { generateGuidedLesson } from "../src/discovery.js";

const proposalId = "30000000-0000-4000-8000-000000000001";
const primaryPartId = "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const alternativePartId = "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db";
const citation = {
  sourceUrl: "https://docs.example.test/usb-led-guide",
  locator: "Assembly",
  title: "USB LED guide",
};

const proposal = BuildProposalSchema.parse({
  id: proposalId,
  discoveryRequestId: "20000000-0000-4000-8000-000000000001",
  intent: {
    normalizedGoal: "Build a USB desk light.",
    capabilities: ["low-voltage assembly"],
    exclusions: ["mains power"],
    constraints: ["usb-power-only"],
    retrievalTerms: ["USB LED module"],
    classification: { outcome: "approved", reason: "Relevant technical hardware request." },
  },
  classification: { outcome: "approved", reason: "Relevant technical hardware request." },
  summary: "Build a USB desk light.",
  billOfMaterials: [{
    part: { id: primaryPartId, slug: "esp32-devkit", name: "ESP32 DevKit", category: "compute", electricalSpecs: {}, cadAssetIds: [] },
    quantity: 1,
    rationale: "Supported by the local catalog.",
    citations: [citation],
    inventoryMatch: null,
    offers: [],
    alternatives: [],
    freshness: "fresh",
  }],
  citations: [citation],
  freshness: "fresh",
  selected: true,
});

const lesson = {
  proposalId,
  title: "USB desk-light lesson",
  steps: [{
    id: "10000000-0000-4000-8000-000000000001",
    order: 1,
    title: "Prepare the USB-powered parts",
    safetyCategory: "soldering",
    safetyCallout: "Unplug USB power before making or changing connections.",
    instruction: "Place the ESP32 and LED module on the work surface.",
    completionCondition: "Both parts are visible and disconnected from power.",
    whyItMatters: "Separating preparation from power helps a learner inspect the named parts and connections first.",
    concepts: [{
      title: "Power path",
      explanation: "The source and destination of the USB connection should be traceable before it is energized.",
    }],
    sourceDigest: {
      summary: "The cited USB guide keeps the LED on the USB power path, so prepare the parts while power is disconnected and trace the connection before you energize it.",
      citation,
    },
    citations: [citation],
    skills: [{ ...citation, relevance: "Explains the USB power connection for this step." }],
    matingSelections: [{
      movingPartId: primaryPartId,
      movingFeatureId: "mounting-hole-a",
      targetPartId: alternativePartId,
      targetFeatureId: "mounting-hole-b",
    }],
  }],
  troubleshooting: [{
    problem: "The LED does not illuminate.",
    explanation: "Confirm the USB power path remains disconnected while checking each connection.",
    citations: [citation],
  }],
};

const citationKey = (value: typeof citation): string => `${value.sourceUrl}\u0000${value.locator}\u0000${value.title}`;

test("proposal promotion contract keeps an approved selected proposal and a cited, safety-first lesson together", () => {
  const parsedLesson = GuidedLessonSchema.parse(lesson);
  assert.equal(proposal.selected, true);
  assert.equal(parsedLesson.proposalId, proposal.id);

  const proposalCitations = new Set(proposal.citations.map(citationKey));
  for (const step of parsedLesson.steps) {
    assert.ok(step.citations.every((stepCitation) => proposalCitations.has(citationKey(stepCitation))));
    assert.ok(Object.keys(step).indexOf("safetyCallout") < Object.keys(step).indexOf("instruction"));
  }
  for (const item of parsedLesson.troubleshooting) {
    assert.ok(item.citations.every((itemCitation) => proposalCitations.has(citationKey(itemCitation))));
  }
});

test("guided lesson contract exposes cited skills without checkpoint data", () => {
  const parsedLesson = GuidedLessonSchema.parse(lesson);
  assert.equal("checkpoint" in (parsedLesson.steps[0] ?? {}), false);
  assert.ok(parsedLesson.steps[0]?.skills.length);
  assert.match(parsedLesson.steps[0]?.whyItMatters ?? "", /inspect/i);
  assert.equal(parsedLesson.steps[0]?.concepts[0]?.title, "Power path");
  assert.match(parsedLesson.steps[0]?.sourceDigest.summary ?? "", /USB guide/i);
  assert.deepEqual(parsedLesson.steps[0]?.sourceDigest.citation, citation);
});

test("guided lesson contract rejects uncited steps and raw coordinate or transform leaks", () => {
  const uncited = structuredClone(lesson);
  uncited.steps[0]!.citations = [];
  assert.equal(GuidedLessonSchema.safeParse(uncited).success, false);

  const coordinateLeak = {
    ...lesson,
    steps: lesson.steps.map((step) => ({
      ...step,
      matingSelections: step.matingSelections.map((selection) => ({
        ...selection,
        positionMm: [1, 2, 3],
        quaternion: [0, 0, 0, 1],
      })),
    })),
  };
  assert.equal(GuidedLessonSchema.safeParse(coordinateLeak).success, false);
});

test("guided lesson generation retries an uncited model result and accepts a proposal-cited correction", async () => {
  let calls = 0;
  const uncited = structuredClone(lesson);
  uncited.steps[0]!.citations = [{ sourceUrl: "https://other.example.test/unsafe", locator: "Other", title: "Other source" }];
  const result = await generateGuidedLesson(proposal, {
    retrieve: async () => [],
    fetcher: (async () => {
      calls += 1;
      return Response.json({ response: JSON.stringify(calls === 1 ? uncited : lesson) });
    }) as typeof fetch,
    ollamaUrl: "http://ollama.test",
  });
  assert.equal(calls, 2);
  assert.equal(result.source, "live");
  assert.equal(result.attempts, 2);
  assert.equal(result.value.proposalId, proposal.id);
  assert.deepEqual(result.value.steps[0]?.citations, [citation]);
});

test("guided lesson generation gives the lesson agent local cited excerpts to digest", async () => {
  let prompt = "";
  const result = await generateGuidedLesson(proposal, {
    retrieve: async () => [{
      chunkId: "d2719a8a-8cc8-4c52-babb-455a70b1f631",
      content: "The guide keeps the LED module on the USB power path.",
      score: 0.91,
      citations: [citation],
    }],
    fetcher: (async (_url, init) => {
      prompt = String(init?.body);
      return Response.json({ response: JSON.stringify(lesson) });
    }) as typeof fetch,
    ollamaUrl: "http://ollama.test",
  });

  assert.equal(result.source, "live");
  assert.match(prompt, /Grounded local source excerpts/);
  assert.match(prompt, /LED module on the USB power path/);
  assert.match(prompt, /sourceDigest/);
});

test("guided lesson generation uses the deterministic cited fixture fallback in safe mode", async () => {
  let modelCalls = 0;
  const result = await generateGuidedLesson(proposal, {
    retrieve: async () => [],
    fetcher: (async () => {
      modelCalls += 1;
      throw new Error("The fixture path must not invoke the model.");
    }) as typeof fetch,
    ollamaUrl: "http://ollama.test",
    demoSafeMode: true,
  });
  assert.equal(modelCalls, 0);
  assert.equal(result.source, "fallback");
  assert.equal(result.attempts, 0);
  assert.equal(result.value.proposalId, proposal.id);
  assert.deepEqual(result.value.steps[0]?.citations, [citation]);
});
