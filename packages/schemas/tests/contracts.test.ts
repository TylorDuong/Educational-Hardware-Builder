import { describe, expect, it } from "vitest";

import {
  RetrievalResultSchema,
  StepPlanSchema,
} from "../src/index.js";
import { retrievalResultMock } from "../mocks/index.js";
import { weatherStationStepFixture } from "../fixtures/weather-station.js";

describe("shared contracts", () => {
  it("requires a citation on every retrieval result", () => {
    expect(() => RetrievalResultSchema.parse({ ...retrievalResultMock, citations: [] })).toThrow();
    expect(RetrievalResultSchema.parse(retrievalResultMock)).toEqual(retrievalResultMock);
  });

  it("validates the golden weather-station fixture", () => {
    expect(StepPlanSchema.parse(weatherStationStepFixture)).toEqual(weatherStationStepFixture);
  });
});
