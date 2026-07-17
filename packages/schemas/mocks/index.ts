import type {
  AgentProgressEvent,
  AssemblyTransform,
  MatingSelection,
  PartRecord,
  RetrievalResult,
} from "../src/index.js";

export const esp32PartMock: PartRecord = {
  id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  slug: "esp32-devkit-v1",
  name: "ESP32 DevKit V1",
  category: "compute",
  electricalSpecs: { logicVoltage: "3.3V", inputVoltage: "5V USB" },
  datasheetUrl: "https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
  cadAssetIds: [],
};

export const retrievalResultMock: RetrievalResult = {
  chunkId: "9bbd5a99-5aa1-42e4-b1f0-9e4116d46f67",
  content: "Connect the BME280 SDA and SCL lines to the ESP32 I2C bus and use 3.3 V power.",
  score: 0.94,
  citations: [{
    sourceUrl: "https://cdn-shop.adafruit.com/datasheets/BST-BME280_DS001-10.pdf",
    locator: "Section 5.2",
    title: "BME280 Datasheet",
  }],
};

export const progressEventMock: AgentProgressEvent = {
  operationId: "fb5f4c45-fb24-4690-b785-a306e857a373",
  stage: "retrieving",
  message: "Finding cited wiring guidance",
  percent: 35,
};

export type MockSolverError = {
  code: "UNKNOWN_MATING_SELECTION";
  message: string;
  selection: MatingSelection;
};

export type MockSolverResult =
  | { ok: true; transform: AssemblyTransform }
  | { ok: false; error: MockSolverError };

export const bme280ToEsp32Selection: MatingSelection = {
  movingPartId: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
  movingFeatureId: "bme280-mount-1",
  targetPartId: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  targetFeatureId: "esp32-proto-1",
  fastener: "M2.5x6",
};

export const bme280ToEsp32Transform: AssemblyTransform = {
  partId: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
  stepId: "9c353a61-0b22-4881-a3f4-ca9c467853f6",
  positionMm: [0, 0, 8],
  quaternion: [0, 0, 0, 1],
  parentFrame: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  coordinateConvention: "z-up-parent-relative",
};

/** Fixture-compatible solver contract used by agents before the real solver lands. */
export function mockSolveMatingSelection(selection: MatingSelection): MockSolverResult {
  if (
    selection.movingPartId === bme280ToEsp32Selection.movingPartId
    && selection.movingFeatureId === bme280ToEsp32Selection.movingFeatureId
    && selection.targetPartId === bme280ToEsp32Selection.targetPartId
    && selection.targetFeatureId === bme280ToEsp32Selection.targetFeatureId
  ) {
    return { ok: true, transform: bme280ToEsp32Transform };
  }

  return {
    ok: false,
    error: {
      code: "UNKNOWN_MATING_SELECTION",
      message: "The fixture solver has no expected transform for this symbolic mating selection.",
      selection,
    },
  };
}
