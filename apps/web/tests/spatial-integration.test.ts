import assert from "node:assert/strict";
import test from "node:test";

import { bme280ToEsp32Selection } from "@educational-hardware-builder/schemas/mocks";

import {
  assertSolverTraces,
  compileWeatherStationTemplate,
  formatSolverError,
  solveWeatherStationSelection,
  solverTracedFixtureParts,
} from "../src/spatial-integration.js";

const stepId = "10000000-0000-4000-8000-000000000003";
const printableStl = "solid bracket\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nendloop\nendfacet\nendsolid";

test("the real solver provides actionable details for a rejected symbolic mate", () => {
  const result = solveWeatherStationSelection({
    ...bme280ToEsp32Selection,
    targetPartId: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
    targetFeatureId: "breadboard-anchor-1",
  }, stepId);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "INCOMPATIBLE_SPACING");
  assert.match(formatSolverError(result.error), /expected 3 mm, received 2.5 mm/);
});

test("every sandbox part carries a deterministic solver trace", () => {
  const parts = solverTracedFixtureParts(stepId);
  assert.equal(parts.length, 10);
  assert.doesNotThrow(() => assertSolverTraces(parts));
  assert.equal(parts[0]?.solverTrace.source, "deterministic-solver");
});

test("template compilation returns a printable STL and never exposes raw compiler stderr", async () => {
  const request = {
    templateId: "l-bracket",
    values: { widthMm: 30, heightMm: 24, thicknessMm: 3, holeSpacingMm: 20 },
  };
  const success = await compileWeatherStationTemplate(request, async () => ({ ok: true, stl: printableStl }));
  assert.deepEqual(success, { ok: true, stl: printableStl, message: "L-bracket validated and ready to print." });

  const failure = await compileWeatherStationTemplate(request, async () => ({ ok: false, stderr: "internal compiler path" }));
  assert.deepEqual(failure, { ok: false, message: "The L-bracket could not be compiled. Adjust the validated parameters and try again." });
  assert.doesNotMatch(failure.message, /internal compiler path/);
});
