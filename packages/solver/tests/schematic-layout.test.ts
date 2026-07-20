import { describe, expect, it } from "vitest";

import type { CadAssetRecord, SchematicLayoutRequest } from "../../schemas/src/index.js";

import { solveSchematicLayout } from "../src/index.js";

const ids = {
  enclosure: "10000000-0000-4000-8000-000000000001",
  base: "10000000-0000-4000-8000-000000000002",
  controller: "10000000-0000-4000-8000-000000000003",
  sensor: "10000000-0000-4000-8000-000000000004",
  cable: "10000000-0000-4000-8000-000000000005",
};

function asset(partId: string, boundsMm: [number, number, number], confidence = 0.95): CadAssetRecord {
  return {
    id: partId,
    partId,
    filePath: `fixtures/${partId}.stl`,
    sha256: "a".repeat(64),
    sourceUrl: "https://docs.example.test/schematic-layout",
    license: "Fixture license",
    boundsMm,
    dimensionEvidence: {
      confidence,
      citation: {
        sourceUrl: "https://docs.example.test/schematic-layout",
        locator: "Mechanical envelope",
        title: "Schematic layout fixture dimensions",
      },
    },
    matingFeatures: [],
  };
}

function request(options: { includeConnection?: boolean; endpointFace?: "top" | "center" } = {}): SchematicLayoutRequest {
  const includeConnection = options.includeConnection ?? false;
  const endpointFace = options.endpointFace ?? "top";
  return {
    requiredDimensionConfidence: 0.85,
    cadAssets: [
      asset(ids.enclosure, [24, 20, 18]),
      asset(ids.base, [16, 12, 2]),
      asset(ids.controller, [5, 4, 3]),
      asset(ids.sensor, [4, 4, 3]),
      asset(ids.cable, [2, 2, 30]),
    ],
    graph: {
      gridUnitMm: 1,
      nodes: [
        {
          partId: ids.enclosure,
          role: "container",
          anchors: [{ name: "inside-bottom", face: "inside_bottom" }, { name: "top", face: "top" }, { name: "center", face: "center" }],
        },
        {
          partId: ids.base,
          role: "base",
          parentPartId: ids.enclosure,
          parentAnchor: "inside-bottom",
          anchors: [{ name: "top", face: "top" }],
        },
        {
          partId: ids.controller,
          role: "component",
          parentPartId: ids.base,
          parentAnchor: "top",
          anchors: [{ name: "endpoint", face: endpointFace }],
        },
        {
          partId: ids.sensor,
          role: "component",
          parentPartId: ids.base,
          parentAnchor: "top",
          anchors: [{ name: "endpoint", face: endpointFace }],
        },
        { partId: ids.cable, role: "flexible", anchors: [] },
      ],
      connections: includeConnection
        ? [{
          id: "controller-sensor-cable",
          flexiblePartId: ids.cable,
          fromPartId: ids.controller,
          fromAnchor: "endpoint",
          toPartId: ids.sensor,
          toAnchor: "endpoint",
        }]
        : [],
      assemblySequence: [
        { id: "place-enclosure", order: 1, kind: "place_part", partId: ids.enclosure },
        { id: "place-base", order: 2, kind: "place_part", partId: ids.base },
        { id: "place-controller", order: 3, kind: "place_part", partId: ids.controller },
        { id: "place-sensor", order: 4, kind: "place_part", partId: ids.sensor },
        ...(includeConnection ? [{ id: "connect-cable", order: 5, kind: "connect_flexible" as const, connectionId: "controller-sensor-cable" }] : []),
      ],
    },
  };
}

function occupiedKeys(result: Extract<ReturnType<typeof solveSchematicLayout>, { outcome: "ready" }>): Set<string> {
  const values = new Set<string>();
  for (const placement of result.placements) {
    if (placement.partId === ids.enclosure) continue;
    for (let x = placement.gridPosition[0]; x < placement.gridPosition[0] + placement.boundsMm[0]; x += 1) {
      for (let y = placement.gridPosition[1]; y < placement.gridPosition[1] + placement.boundsMm[1]; y += 1) {
        for (let z = placement.gridPosition[2]; z < placement.gridPosition[2] + placement.boundsMm[2]; z += 1) values.add(`${x},${y},${z}`);
      }
    }
  }
  return values;
}

describe("deterministic schematic layout solver", () => {
  it("produces the same collision-free parent-world layout across 100 runs", () => {
    const first = solveSchematicLayout(request());
    expect(first.outcome).toBe("ready");
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(solveSchematicLayout(request())).toEqual(first);
    }
    if (first.outcome !== "ready") return;
    expect(first.placements.find((placement) => placement.partId === ids.enclosure)?.gridPosition).toEqual([0, 0, 0]);
    expect(first.placements.find((placement) => placement.partId === ids.base)?.gridPosition).toEqual([0, 0, 0]);
    expect(first.placements.find((placement) => placement.partId === ids.controller)?.gridPosition[2]).toBe(2);
  });

  it("rejects a centered child that collides with an existing centered child", () => {
    const collision = request();
    collision.graph.nodes[1]!.parentAnchor = "center";
    collision.graph.nodes[2]!.parentPartId = ids.enclosure;
    collision.graph.nodes[2]!.parentAnchor = "center";
    collision.graph.nodes[3]!.parentPartId = ids.enclosure;
    collision.graph.nodes[3]!.parentAnchor = "center";

    const result = solveSchematicLayout(collision);
    expect(result).toMatchObject({ outcome: "rejected", rejection: { code: "COLLISION" } });
  });

  it("rejects components that cannot fit through a requested container boundary", () => {
    const tooLarge = request();
    const base = tooLarge.cadAssets.find((candidate) => candidate.partId === ids.base)!;
    base.boundsMm = [30, 12, 2];

    const result = solveSchematicLayout(tooLarge);
    expect(result).toMatchObject({ outcome: "rejected", rejection: { code: "OUT_OF_BOUNDS", partId: ids.base } });
  });

  it("quarantines low-confidence physical dimensions before emitting any placement", () => {
    const uncertain = request();
    const controller = uncertain.cadAssets.find((candidate) => candidate.partId === ids.controller)!;
    controller.dimensionEvidence!.confidence = 0.7;

    const result = solveSchematicLayout(uncertain);
    expect(result).toMatchObject({ outcome: "quarantined" });
    if (result.outcome !== "quarantined") return;
    expect(result.quarantinedParts).toEqual(expect.arrayContaining([
      expect.objectContaining({ partId: ids.controller, observedConfidence: 0.7, requiredConfidence: 0.85 }),
    ]));
  });

  it("routes a flexible connection around occupied rigid voxel interiors", () => {
    const result = solveSchematicLayout(request({ includeConnection: true }));
    expect(result.outcome).toBe("ready");
    if (result.outcome !== "ready") return;
    const route = result.routes[0]!;
    const occupied = occupiedKeys(result);
    expect(route.points.length).toBeGreaterThan(1);
    for (const point of route.points) {
      expect(occupied.has(point.join(","))).toBe(false);
    }
  });

  it("reports an unavailable route when both endpoints are trapped inside solids", () => {
    const result = solveSchematicLayout(request({ includeConnection: true, endpointFace: "center" }));
    expect(result).toMatchObject({ outcome: "rejected", rejection: { code: "ROUTE_UNAVAILABLE", connectionId: "controller-sensor-cable" } });
  });

  it("rejects canonical steps that place a child before its parent", () => {
    const invalidSequence = request();
    invalidSequence.graph.assemblySequence[0]!.order = 2;
    invalidSequence.graph.assemblySequence[1]!.order = 1;

    const result = solveSchematicLayout(invalidSequence);
    expect(result).toMatchObject({ outcome: "rejected", rejection: { code: "INVALID_SEQUENCE", sequenceStepId: "place-base" } });
  });

  it("rejects unparsed coordinate-bearing requests before they reach placement", () => {
    const unsafeRequest = structuredClone(request()) as unknown as {
      requiredDimensionConfidence: number;
      graph: { nodes: Array<Record<string, unknown>> };
    };
    unsafeRequest.requiredDimensionConfidence = 0;
    unsafeRequest.graph.nodes[0]!.positionMm = [20, 20, 20];

    const result = solveSchematicLayout(unsafeRequest);
    expect(result).toMatchObject({ outcome: "rejected", rejection: { code: "INVALID_GRAPH" } });
  });

  it("lays out a 30-component classroom assembly within one second", () => {
    const denseRequest = request();
    const componentCount = 30;
    for (let index = 0; index < componentCount; index += 1) {
      const partId = `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      denseRequest.cadAssets.push(asset(partId, [1, 1, 1]));
      denseRequest.graph.nodes.push({
        partId,
        role: "component",
        parentPartId: ids.base,
        parentAnchor: "top",
        anchors: [],
      });
      denseRequest.graph.assemblySequence.push({
        id: `place-dense-${index + 1}`,
        order: index + 5,
        kind: "place_part",
        partId,
      });
    }

    const startedAt = Date.now();
    const result = solveSchematicLayout(denseRequest);
    const elapsedMs = Date.now() - startedAt;

    expect(result.outcome).toBe("ready");
    expect(elapsedMs).toBeLessThan(1_000);
    if (result.outcome === "ready") expect(result.placements).toHaveLength(componentCount + 4);
  });
});
