import { describe, expect, it } from "vitest";

import {
  CitedDimensionEvidenceSchema,
  IntegerGridDimensionsSchema,
  MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE,
  SchematicConstraintGraphSchema,
  SchematicLayoutRequestSchema,
  SchematicLayoutResultSchema,
} from "../src/index.js";

const ids = {
  enclosure: "10000000-0000-4000-8000-000000000001",
  controller: "10000000-0000-4000-8000-000000000002",
  cable: "10000000-0000-4000-8000-000000000003",
};

const citation = {
  sourceUrl: "https://docs.example.test/weather-station",
  locator: "Mechanical dimensions",
  title: "Weather station mechanical reference",
};

const graph = {
  gridUnitMm: 1 as const,
  nodes: [
    {
      partId: ids.enclosure,
      role: "container" as const,
      anchors: [{ name: "internal-base", face: "inside_bottom" as const }],
    },
    {
      partId: ids.controller,
      role: "base" as const,
      parentPartId: ids.enclosure,
      parentAnchor: "internal-base",
      anchors: [{ name: "power-in", face: "top" as const }],
    },
    {
      partId: ids.cable,
      role: "flexible" as const,
      anchors: [{ name: "device-end", face: "bottom" as const }],
    },
  ],
  connections: [
    {
      id: "controller-power-cable",
      flexiblePartId: ids.cable,
      fromPartId: ids.cable,
      fromAnchor: "device-end",
      toPartId: ids.controller,
      toAnchor: "power-in",
    },
  ],
  assemblySequence: [
    { id: "place-enclosure", order: 1, kind: "place_part" as const, partId: ids.enclosure },
    { id: "place-controller", order: 2, kind: "place_part" as const, partId: ids.controller },
    { id: "connect-power", order: 3, kind: "connect_flexible" as const, connectionId: "controller-power-cable" },
  ],
};

const enclosureAsset = {
  id: ids.enclosure,
  partId: ids.enclosure,
  filePath: "fixtures/enclosure.stl",
  sha256: "a".repeat(64),
  sourceUrl: citation.sourceUrl,
  license: "Fixture license",
  boundsMm: [120, 80, 45],
  dimensionEvidence: { confidence: 0.96, citation },
  matingFeatures: [],
};

describe("schematic layout contracts", () => {
  it("accepts a strict symbolic graph with typed assembly order", () => {
    expect(SchematicConstraintGraphSchema.parse(graph)).toEqual(graph);
    expect(() => SchematicConstraintGraphSchema.parse({
      ...graph,
      assemblySequence: [{ id: "bad-step", order: 1, kind: "place_part", connectionId: "controller-power-cable" }],
    })).toThrow();
  });

  it("rejects coordinate-bearing agent graphs", () => {
    expect(() => SchematicConstraintGraphSchema.parse({
      ...graph,
      nodes: [{ ...graph.nodes[0], positionMm: [0, 0, 0] }],
    })).toThrow();
    expect(() => SchematicConstraintGraphSchema.parse({
      ...graph,
      transform: { positionMm: [0, 0, 0], quaternion: [0, 0, 0, 1] },
    })).toThrow();
  });

  it("requires whole positive bounds and cited confidence evidence", () => {
    expect(IntegerGridDimensionsSchema.parse([120, 80, 45])).toEqual([120, 80, 45]);
    expect(() => IntegerGridDimensionsSchema.parse([120.5, 80, 45])).toThrow();
    expect(() => IntegerGridDimensionsSchema.parse([120, 0, 45])).toThrow();
    expect(() => CitedDimensionEvidenceSchema.parse({ confidence: 0.96 })).toThrow();
    expect(() => CitedDimensionEvidenceSchema.parse({ confidence: -0.01, citation })).toThrow();
  });

  it("keeps uncertain dimensions typed for deterministic quarantine", () => {
    const request = SchematicLayoutRequestSchema.parse({
      graph,
      cadAssets: [{
        ...enclosureAsset,
        dimensionEvidence: { confidence: MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE - 0.01, citation },
      }],
    });

    expect(request.requiredDimensionConfidence).toBe(MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE);
    expect(request.cadAssets[0]!.dimensionEvidence?.confidence).toBeLessThan(request.requiredDimensionConfidence);
  });

  it("validates solver-owned ready, quarantined, and rejected outcomes", () => {
    expect(SchematicLayoutResultSchema.parse({
      outcome: "ready",
      placements: [
        { partId: ids.enclosure, gridPosition: [0, 0, 0], boundsMm: [120, 80, 45] },
        { partId: ids.controller, gridPosition: [10, 10, 1], boundsMm: [55, 28, 13] },
      ],
      routes: [{ connectionId: "controller-power-cable", points: [[0, 0, 0], [0, 1, 0]] }],
      assemblySequence: graph.assemblySequence,
    }).outcome).toBe("ready");

    expect(SchematicLayoutResultSchema.parse({
      outcome: "quarantined",
      quarantinedParts: [{
        partId: ids.controller,
        observedConfidence: 0.7,
        requiredConfidence: MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE,
        reason: "The source record needs a verified outer envelope.",
      }],
    }).outcome).toBe("quarantined");

    expect(SchematicLayoutResultSchema.parse({
      outcome: "rejected",
      rejection: {
        code: "UNKNOWN_ANCHOR",
        message: "The requested parent anchor is not defined on the enclosure.",
        partId: ids.controller,
      },
    }).outcome).toBe("rejected");

    expect(() => SchematicLayoutResultSchema.parse({
      outcome: "ready",
      placements: [{ partId: ids.enclosure, gridPosition: [0, 0, 0], boundsMm: [120, 80, 45], transform: {} }],
    })).toThrow();
  });
});
