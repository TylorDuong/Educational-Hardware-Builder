import { describe, expect, it } from "vitest";

import { CadAssetRecordSchema } from "../src/index.js";
import { weatherStationCadAssets } from "../fixtures/weather-station-parts.js";

describe("weather-station CAD metadata", () => {
  it("provides ten source-linked, schema-valid records", () => {
    expect(weatherStationCadAssets).toHaveLength(10);
    expect(CadAssetRecordSchema.array().parse(weatherStationCadAssets)).toEqual(weatherStationCadAssets);
    for (const asset of weatherStationCadAssets) {
      expect(asset.sourceUrl).toMatch(/^https:\/\//);
      expect(asset.license).not.toHaveLength(0);
      expect(asset.matingFeatures.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid physical feature data", () => {
    const invalid = structuredClone(weatherStationCadAssets[0]!);
    invalid.matingFeatures[0]!.diameterMm = 0;
    expect(() => CadAssetRecordSchema.parse(invalid)).toThrow();
  });
});
