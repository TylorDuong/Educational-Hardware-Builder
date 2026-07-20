import type { StepPlan } from "../src/index.js";

/** Shared golden fixture; agents use it when DEMO_SAFE_MODE pins a lesson step. */
export const weatherStationStepFixture: StepPlan = {
  id: "e6c2cd77-0f4f-4e4d-9d9b-b00667421ec1",
  order: 1,
  title: "Wire the BME280 to the ESP32",
  instruction: "Connect VIN to 3V3, GND to GND, SDA to GPIO 21, and SCL to GPIO 22.",
  safetyCategory: "none",
  lesson: {
    title: "Why I2C shares two signal wires",
    content: "I2C lets several sensors share SDA and SCL while each device has an address.",
    citations: [{
      sourceUrl: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2c.html",
      locator: "I2C Introduction",
      title: "ESP-IDF I2C API Reference",
    }],
  },
  skills: [{
    sourceUrl: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2c.html",
    locator: "I2C Introduction",
    title: "ESP-IDF I2C API Reference",
    relevance: "Explains the I2C connections used in this step.",
  }],
  matingSelections: [],
};
