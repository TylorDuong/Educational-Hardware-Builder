import assert from "node:assert/strict";
import test from "node:test";

import {
  exponentialDisassemblyFactor,
  explodeFromFocus,
  isPartSelectable,
  MAX_DISASSEMBLY_FACTOR,
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

test("automatic enclosure mode removes only container parts from selection", () => {
  assert.equal(isPartSelectable({ isContainer: true }, false), false);
  assert.equal(isPartSelectable({ isContainer: false }, false), true);
  assert.equal(isPartSelectable({ isContainer: true }, true), true);
});

test("hover disassembly increases exponentially as the pointer approaches and stops at a maximum", () => {
  assert.equal(exponentialDisassemblyFactor(0), MAX_DISASSEMBLY_FACTOR);
  assert.equal(exponentialDisassemblyFactor(0.5), 0);
  assert.ok(exponentialDisassemblyFactor(0.1) > exponentialDisassemblyFactor(0.2));
});
