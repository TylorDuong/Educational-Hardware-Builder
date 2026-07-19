import assert from "node:assert/strict";
import test from "node:test";

import {
  demoParts,
  demoPipelineStages,
  demoSubstitution,
  runSolverRetryDemo,
} from "../src/demo-flow.js";

test("the fixture demo defines visible pipeline, parts, and substitution stages", () => {
  assert.deepEqual(demoPipelineStages.map((entry) => entry.stage), ["queued", "retrieving", "generating", "complete"]);
  assert.equal(demoPipelineStages.at(-1)?.percent, 100);
  assert.ok(demoParts.some((part) => part.name === "ESP32 DevKit"));
  assert.match(demoSubstitution.justification, /deterministic validation/i);
});

test("the 3D demo shows a solver rejection followed by a symbolic retry", () => {
  const result = runSolverRetryDemo();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.firstAttempt, /expected 3 mm, received 2.5 mm/);
  assert.match(result.retry, /deterministic transform/);
  assert.doesNotMatch(`${result.firstAttempt} ${result.retry}`, /position|quaternion|matrix/i);
});
