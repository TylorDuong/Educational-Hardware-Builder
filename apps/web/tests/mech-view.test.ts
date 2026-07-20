import assert from "node:assert/strict";
import test from "node:test";

import {
  explodeFromFocus,
  solverBoundsToThreeDimensions,
  solverPointToThreePoint,
} from "../src/components/MechView.js";

test("the renderer maps Z-up solver data to Three.js Y-up geometry", () => {
  assert.deepEqual(solverPointToThreePoint([12, 7, 9]), [12, 9, 7]);
  assert.deepEqual(solverBoundsToThreeDimensions([85, 55, 9]), [85, 9, 55]);
  assert.deepEqual(solverPointToThreePoint([12, 7, 9]), [12, 9, 7]);
});

test("focused explode math keeps the selected part centred and spreads other parts away", () => {
  assert.deepEqual(explodeFromFocus([20, 15, 6], [20, 15, 6], 0.8), [20, 15, 6]);
  const exploded = explodeFromFocus([10, 5, 2], [20, 15, 6], 0.8);
  assert.deepEqual(exploded.slice(0, 2), [2, -3]);
  assert.ok(Math.abs(exploded[2] + 1.2) < 1e-12);
});
