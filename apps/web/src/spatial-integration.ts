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
