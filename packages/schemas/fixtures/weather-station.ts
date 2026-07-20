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
  completionCondition: "VIN, GND, SDA, and SCL each reach the named ESP32 pin in the cited guide.",
  whyItMatters: "The named I2C connections create a power path and the two signal paths the controller uses to communicate with the sensor.",
  concepts: [{
    title: "I2C bus",
    explanation: "I2C uses named data and clock wires so the controller can communicate with addressed devices.",
  }],
  skills: [{
    sourceUrl: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/i2c.html",
    locator: "I2C Introduction",
    title: "ESP-IDF I2C API Reference",
    relevance: "Explains the I2C connections used in this step.",
  }],
  matingSelections: [],
};
