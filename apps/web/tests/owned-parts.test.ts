import assert from "node:assert/strict";
import test from "node:test";

import { matchedInventoryPartIds, parseOwnedParts } from "../src/owned-parts.js";

test("parses owned individual parts and kits while preserving unverified labels", () => {
  const parts = parseOwnedParts("ESP32 starter kit, BME280 sensor\nBreadboard and jumpers\nESP32 starter kit");
  assert.deepEqual(parts, [
    { label: "ESP32 starter kit", inventoryPartId: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db", matchedName: "ESP32 DevKit" },
    { label: "BME280 sensor", inventoryPartId: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85", matchedName: "BME280 sensor" },
    { label: "Breadboard and jumpers" },
  ]);
  assert.deepEqual(matchedInventoryPartIds(parts), [
    "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
    "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
  ]);
});
