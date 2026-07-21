import assert from "node:assert/strict";
import test from "node:test";

import { layoutElectricalNetlist } from "@educational-hardware-builder/solver";

import { weatherStationWiringNetlist } from "../../../packages/schemas/fixtures/weather-station-wiring.js";

test("Workshop wiring guides consume deterministic symbol and orthogonal-route output", () => {
  const layout = layoutElectricalNetlist(weatherStationWiringNetlist);

  assert.deepEqual(layout.symbols.map((symbol) => symbol.refdes), ["U2", "U1"]);
  assert.deepEqual(layout.routes.map((route) => route.netName), ["3V3", "GND", "I2C_SDA", "I2C_SCL"]);
  assert.ok(layout.routes.every((route) => route.points.length === 4));
  assert.ok(layout.checks.every((check) => check.status === "pass"));
});
