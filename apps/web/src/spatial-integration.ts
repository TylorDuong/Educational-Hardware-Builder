import {
  compileLBracket,
  type CompileClient,
  type CompileResult,
  type LBracketParams,
} from "@educational-hardware-builder/scad-service";
import {
  solveMatingSelection,
  type SolveResult,
  type SolverError,
} from "@educational-hardware-builder/solver";
import type {
  AssemblyTransform,
  MatingSelection,
  TemplateParams,
} from "@educational-hardware-builder/schemas";

import { weatherStationCadAssets } from "../../../packages/schemas/fixtures/weather-station-parts.js";

export type SolverTrace = {
  selection: MatingSelection;
  transform: AssemblyTransform;
  source: "deterministic-solver";
};

export type SolverTracedPart = {
  id: string;
  cadAssetUrl: string;
  color: string;
  transform: AssemblyTransform;
  solverTrace: SolverTrace;
};

export type TemplateDisplayResult =
  | { ok: true; stl: string; message: "L-bracket validated and ready to print." }
  | { ok: false; message: string };

function fixtureAsset(partId: string) {
  const asset = weatherStationCadAssets.find((candidate) => candidate.partId === partId);
  if (!asset) throw new Error(`No CAD fixture is available for part ${partId}.`);
  return asset;
}

export function formatSolverError(error: SolverError): string {
  switch (error.code) {
    case "MISMATCHED_HOLE_COUNT":
      return `Mounting-hole count does not match: expected ${error.expected}, received ${error.actual}. Choose matching features.`;
    case "INCOMPATIBLE_SPACING":
      return `Mating feature dimensions differ: expected ${error.expectedMm} mm, received ${error.actualMm} mm. Choose compatible features.`;
    case "BOUNDING_BOX_COLLISION":
      return `${error.partIds[0]} and ${error.partIds[1]} collide on the ${error.overlapAxis}-axis. Choose a different symbolic mate.`;
    case "UNKNOWN_FEATURE":
      return `Feature ${error.featureId} is unavailable on part ${error.partId}. Choose an existing feature ID.`;
  }
}

export function solveWeatherStationSelection(selection: MatingSelection, stepId: string): SolveResult {
  return solveMatingSelection(selection, fixtureAsset(selection.movingPartId), fixtureAsset(selection.targetPartId), stepId);
}

function firstFeature(partId: string): string {
  const feature = fixtureAsset(partId).matingFeatures[0];
  if (!feature) throw new Error(`CAD fixture ${partId} has no mating feature.`);
  return feature.id;
}

/**
 * The standalone sandbox has no model-generated transforms. Each displayed fixture is given a
 * deterministic, symbolic self-reference solely to obtain its transform from the real solver.
 */
export function solverTracedFixtureParts(stepId: string): SolverTracedPart[] {
  return weatherStationCadAssets.map((asset, index) => {
    const selection: MatingSelection = {
      movingPartId: asset.partId,
      movingFeatureId: firstFeature(asset.partId),
      targetPartId: asset.partId,
      targetFeatureId: firstFeature(asset.partId),
    };
    const result = solveWeatherStationSelection(selection, stepId);
    if (!result.ok) throw new Error(`Fixture solver rejected ${asset.partId}: ${formatSolverError(result.error)}`);
    return {
      id: asset.id,
      cadAssetUrl: asset.filePath,
      color: index % 2 ? "#22c55e" : "#38bdf8",
      transform: result.transform,
      solverTrace: { selection, transform: result.transform, source: "deterministic-solver" },
    };
  });
}

export function assertSolverTraces(parts: readonly SolverTracedPart[]): void {
  for (const part of parts) {
    if (part.solverTrace.source !== "deterministic-solver" || part.solverTrace.transform !== part.transform) {
      throw new Error(`Rendered part ${part.id} is missing its deterministic solver trace.`);
    }
  }
}

function requiredValue(values: Record<string, number>, canonical: string, legacy: string): number {
  const value = values[canonical] ?? values[legacy];
  if (value === undefined) throw new Error(`L-bracket request is missing ${canonical}.`);
  return value;
}

function toLBracketParams(request: TemplateParams): LBracketParams {
  if (request.templateId !== "l-bracket") throw new Error(`Unsupported template ${request.templateId}.`);
  const { values } = request;
  return {
    armA: requiredValue(values, "armA", "widthMm"),
    armB: values.armB ?? values.widthMm ?? requiredValue(values, "armA", "widthMm"),
    height: requiredValue(values, "height", "heightMm"),
    thickness: requiredValue(values, "thickness", "thicknessMm"),
    holeSpacing: requiredValue(values, "holeSpacing", "holeSpacingMm"),
    holeDiameter: values.holeDiameter ?? values.holeDiameterMm ?? 3,
  };
}

export async function compileWeatherStationTemplate(request: TemplateParams, compile: CompileClient): Promise<TemplateDisplayResult> {
  const result: CompileResult = await compileLBracket(toLBracketParams(request), compile);
  if (result.ok) return { ok: true, stl: result.stl, message: "L-bracket validated and ready to print." };

  switch (result.error.code) {
    case "OUT_OF_BOUNDS":
      return { ok: false, message: `${result.error.parameter} must be between ${result.error.min} and ${result.error.max}.` };
    case "COMPILE_FAILED":
      return { ok: false, message: "The L-bracket could not be compiled. Adjust the validated parameters and try again." };
    case "DEGENERATE_MESH":
      return { ok: false, message: "The L-bracket geometry is not printable. Adjust the validated parameters and try again." };
  }
}
