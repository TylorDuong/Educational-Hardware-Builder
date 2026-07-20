import { bme280ToEsp32Selection } from "@educational-hardware-builder/schemas/mocks";
import type {
  Citation,
  DiscoveryRequest,
  RetrievalResult,
  SkillLibraryEntry,
} from "@educational-hardware-builder/schemas";

import type { CatalogDependencies } from "./catalog.js";
import type { DiscoveryDependencies } from "./discovery.js";
import { formatSolverError, solveWeatherStationSelection } from "./spatial-integration.js";

/**
 * Stable, local-only data for the complete safe-mode discovery demonstration.
 * The fixture deliberately throws if any code tries to contact a model or vendor.
 */
export const demoDiscoveryCitation: Citation = {
  sourceUrl: "https://example.test/usb-led-guide",
  locator: "Assembly",
  title: "USB LED guide",
};

export const demoSkillLibraryEntry: SkillLibraryEntry = {
  ...demoDiscoveryCitation,
  relevance: "Explains the USB power-path concepts used by the deterministic fixture lesson.",
};

export const demoDiscoveryRequest: DiscoveryRequest = {
  prompt: "Build a beginner USB desk light using an ESP32 I already own.",
  mode: "beginner",
  userId: "40000000-0000-4000-8000-000000000001",
  inventoryPartIds: ["7e893f29-068e-43e2-9c3c-b9ba2d9ed6db"],
  constraints: ["usb-power-only"],
};

export const demoMainsDiscoveryRequest: DiscoveryRequest = {
  ...demoDiscoveryRequest,
  prompt: "Help me wire a 120 V mains desk light.",
};

export const demoRetrievedKnowledge: readonly RetrievalResult[] = [{
  chunkId: "d2719a8a-8cc8-4c52-babb-455a70b1f631",
  content: "Connect the LED module only to the USB power path.",
  score: 0.91,
  citations: [demoDiscoveryCitation],
}];

const demoCatalogAlternative = {
  id: "6e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  slug: "esp32-compatible",
  name: "ESP32-compatible board",
  category: "compute",
  electrical_specs: { voltage: "3.3V" },
  datasheet_url: "https://docs.example.test/esp32-compatible.pdf",
  cad_asset_ids: [],
  citation: demoDiscoveryCitation,
  relation: "alternative",
} as const;

const demoFreshOffer = {
  external_id: "vendor:esp32:v1",
  part_id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  provider: "Example Vendor",
  provider_sku: "ESP32-DEVKIT",
  purchase_url: "https://vendor.example.test/esp32",
  availability: "in_stock",
  price: "9.99",
  currency: "USD",
  thumbnail_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  observed_at: "2026-07-18T00:00:00.000Z",
  expires_at: "2099-07-20T00:00:00.000Z",
  source_url: demoDiscoveryCitation.sourceUrl,
  citation: demoDiscoveryCitation,
} as const;

const demoCatalogPool: CatalogDependencies["pool"] = {
  query: async (sql) => {
    if (sql.includes("FROM user_inventory")) {
      return { rows: [{ part_id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db", quantity: "1", raw_label: "ESP32 DevKit" }] };
    }
    if (sql.includes("FROM compatibility_records")) return { rows: [demoCatalogAlternative] };
    if (sql.includes("FROM catalog_offers")) return { rows: [demoFreshOffer] };
    throw new Error("The safe-mode catalog fixture received an unexpected query.");
  },
};

const noNetworkFetcher: typeof fetch = async () => {
  throw new Error("DEMO_SAFE_MODE fixture must not make a network request.");
};

/** Returns a deterministic discovery/catalog dependency graph with no live services. */
export function createDemoDiscoveryDependencies(): DiscoveryDependencies {
  return {
    demoSafeMode: true,
    ollamaUrl: "http://ollama.invalid",
    fetcher: noNetworkFetcher,
    retrieve: async () => [...demoRetrievedKnowledge],
    catalog: { pool: demoCatalogPool },
  };
}

export const demoPipelineStages = [
  { stage: "queued", message: "Preparing the guided build", percent: 0 },
  { stage: "classifying", message: "Checking technical relevance", percent: 20 },
  { stage: "retrieving", message: "Finding cited guidance", percent: 35 },
  { stage: "generating", message: "Creating the typed step plan", percent: 70 },
  { stage: "ready", message: "Guidance is ready", percent: 100 },
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
