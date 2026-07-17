import { describe, expect, it } from "vitest";

import { bme280ToEsp32Selection, bme280ToEsp32Transform } from "../../schemas/mocks/index.js";
import { weatherStationCadAssets } from "../../schemas/fixtures/weather-station-parts.js";

import { solveMatingSelection } from "../src/index.js";

const bme280 = weatherStationCadAssets.find((asset) => asset.id === bme280ToEsp32Selection.movingPartId)!;
const esp32 = weatherStationCadAssets.find((asset) => asset.id === bme280ToEsp32Selection.targetPartId)!;

describe("deterministic mating solver", () => {
  it("matches the B1 golden transform for the known fixture selection", () => {
    expect(solveMatingSelection(bme280ToEsp32Selection, bme280, esp32, bme280ToEsp32Transform.stepId)).toEqual({
      ok: true,
      transform: bme280ToEsp32Transform,
    });
  });

  it("preserves XY alignment and the fixture clearance for every compatible mounting-hole pair", () => {
    const assets = weatherStationCadAssets.filter((asset) => asset.matingFeatures.some((feature) => feature.kind === "mounting_hole"));
    for (const moving of assets) {
      for (const target of assets) {
        const movingFeature = moving.matingFeatures.find((feature) => feature.kind === "mounting_hole")!;
        const targetFeature = target.matingFeatures.find((feature) => feature.kind === "mounting_hole")!;
        const result = solveMatingSelection({ movingPartId: moving.partId, movingFeatureId: movingFeature.id, targetPartId: target.partId, targetFeatureId: targetFeature.id }, moving, target, "1ef6f51d-8ba3-4f0b-a3bb-e2a88f56a7cc");
        if (movingFeature.diameterMm === targetFeature.diameterMm && moving.matingFeatures.filter((feature) => feature.kind === "mounting_hole").length === target.matingFeatures.filter((feature) => feature.kind === "mounting_hole").length) {
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.transform.positionMm.slice(0, 2)).toEqual([targetFeature.positionMm[0] - movingFeature.positionMm[0], targetFeature.positionMm[1] - movingFeature.positionMm[1]]);
            expect(result.transform.positionMm[2]).toBe(targetFeature.positionMm[2] - movingFeature.positionMm[2] + 8);
          }
        }
      }
    }
  });

  it("returns a machine-readable error for an invalid feature", () => {
    const result = solveMatingSelection({ ...bme280ToEsp32Selection, movingFeatureId: "missing" }, bme280, esp32, bme280ToEsp32Transform.stepId);
    expect(result).toMatchObject({ ok: false, error: { code: "UNKNOWN_FEATURE" } });
  });
});
