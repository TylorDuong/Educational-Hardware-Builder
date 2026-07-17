import { describe, expect, it } from "vitest";
import {
  bme280ToEsp32Selection,
  mockSolveMatingSelection,
} from "../mocks/index.js";

describe("fixture mock solver", () => {
  it("returns the committed transform for the known symbolic mating", () => {
    const result = mockSolveMatingSelection(bme280ToEsp32Selection);
    expect(result).toMatchObject({ ok: true, transform: { positionMm: [0, 0, 8] } });
  });

  it("returns a typed error for an unknown symbolic mating", () => {
    const result = mockSolveMatingSelection({ ...bme280ToEsp32Selection, movingFeatureId: "unknown" });
    expect(result).toMatchObject({ ok: false, error: { code: "UNKNOWN_MATING_SELECTION" } });
  });
});
