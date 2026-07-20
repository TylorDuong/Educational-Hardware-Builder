import assert from "node:assert/strict";
import test from "node:test";

import {
  assertReadySchematicScene,
  createSchematicScene,
  weatherStationSchematicRequest,
} from "../src/schematic-scene.js";

function voxelKey(point: readonly number[]): string {
  return point.join(":");
}

test("the Workshop fixture scene is derived from one ready deterministic layout", () => {
  const scene = createSchematicScene();
  assertReadySchematicScene(scene);

  assert.equal(scene.parts.length, scene.layout.placements.length);
  assert.equal(scene.routes.length, scene.layout.routes.length);
  assert.match(scene.message, /source-backed bounding-box proxies/);

  const placementByPartId = new Map(scene.layout.placements.map((placement) => [placement.partId, placement]));
  for (const part of scene.parts) {
    const placement = [...placementByPartId.values()].find((candidate) => candidate.partId === part.id);
    assert.ok(placement, `missing deterministic placement for rendered ${part.name}`);
    assert.deepEqual(part.positionMm, placement.gridPosition);
    assert.deepEqual(part.dimensionsMm, placement.boundsMm);
  }
});

test("the scene preserves checked flexible routes outside rigid proxy interiors", () => {
  const scene = createSchematicScene();
  assertReadySchematicScene(scene);

  const occupied = new Set<string>();
  const containerPartIds = new Set(scene.parts.filter((part) => part.isContainer).map((part) => part.id));
  for (const placement of scene.layout.placements) {
    if (containerPartIds.has(placement.partId)) continue;
    for (let x = placement.gridPosition[0]; x < placement.gridPosition[0] + placement.boundsMm[0]; x += 1) {
      for (let y = placement.gridPosition[1]; y < placement.gridPosition[1] + placement.boundsMm[1]; y += 1) {
        for (let z = placement.gridPosition[2]; z < placement.gridPosition[2] + placement.boundsMm[2]; z += 1) {
          occupied.add(voxelKey([x, y, z]));
        }
      }
    }
  }

  for (const route of scene.routes) {
    assert.ok(route.pointsMm.length >= 2);
    for (const point of route.pointsMm) {
      assert.equal(occupied.has(voxelKey(point)), false, `route ${route.id} crosses a rigid proxy`);
    }
  }
});

test("the web adapter does not fabricate drawable parts for quarantined evidence", () => {
  const request = structuredClone(weatherStationSchematicRequest);
  const asset = request.cadAssets[0];
  assert.ok(asset?.dimensionEvidence);
  if (!asset?.dimensionEvidence) return;
  asset.dimensionEvidence.confidence = 0.5;

  const scene = createSchematicScene(request);
  assert.equal(scene.outcome, "quarantined");
  assert.deepEqual(scene.parts, []);
  assert.match(scene.message, /waiting for verified dimensions/);
});

test("the web adapter reports canonical sequence failures without producing a scene", () => {
  const request = structuredClone(weatherStationSchematicRequest);
  const enclosureStep = request.graph.assemblySequence.find((step) => step.id === "place-enclosure");
  const breadboardStep = request.graph.assemblySequence.find((step) => step.id === "place-breadboard");
  assert.ok(enclosureStep && breadboardStep);
  if (!enclosureStep || !breadboardStep) return;
  enclosureStep.order = 2;
  breadboardStep.order = 1;

  const scene = createSchematicScene(request);
  assert.equal(scene.outcome, "rejected");
  assert.deepEqual(scene.parts, []);
  assert.match(scene.message, /could not be validated/);
});
