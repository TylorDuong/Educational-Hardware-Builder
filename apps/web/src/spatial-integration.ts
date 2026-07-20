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
  GuidedLessonStep,
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
  name: string;
  purpose: string;
  displaySize: [number, number, number];
  cadAssetUrl: string;
  color: string;
  transform: AssemblyTransform;
  solverTrace: SolverTrace;
};

const fixturePartPresentation = new Map<string, Omit<SolverTracedPart, "id" | "cadAssetUrl" | "color" | "transform" | "solverTrace">>([
  ["7e893f29-068e-43e2-9c3c-b9ba2d9ed6db", { name: "ESP32 DevKit", purpose: "Runs the weather-station program and reads the sensor over I2C.", displaySize: [1.2, 0.7, 0.12] }],
  ["5cfc4a97-32ef-45c3-9162-ec2a9094fd85", { name: "BME280 sensor", purpose: "Measures temperature, humidity, and pressure for the weather station.", displaySize: [0.65, 0.5, 0.12] }],
  ["a9baf14d-fdd8-4374-a646-8cc2c9f7e93f", { name: "Weatherproof enclosure", purpose: "Protects the electronics while leaving the sensor exposed to air.", displaySize: [2.2, 1.6, 0.75] }],
  ["cd8a91d4-909e-4bba-9e07-047ab5b4bb7b", { name: "L-bracket", purpose: "Provides the validated mechanical support for the sensor mount.", displaySize: [0.9, 0.25, 1.1] }],
  ["f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3", { name: "Mini breadboard", purpose: "Provides temporary, solder-free connections during prototyping.", displaySize: [1.8, 0.9, 0.2] }],
  ["63a0ac08-8a40-49b0-b152-f55ef7329374", { name: "USB-C cable", purpose: "Supplies regulated power and provides a programming connection.", displaySize: [2.1, 0.14, 0.14] }],
  ["4e4fd2a7-b9a4-490c-9dfe-d4f9683ac1e2", { name: "Jumper wires", purpose: "Carry power and I2C signals between the board and sensor.", displaySize: [1.5, 0.1, 0.1] }],
  ["c6870a5c-25a3-45a9-a7ef-3f45e69d2fb3", { name: "M3 fastener", purpose: "Secures the enclosure and bracket at approved mounting points.", displaySize: [0.18, 0.18, 0.55] }],
  ["dcd6795b-d669-4bd7-944f-35a2708cf7b2", { name: "AA battery pack", purpose: "Provides the build's portable power source after inspection.", displaySize: [1.45, 0.75, 0.42] }],
  ["b2e6a1bb-4e50-4f1e-b31a-807232832f03", { name: "Weatherproof grommet", purpose: "Protects the cable where it enters the enclosure.", displaySize: [0.38, 0.38, 0.2] }],
]);

export type SolverIntegrationError = SolverError | {
  code: "UNKNOWN_PART";
  message: string;
  partId: string;
};

export type SolverRetryMessage = {
  code: SolverIntegrationError["code"];
  message: string;
  retryInstruction: string;
};

export type SelectedProposalSolveResult =
  | { ok: true; traces: SolverTrace[]; message: string }
  | { ok: false; failedStepId: string; selection: MatingSelection; rejection: SolverRetryMessage };

export type TemplateDisplayResult =
  | { ok: true; stl: string; message: "L-bracket validated and ready to print." }
  | { ok: false; message: string };

function fixtureAsset(partId: string) {
  const asset = weatherStationCadAssets.find((candidate) => candidate.partId === partId);
  if (!asset) throw new Error(`No CAD fixture is available for part ${partId}.`);
  return asset;
}

export function formatSolverError(error: SolverIntegrationError): string {
  switch (error.code) {
    case "MISMATCHED_HOLE_COUNT":
      return `Mounting-hole count does not match: expected ${error.expected}, received ${error.actual}. Choose matching features.`;
    case "INCOMPATIBLE_SPACING":
      return `Mating feature dimensions differ: expected ${error.expectedMm} mm, received ${error.actualMm} mm. Choose compatible features.`;
    case "BOUNDING_BOX_COLLISION":
      return `${error.partIds[0]} and ${error.partIds[1]} collide on the ${error.overlapAxis}-axis. Choose a different symbolic mate.`;
    case "UNKNOWN_FEATURE":
      return `Feature ${error.featureId} is unavailable on part ${error.partId}. Choose an existing feature ID.`;
    case "UNKNOWN_PART":
      return `Part ${error.partId} has no approved CAD fixture. Choose a catalog part with validated symbolic features.`;
  }
}

export function solveWeatherStationSelection(selection: MatingSelection, stepId: string): SolveResult {
  return solveMatingSelection(selection, fixtureAsset(selection.movingPartId), fixtureAsset(selection.targetPartId), stepId);
}

function solveSelectedProposalSelection(selection: MatingSelection, stepId: string): SolveResult | { ok: false; error: SolverIntegrationError } {
  const moving = weatherStationCadAssets.find((asset) => asset.partId === selection.movingPartId);
  if (!moving) {
    return { ok: false, error: { code: "UNKNOWN_PART", message: "Selected moving part has no approved CAD fixture.", partId: selection.movingPartId } };
  }
  const target = weatherStationCadAssets.find((asset) => asset.partId === selection.targetPartId);
  if (!target) {
    return { ok: false, error: { code: "UNKNOWN_PART", message: "Selected target part has no approved CAD fixture.", partId: selection.targetPartId } };
  }
  return solveMatingSelection(selection, moving, target, stepId);
}

/** Converts a deterministic solver failure into a typed retry instruction with no geometry payload. */
export function solverRetryMessage(error: SolverIntegrationError): SolverRetryMessage {
  return {
    code: error.code,
    message: formatSolverError(error),
    retryInstruction: "Choose a different approved symbolic part and feature pairing, then retry deterministic validation. Do not provide manual geometry values.",
  };
}

/** Solves only symbolic mates from a selected proposal lesson; transforms never originate from lesson output. */
export function solveSelectedProposalParts(lesson: { steps: readonly Pick<GuidedLessonStep, "id" | "order" | "matingSelections">[] }): SelectedProposalSolveResult {
  const traces: SolverTrace[] = [];
  for (const step of [...lesson.steps].sort((left, right) => left.order - right.order)) {
    for (const selection of step.matingSelections) {
      const result = solveSelectedProposalSelection(selection, step.id);
      if (!result.ok) {
        return {
          ok: false,
          failedStepId: step.id,
          selection,
          rejection: solverRetryMessage(result.error),
        };
      }
      traces.push({ selection, transform: result.transform, source: "deterministic-solver" });
    }
  }
  return {
    ok: true,
    traces,
    message: traces.length === 0
      ? "This selected proposal has no symbolic assembly mates to solve."
      : `Validated ${traces.length} symbolic assembly mate${traces.length === 1 ? "" : "s"} with the deterministic solver.`,
  };
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
    const presentation = fixturePartPresentation.get(asset.partId);
    if (!presentation) throw new Error(`Fixture part ${asset.partId} is missing a learner-facing display description.`);
    return {
      id: asset.id,
      ...presentation,
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
