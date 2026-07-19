import { bme280ToEsp32Selection } from "@educational-hardware-builder/schemas/mocks";

import { formatSolverError, solveWeatherStationSelection } from "./spatial-integration.js";

export const demoPipelineStages = [
  { stage: "queued", message: "Preparing the guided build", percent: 0 },
  { stage: "retrieving", message: "Finding cited guidance", percent: 35 },
  { stage: "generating", message: "Creating the typed step plan", percent: 70 },
  { stage: "complete", message: "Guidance is ready", percent: 100 },
] as const;

export const demoParts = [
  { name: "ESP32 DevKit", role: "Compute controller", status: "In inventory" },
  { name: "BME280 breakout", role: "Temperature, pressure, and humidity sensor", status: "In inventory" },
  { name: "Breadboard and jumpers", role: "Prototype wiring", status: "In inventory" },
  { name: "L-bracket", role: "Validated sensor support", status: "Template ready" },
] as const;

export const demoSubstitution = {
  requested: "Dedicated weather-station sensor mount",
  selected: "Validated L-bracket template",
  justification: "The authored L-bracket uses bounded dimensions and deterministic validation, so it can support the sensor without asking a model to generate geometry.",
} as const;

export type SolverRetryDemo =
  | { ok: true; firstAttempt: string; retry: string }
  | { ok: false; message: string };

/**
 * Replays the same symbolic correction path used by the assembly boundary.
 * The UI receives explanations only; no model-generated coordinates enter the flow.
 */
export function runSolverRetryDemo(): SolverRetryDemo {
  const rejected = solveWeatherStationSelection({
    ...bme280ToEsp32Selection,
    targetPartId: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
    targetFeatureId: "breadboard-anchor-1",
  }, "10000000-0000-4000-8000-000000000003");

  if (rejected.ok) return { ok: false, message: "The demonstration mate unexpectedly passed validation." };

  const retry = solveWeatherStationSelection(bme280ToEsp32Selection, "10000000-0000-4000-8000-000000000003");
  if (!retry.ok) return { ok: false, message: formatSolverError(retry.error) };

  return {
    ok: true,
    firstAttempt: formatSolverError(rejected.error),
    retry: "Retry accepted: the solver produced the deterministic transform from the corrected symbolic mate.",
  };
}
