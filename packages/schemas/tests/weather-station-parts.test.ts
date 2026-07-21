import { describe, expect, it } from "vitest";

import {
  CadAssetRecordSchema,
  MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE,
} from "../src/index.js";
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

  it("provides cited, integral proxy bounds for every layout fixture", () => {
    for (const asset of weatherStationCadAssets) {
      expect(asset.boundsMm).toHaveLength(3);
      expect(asset.boundsMm?.every(Number.isInteger)).toBe(true);
      expect(asset.boundsMm?.every((dimension) => dimension > 0)).toBe(true);
      expect(asset.dimensionEvidence?.confidence).toBeGreaterThanOrEqual(MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE);
      expect(asset.dimensionEvidence?.citation.sourceUrl).toMatch(/^https:\/\//);
      expect(asset.dimensionEvidence?.citation.locator).not.toHaveLength(0);
      expect(asset.dimensionEvidence?.citation.title).not.toHaveLength(0);
    }
  });

  it("rejects invalid physical feature data", () => {
    const invalid = structuredClone(weatherStationCadAssets[0]!);
    invalid.matingFeatures[0]!.diameterMm = 0;
    expect(() => CadAssetRecordSchema.parse(invalid)).toThrow();
  });

  it("rejects non-integral bounds and malformed dimension evidence", () => {
    const nonIntegralBounds = structuredClone(weatherStationCadAssets[0]!);
    nonIntegralBounds.boundsMm = [55.5, 28, 13];
    expect(() => CadAssetRecordSchema.parse(nonIntegralBounds)).toThrow();

    const invalidEvidence = structuredClone(weatherStationCadAssets[0]!);
    invalidEvidence.dimensionEvidence = {
      confidence: 1.01,
      citation: invalidEvidence.dimensionEvidence!.citation,
    };
    expect(() => CadAssetRecordSchema.parse(invalidEvidence)).toThrow();

    expect(() => CadAssetRecordSchema.parse({
      ...weatherStationCadAssets[0],
      dimensionEvidence: { confidence: 0.9 },
    })).toThrow();
  });
});
