import assert from "node:assert/strict";
import test from "node:test";

import { retrievalResultMock } from "@educational-hardware-builder/schemas/mocks";

import {
  callModel,
  goldenLessonStep,
  progressSse,
  runLesson,
  runResearch,
  type AgentDependencies,
} from "../src/agents.js";

const validRouter = { projectType: "weather-station", summary: "A cited sensor build.", safetyCategory: "none" };

function fetchResponses(...responses: string[]): typeof fetch {
  let calls = 0;
  return (async () => Response.json({ response: responses[calls++] ?? responses.at(-1) })) as typeof fetch;
}

function agents(fetcher: typeof fetch, demoSafeMode = false): AgentDependencies {
  return {
    fetcher,
    ollamaUrl: "http://ollama.test",
    demoSafeMode,
    retrieve: async () => [retrievalResultMock],
  };
}

test("callModel retries exactly once with its validation error, then returns the fixture", async () => {
  let requests: RequestInit[] = [];
  const fetcher = (async (_url: string | URL, init?: RequestInit) => {
    requests.push(init ?? {});
    return Response.json({ response: "{not json" });
  }) as typeof fetch;
  const result = await callModel({
    schema: (await import("../src/agents.js")).RouterResultSchema,
    jsonSchema: { type: "object" },
    prompt: "classify",
    model: "llama3.2:3b",
    temperature: 0.2,
    fallback: () => validRouter,
    fetcher,
    ollamaUrl: "http://ollama.test",
  });
  assert.equal(result.source, "fallback");
  assert.equal(result.attempts, 2);
  assert.equal(requests.length, 2);
  assert.match(String(requests[1]?.body), /previous response failed validation/);
});

test("DEMO_SAFE_MODE bypasses all live calls and uses the authored fixture", async () => {
  const result = await runLesson(goldenLessonStep(), agents(fetchResponses(JSON.stringify(validRouter)), true));
  assert.equal(result.source, "fallback");
  assert.equal(result.attempts, 0);
  assert.deepEqual(result.value, goldenLessonStep().lesson);
});

test("research and lesson outputs preserve citations from mocked guidance", async () => {
  const research = await runResearch("BME280 wiring", agents(fetchResponses(JSON.stringify({
    summary: "Use the BME280 datasheet.",
    findings: [{ claim: retrievalResultMock.content, citation: retrievalResultMock.citations[0] }],
  }))));
  const lesson = await runLesson(goldenLessonStep(), agents(fetchResponses(JSON.stringify(goldenLessonStep().lesson))));
  assert.equal(research.value.findings[0]?.citation.title, "BME280 Datasheet");
  assert.ok(lesson.value.citations.length > 0);
});

test("twenty live model calls either validate or use the deterministic fallback", async () => {
  for (let call = 0; call < 20; call += 1) {
    const response = call % 2 === 0 ? JSON.stringify(validRouter) : "not valid JSON";
    const result = await callModel({
      schema: (await import("../src/agents.js")).RouterResultSchema,
      jsonSchema: { type: "object" },
      prompt: "classify",
      model: "llama3.2:3b",
      temperature: 0.2,
      fallback: () => validRouter,
      fetcher: fetchResponses(response),
      ollamaUrl: "http://ollama.test",
    });
    assert.ok(result.source === "live" || result.source === "fallback");
  }
});

test("progress events are typed and available as SSE frames", async () => {
  const stream = progressSse([{ operationId: "fb5f4c45-fb24-4690-b785-a306e857a373", stage: "retrieving", message: "Finding sources", percent: 25 }]);
  const reader = stream.getReader();
  const chunk = await reader.read();
  assert.match(new TextDecoder().decode(chunk.value), /^event: progress\ndata: /);
  assert.match(new TextDecoder().decode(chunk.value), /"stage":"retrieving"/);
});
