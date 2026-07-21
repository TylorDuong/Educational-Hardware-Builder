import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  canDisassembleFromFocus,
  DISASSEMBLY_TRANSITION_SECONDS,
  DISASSEMBLED_ROUTE_OPACITY,
  disassemblyTransitionRatio,
  exponentialDisassemblyFactor,
  explodeFromFocus,
  fixturePartMaterialState,
  isPartSelectable,
  LOCAL_DISASSEMBLY_RADIUS_MM,
  localDisassemblyFactor,
  MAX_DISASSEMBLY_FACTOR,
  raycastForSelection,
  reconnectRoutePoints,
  solverBoundsToThreeDimensions,
  solverPointToThreePoint,
  UNFOCUSED_PART_OPACITY,
} from "../src/components/MechView.js";
import { nextSelectedPartId } from "../src/workshop-selection.js";

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

test("local disassembly keeps distant model context anchored", () => {
  const focus: [number, number, number] = [0, 0, 0];
  const nearby: [number, number, number] = [20, 0, 0];
  const distant: [number, number, number] = [LOCAL_DISASSEMBLY_RADIUS_MM + 1, 0, 0];

  const nearbyFactor = localDisassemblyFactor(nearby, focus, MAX_DISASSEMBLY_FACTOR);
  assert.ok(nearbyFactor > 0 && nearbyFactor < MAX_DISASSEMBLY_FACTOR);
  assert.equal(localDisassemblyFactor(distant, focus, MAX_DISASSEMBLY_FACTOR), 0);
  assert.deepEqual(explodeFromFocus(distant, focus, 0), distant);
});

test("enclosure focus remains highlighted without exploding the model", () => {
  assert.equal(canDisassembleFromFocus({ isContainer: true }), false);
  assert.equal(canDisassembleFromFocus({ isContainer: false }), true);
  assert.equal(canDisassembleFromFocus(undefined), false);
});

test("wiring endpoints follow their parts through a local disassembly", () => {
  const moved = reconnectRoutePoints(
    [[0, 0, 0], [5, 0, 0], [10, 0, 0]],
    [2, 4, 0],
    [-4, 2, 6],
  );

  assert.deepEqual(moved[0], [2, 4, 0]);
  assert.deepEqual(moved[1], [4, 3, 3]);
  assert.deepEqual(moved[2], [6, 2, 6]);
  assert.equal(DISASSEMBLED_ROUTE_OPACITY, 0.58);
});

test("automatic enclosure mode removes only container parts from selection", () => {
  assert.equal(isPartSelectable({ isContainer: true }, false), false);
  assert.equal(isPartSelectable({ isContainer: false }, false), true);
  assert.equal(isPartSelectable({ isContainer: true }, true), true);
});

test("enclosures remain wireframed and transparent in every selection state", () => {
  const unselectableEnclosure = fixturePartMaterialState({ isContainer: true }, false, false);
  const selectableEnclosure = fixturePartMaterialState({ isContainer: true }, false, true);
  const dimmedEnclosure = fixturePartMaterialState({ isContainer: true }, true, false);
  const ordinaryPart = fixturePartMaterialState({ isContainer: false }, false, true);

  assert.deepEqual(unselectableEnclosure, {
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    wireframe: true,
  });
  assert.deepEqual(selectableEnclosure, {
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    wireframe: true,
  });
  assert.deepEqual(dimmedEnclosure, {
    transparent: true,
    opacity: UNFOCUSED_PART_OPACITY,
    depthWrite: false,
    wireframe: true,
  });
  assert.deepEqual(ordinaryPart, {
    transparent: false,
    opacity: 1,
    depthWrite: true,
    wireframe: false,
  });
});

test("enclosure hit testing restores the inherited mesh raycast when selection is enabled", () => {
  const calls: string[] = [];
  const mesh = {
    constructor: {
      prototype: {
        raycast: (_raycaster: unknown, intersections: unknown[]) => calls.push(String(intersections[0])),
      },
    },
  };
  const enabled = raycastForSelection(true) as (this: typeof mesh, raycaster: unknown, intersections: unknown[]) => void;
  const disabled = raycastForSelection(false) as (this: typeof mesh, raycaster: unknown, intersections: unknown[]) => void;

  enabled.call(mesh, undefined, ["enclosure"]);
  disabled.call(mesh, undefined, ["ignored"]);

  assert.deepEqual(calls, ["enclosure"]);
});

test("clicking empty space or the selected part returns the view to its assembled state", () => {
  assert.equal(nextSelectedPartId(undefined, "sensor"), "sensor");
  assert.equal(nextSelectedPartId("sensor", "sensor"), undefined);
  assert.equal(nextSelectedPartId("sensor", undefined), undefined);
  assert.equal(UNFOCUSED_PART_OPACITY, 0.8);
});

test("the 3D canvas clears focused inspection when its whitespace is clicked", async () => {
  const source = await readFile(new URL("../src/components/MechView.tsx", import.meta.url), "utf8");

  assert.match(source, /onPointerMissed=\{\(\) => onSelect\(undefined\)\}/);
  assert.match(source, /routes\.map\(\(route\) => \(/);
  assert.match(source, /fromPartId/);
});

test("hover disassembly increases exponentially as the pointer approaches and stops at a maximum", () => {
  assert.equal(exponentialDisassemblyFactor(0), MAX_DISASSEMBLY_FACTOR);
  assert.equal(exponentialDisassemblyFactor(0.5), 0);
  assert.ok(exponentialDisassemblyFactor(0.1) > exponentialDisassemblyFactor(0.2));
});

test("disassembly reaches its full target in about half a second regardless of part size", () => {
  assert.equal(disassemblyTransitionRatio(0), 0);
  assert.ok(disassemblyTransitionRatio(DISASSEMBLY_TRANSITION_SECONDS) >= 0.99);
  assert.ok(disassemblyTransitionRatio(DISASSEMBLY_TRANSITION_SECONDS / 2) > 0.8);
});
