import type {
  AgentProgressEvent,
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
