import { describe, expect, it } from "vitest";

import { weatherStationWiringNetlist } from "../../schemas/fixtures/weather-station-wiring.js";
import { layoutElectricalNetlist } from "../src/wiring-layout.js";

describe("deterministic electrical wiring layout", () => {
  it("layers library symbols and routes every fixture net orthogonally without netlist coordinates", () => {
    const first = layoutElectricalNetlist(weatherStationWiringNetlist);
    const second = layoutElectricalNetlist(weatherStationWiringNetlist);

    expect(first).toEqual(second);
    expect(first.symbols.map((symbol) => symbol.refdes)).toEqual(["U2", "U1"]);
    expect(first.routes).toHaveLength(4);
    for (const route of first.routes) {
      expect(route.points).toHaveLength(4);
      expect(route.points[0]![1]).toBe(route.points[1]![1]);
      expect(route.points[1]![0]).toBe(route.points[2]![0]);
      expect(route.points[2]![1]).toBe(route.points[3]![1]);
    }
    expect(first.checks.every((check) => check.status === "pass")).toBe(true);
  });
});
