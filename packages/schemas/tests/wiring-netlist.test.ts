import { describe, expect, it } from "vitest";

import { ElectricalNetlistSchema } from "../src/index.js";
import { weatherStationWiringNetlist } from "../fixtures/weather-station-wiring.js";

describe("weather-station wiring netlist", () => {
  it("is a strict symbolic netlist with no renderer-owned positions", () => {
    expect(ElectricalNetlistSchema.parse(weatherStationWiringNetlist)).toEqual(weatherStationWiringNetlist);
    expect(JSON.stringify(weatherStationWiringNetlist)).not.toMatch(/position|coordinate|route|\"x\"|\"y\"/i);
  });
});
