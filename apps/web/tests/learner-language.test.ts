import assert from "node:assert/strict";
import test from "node:test";

import { learnerFriendlyText, learnerPartName } from "../src/learner-language.js";

test("learner-facing part names pair technical labels with a plain-language role", () => {
  assert.equal(learnerPartName("ESP32 DevKit", "compute"), "ESP32 microcontroller (ESP32 DevKit)");
  assert.equal(learnerPartName("BME280 breakout", "sensor"), "BME280 sensor (BME280 breakout)");
  assert.equal(learnerPartName("L-bracket", "mechanical"), "L-bracket (mechanical part)");
});

test("learner-facing instructions expand common part abbreviations without repeating their role", () => {
  assert.equal(
    learnerFriendlyText("Place the ESP32 and connect the BME280."),
    "Place the ESP32 microcontroller and connect the BME280 sensor.",
  );
  assert.equal(
    learnerFriendlyText("Place the ESP32 microcontroller beside the BME280 sensor."),
    "Place the ESP32 microcontroller beside the BME280 sensor.",
  );
});
