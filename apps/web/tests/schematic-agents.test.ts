import assert from "node:assert/strict";
import test from "node:test";

import type { SchematicConstraintGraph } from "@educational-hardware-builder/schemas";

import {
  assertSymbolicSchematicOutput,
  runSchematicArchitect,
  runSchematicExtractor,
  type SchematicArchitectInput,
  type SchematicPartExtraction,
} from "../src/schematic-agents.js";

const chassisId = "10000000-0000-4000-8000-000000000001";
const boardId = "10000000-0000-4000-8000-000000000002";

const extractionFallback: SchematicPartExtraction = {
  rawParts: ["weather-station chassis", "ESP32 board"],
  assemblySequence: [
    { order: 1, action: "Place the ESP32 board into the chassis." },
  ],
};

const architectInput: SchematicArchitectInput = {
  extraction: extractionFallback,
  availableParts: [
    {
      partId: chassisId,
      name: "Weather-station chassis",
      anchors: [{ name: "internal-base", face: "inside_bottom" }],
    },
    {
      partId: boardId,
      name: "ESP32 board",
      anchors: [{ name: "top", face: "top" }],
    },
  ],
};

const graphFallback: SchematicConstraintGraph = {
  gridUnitMm: 1,
  nodes: [
    {
      partId: chassisId,
      role: "container",
      anchors: [{ name: "internal-base", face: "inside_bottom" }],
    },
    {
      partId: boardId,
      role: "base",
      parentPartId: chassisId,
      parentAnchor: "internal-base",
      anchors: [{ name: "top", face: "top" }],
    },
  ],
  connections: [],
  assemblySequence: [
    { id: "place-chassis", order: 1, kind: "place_part", partId: chassisId },
    { id: "place-board", order: 2, kind: "place_part", partId: boardId },
  ],
};

function mockedFetcher(...responses: string[]): { fetcher: typeof fetch; requests: RequestInit[] } {
  const requests: RequestInit[] = [];
  let calls = 0;
  return {
    fetcher: (async (_url: string | URL, init?: RequestInit) => {
      requests.push(init ?? {});
      return Response.json({ response: responses[calls++] ?? responses.at(-1) });
    }) as typeof fetch,
    requests,
  };
}

test("Extractor retries exactly once after invalid JSON, then returns its typed fallback", async () => {
  const mock = mockedFetcher("{not json");

  const result = await runSchematicExtractor(
    "Put an ESP32 in a small chassis.",
    extractionFallback,
    { fetcher: mock.fetcher, ollamaUrl: "http://ollama.test" },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.attempts, 2);
  assert.deepEqual(result.value, extractionFallback);
  assert.equal(mock.requests.length, 2);
  assert.match(String(mock.requests[1]?.body), /previous response failed validation/);

  const firstRequest = JSON.parse(String(mock.requests[0]?.body)) as { options: { temperature: number }; format: { type: string } };
  assert.equal(firstRequest.options.temperature, 0.2);
  assert.equal(firstRequest.format.type, "object");
});

test("Architect rejects model coordinates, retries, and accepts a symbolic graph", async () => {
  const coordinateLeak = {
    ...graphFallback,
    nodes: [{ ...graphFallback.nodes[0], positionMm: [0, 0, 0] }],
  };
  const mock = mockedFetcher(JSON.stringify(coordinateLeak), JSON.stringify(graphFallback));

  const result = await runSchematicArchitect(
    architectInput,
    graphFallback,
    { fetcher: mock.fetcher, ollamaUrl: "http://ollama.test" },
  );

  assert.equal(result.source, "live");
  assert.equal(result.attempts, 2);
  assert.deepEqual(result.value, graphFallback);
  assert.equal(mock.requests.length, 2);
  assert.match(String(mock.requests[1]?.body), /previous response failed validation/);
  assert.match(String(mock.requests[1]?.body), /positionMm/);
});

test("symbolic schematic guard rejects coordinate and geometry-shaped fields", () => {
  assert.throws(
    () => assertSymbolicSchematicOutput({ nodes: [{ transform: { positionMm: [0, 0, 0] } }] }),
    /prohibited geometry field: transform/,
  );
  assert.throws(
    () => assertSymbolicSchematicOutput({ nodes: [{ meshAsset: "board.stl" }] }),
    /prohibited spatial field: meshAsset/,
  );
  assert.doesNotThrow(() => assertSymbolicSchematicOutput(graphFallback));
});
