import type { AssemblyTransform, CadAssetRecord, MatingSelection } from "../../schemas/src/index.js";

export { solveSchematicLayout } from "./schematic-layout.js";

export type SolverError =
  | { code: "UNKNOWN_FEATURE"; message: string; partId: string; featureId: string }
  | { code: "MISMATCHED_HOLE_COUNT"; message: string; expected: number; actual: number }
  | { code: "INCOMPATIBLE_SPACING"; message: string; expectedMm: number; actualMm: number }
  | { code: "BOUNDING_BOX_COLLISION"; message: string; partIds: [string, string]; overlapAxis: "x" | "y" | "z" };

export type SolveResult = { ok: true; transform: AssemblyTransform } | { ok: false; error: SolverError };

type MatingFeature = CadAssetRecord["matingFeatures"][number];

const findFeature = (asset: CadAssetRecord, id: string): MatingFeature | undefined =>
  asset.matingFeatures.find((feature) => feature.id === id);

const holeCount = (asset: CadAssetRecord): number =>
  asset.matingFeatures.filter((feature) => feature.kind === "mounting_hole").length;

/**
 * Computes a deterministic Z-up, parent-relative fixture transform. Mounting-hole mates preserve
 * an 8 mm documented fixture clearance; all other feature pairs align their selected origins.
 */
export function solveMatingSelection(
  selection: MatingSelection,
  moving: CadAssetRecord,
  target: CadAssetRecord,
  stepId: string,
): SolveResult {
  const movingFeature = findFeature(moving, selection.movingFeatureId);
  if (!movingFeature) {
    return { ok: false, error: { code: "UNKNOWN_FEATURE", message: `Moving feature ${selection.movingFeatureId} is unavailable.`, partId: moving.id, featureId: selection.movingFeatureId } };
  }
  const targetFeature = findFeature(target, selection.targetFeatureId);
  if (!targetFeature) {
    return { ok: false, error: { code: "UNKNOWN_FEATURE", message: `Target feature ${selection.targetFeatureId} is unavailable.`, partId: target.id, featureId: selection.targetFeatureId } };
  }
  if (movingFeature.kind === "mounting_hole" && targetFeature.kind === "mounting_hole") {
    const expected = holeCount(target);
    const actual = holeCount(moving);
    if (expected !== actual) {
      return { ok: false, error: { code: "MISMATCHED_HOLE_COUNT", message: `Expected ${expected} mounting holes but received ${actual}.`, expected, actual } };
    }
    if (movingFeature.diameterMm !== targetFeature.diameterMm) {
      return { ok: false, error: { code: "INCOMPATIBLE_SPACING", message: `Mating holes differ in diameter: ${movingFeature.diameterMm} mm versus ${targetFeature.diameterMm} mm.`, expectedMm: targetFeature.diameterMm ?? 0, actualMm: movingFeature.diameterMm ?? 0 } };
    }
  }
  const clearance = movingFeature.kind === "mounting_hole" && targetFeature.kind === "mounting_hole" ? 8 : 0;
  return {
    ok: true,
    transform: {
      partId: moving.partId,
      stepId,
      positionMm: [
        targetFeature.positionMm[0] - movingFeature.positionMm[0],
        targetFeature.positionMm[1] - movingFeature.positionMm[1],
        targetFeature.positionMm[2] - movingFeature.positionMm[2] + clearance,
      ],
      quaternion: [0, 0, 0, 1],
      parentFrame: target.partId,
      coordinateConvention: "z-up-parent-relative",
    },
  };
}
