import assert from "node:assert/strict";
import test from "node:test";

import { GuidedLessonSchema } from "@educational-hardware-builder/schemas";
import { bme280ToEsp32Selection } from "@educational-hardware-builder/schemas/mocks";

import {
  compileWeatherStationTemplate,
  formatSolverError,
  solveSelectedProposalParts,
  solveWeatherStationSelection,
} from "../src/spatial-integration.js";
import { assertReadySchematicScene, createSchematicScene } from "../src/schematic-scene.js";

const stepId = "10000000-0000-4000-8000-000000000003";
const printableStl = "solid bracket\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nendloop\nendfacet\nendsolid";
const citation = { sourceUrl: "https://docs.example.test/usb-led-guide", locator: "Assembly", title: "USB LED guide" };

function selectedLesson(selection = bme280ToEsp32Selection) {
  return GuidedLessonSchema.parse({
    proposalId: "30000000-0000-4000-8000-000000000001",
    title: "Selected symbolic proposal",
    steps: [{
      id: stepId,
      order: 1,
      title: "Attach the sensor",
      safetyCategory: "none",
      safetyCallout: "Keep power disconnected while fitting the sensor.",
      instruction: "Use the approved symbolic mate from this selected proposal.",
      completionCondition: "The deterministic solver accepts the selected mate.",
      sourceDigest: {
        summary: "The cited assembly guidance describes the named connection, while the deterministic solver supplies the placement used by the model.",
        citation,
      },
      citations: [citation],
      matingSelections: [selection],
    }],
    troubleshooting: [],
  });
}

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

test("selected proposal mates receive transforms only from the deterministic solver", () => {
  const result = solveSelectedProposalParts(selectedLesson());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.traces.length, 1);
  assert.deepEqual(result.traces[0]?.selection, bme280ToEsp32Selection);
  assert.equal(result.traces[0]?.source, "deterministic-solver");
  assert.equal(result.traces[0]?.transform.stepId, stepId);
  assert.match(result.message, /Validated 1 symbolic assembly mate/);
});

test("selected proposal solver rejection supplies a typed symbolic retry without coordinates", () => {
  const rejectedSelection = {
    ...bme280ToEsp32Selection,
    targetPartId: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
    targetFeatureId: "breadboard-anchor-1",
  };
  const result = solveSelectedProposalParts(selectedLesson(rejectedSelection));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.failedStepId, stepId);
  assert.deepEqual(result.selection, rejectedSelection);
  assert.equal(result.rejection.code, "INCOMPATIBLE_SPACING");
  assert.match(result.rejection.message, /expected 3 mm, received 2.5 mm/);
  assert.match(result.rejection.retryInstruction, /approved symbolic part and feature pairing/);
  assert.doesNotMatch(`${result.rejection.message} ${result.rejection.retryInstruction}`, /position|quaternion|matrix|transform/i);
});

test("the live fixture scene carries deterministic placements rather than self-mated presentation positions", () => {
  const scene = createSchematicScene();
  assertReadySchematicScene(scene);
  assert.equal(scene.parts.length, 8);
  assert.equal(scene.routes.length, 2);
  assert.ok(scene.parts.every((part) => part.name.length > 0 && part.purpose.length > 0));
  assert.deepEqual(
    scene.parts.map((part) => part.positionMm),
    scene.layout.placements.map((placement) => placement.gridPosition),
  );
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
