import {
  StepPlanSchema,
  TemplateParamsSchema,
  type StepPlan,
  type TemplateParams,
} from "@educational-hardware-builder/schemas";

const parts = {
  esp32: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  bme280: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
  enclosure: "a9baf14d-fdd8-4374-a646-8cc2c9f7e93f",
  bracket: "cd8a91d4-909e-4bba-9e07-047ab5b4bb7b",
  breadboard: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
  battery: "dcd6795b-d669-4bd7-944f-35a2708cf7b2",
} as const;

const cite = {
  esp32: { sourceUrl: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/", locator: "Hardware overview", title: "ESP-IDF Programming Guide" },
  bme280: { sourceUrl: "https://cdn-shop.adafruit.com/datasheets/BST-BME280_DS001-10.pdf", locator: "Sections 1 and 5", title: "BME280 Datasheet" },
  solder: { sourceUrl: "https://learn.adafruit.com/adafruit-guide-excellent-soldering", locator: "Safety and setup", title: "Adafruit Soldering Guide" },
  enclosure: { sourceUrl: "https://learn.adafruit.com/weather-station-case", locator: "Mounting guidance", title: "Weather Station Enclosure Guide" },
} as const;

const step = (id: string, order: number, title: string, instruction: string, safetyCategory: StepPlan["safetyCategory"], content: string, citation: StepPlan["lesson"]["citations"][number]): StepPlan => ({
  id, order, title, instruction, safetyCategory,
  lesson: { title, content, citations: [citation] },
  matingSelections: [],
});

export const weatherStationGoldenSteps: readonly StepPlan[] = [
  step("10000000-0000-4000-8000-000000000001", 1, "Review the parts", "Identify the ESP32, BME280, breadboard, power source, and enclosure.", "none", "Planning the parts first prevents wiring mistakes.", cite.esp32),
  {
    ...step("10000000-0000-4000-8000-000000000002", 2, "Place the ESP32", "Seat the ESP32 so both header rows have independent breadboard rows.", "mechanical", "Breadboard spacing determines which pins can be connected independently.", cite.esp32),
    matingSelections: [{ movingPartId: parts.esp32, movingFeatureId: "esp32-proto-1", targetPartId: parts.breadboard, targetFeatureId: "breadboard-anchor-1", fastener: "breadboard placement" }],
  },
  {
    ...step("10000000-0000-4000-8000-000000000003", 3, "Place the BME280", "Place the sensor where its header can reach the ESP32 with short jumper wires.", "mechanical", "Short, organized connections are easier to inspect.", cite.bme280),
    matingSelections: [{ movingPartId: parts.bme280, movingFeatureId: "bme280-mount-1", targetPartId: parts.esp32, targetFeatureId: "esp32-proto-1", fastener: "M2.5x6" }],
  },
  step("10000000-0000-4000-8000-000000000004", 4, "Connect ground", "Connect BME280 GND to an ESP32 GND pin.", "none", "A common ground gives both devices the same signal reference.", cite.bme280),
  {
    ...step("10000000-0000-4000-8000-000000000005", 5, "Connect sensor power", "Connect BME280 VIN to the ESP32 3V3 supply.", "none", "The reference build uses the regulated 3.3 V rail.", cite.bme280),
    checkpoint: { id: "20000000-0000-4000-8000-000000000001", prompt: "Which ESP32 power rail is used for the BME280?", choices: ["3V3", "9 V battery", "Mains outlet"], correctAnswer: "3V3" },
  },
  step("10000000-0000-4000-8000-000000000006", 6, "Wire I2C data", "Connect BME280 SDA to the ESP32 I2C data pin.", "none", "SDA carries I2C data between the controller and sensor.", cite.bme280),
  {
    ...step("10000000-0000-4000-8000-000000000007", 7, "Wire I2C clock", "Connect BME280 SCL to the ESP32 I2C clock pin.", "none", "SCL coordinates when I2C devices send and read data.", cite.bme280),
    checkpoint: { id: "20000000-0000-4000-8000-000000000002", prompt: "Which two wires make up this I2C bus?", choices: ["SDA and SCL", "VIN and GND", "TX and RX"], correctAnswer: "SDA and SCL" },
  },
  {
    ...step("10000000-0000-4000-8000-000000000008", 8, "Plan the L-bracket", "Request the bounded L-bracket template for the sensor support.", "mechanical", "A predefined bracket keeps the mount within validated physical limits.", cite.enclosure),
    matingSelections: [{ movingPartId: parts.bracket, movingFeatureId: "bracket-mount-1", targetPartId: parts.enclosure, targetFeatureId: "enclosure-mount-1", fastener: "M3x8" }],
  },
  step("10000000-0000-4000-8000-000000000009", 9, "Inspect wiring", "Check power, ground, SDA, and SCL before applying power.", "soldering", "Inspection catches swapped wires and unintended shorts before energizing.", cite.solder),
  {
    ...step("10000000-0000-4000-8000-000000000010", 10, "Attach power", "Connect the regulated power pack after inspection is complete.", "none", "Power comes last so wiring errors are found first.", cite.esp32),
    matingSelections: [{ movingPartId: parts.battery, movingFeatureId: "battery-pack-mount-1", targetPartId: parts.enclosure, targetFeatureId: "enclosure-mount-1", fastener: "M3x8" }],
  },
  {
    ...step("10000000-0000-4000-8000-000000000011", 11, "Read sensor values", "Run the sensor check and confirm temperature, humidity, and pressure values.", "none", "The BME280 combines environmental sensing for temperature, humidity, and pressure.", cite.bme280),
    checkpoint: { id: "20000000-0000-4000-8000-000000000003", prompt: "Why inspect the circuit before powering it?", choices: ["Catch wiring mistakes before they are energized", "Make the board faster", "Remove the sensor address"], correctAnswer: "Catch wiring mistakes before they are energized" },
  },
  {
    ...step("10000000-0000-4000-8000-000000000012", 12, "Secure the enclosure", "Place the verified assembly in the enclosure while leaving the sensor exposed to air.", "mechanical", "An enclosure protects electronics while the sensor needs contact with the air it measures.", cite.enclosure),
    matingSelections: [{ movingPartId: parts.esp32, movingFeatureId: "esp32-proto-2", targetPartId: parts.enclosure, targetFeatureId: "enclosure-mount-1", fastener: "M3x8" }],
  },
] as const;

export const weatherStationTemplateRequests: readonly (TemplateParams & { id: string; stepId: string })[] = [{
  id: "30000000-0000-4000-8000-000000000001",
  stepId: "10000000-0000-4000-8000-000000000008",
  templateId: "l-bracket",
  values: { widthMm: 30, heightMm: 24, thicknessMm: 3, holeSpacingMm: 20 },
}];

export function validateWeatherStationGoldenFixture(): void {
  weatherStationGoldenSteps.forEach((item) => StepPlanSchema.parse(item));
  weatherStationTemplateRequests.forEach(({ id: _id, stepId: _stepId, ...request }) => TemplateParamsSchema.parse(request));
}
