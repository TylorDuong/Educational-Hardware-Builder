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

const step = (
  id: string,
  order: number,
  title: string,
  instruction: string,
  safetyCategory: StepPlan["safetyCategory"],
  lessonTitle: string,
  content: string,
  completionCondition: string,
  citation: StepPlan["lesson"]["citations"][number],
): StepPlan => ({
  id, order, title, instruction, safetyCategory,
  lesson: { title: lessonTitle, content, citations: [citation] },
  completionCondition,
  whyItMatters: content,
  concepts: [{ title: lessonTitle, explanation: content }],
  sourceDigest: { summary: content, citation },
  skills: [{ ...citation, relevance: `Explains the technique used while you ${title.toLowerCase()}.` }],
  matingSelections: [],
});

export const weatherStationGoldenSteps: readonly StepPlan[] = [
  step(
    "10000000-0000-4000-8000-000000000001", 1, "Review the parts",
    "Identify the ESP32, BME280, breadboard, power source, and enclosure.", "none",
    "Read the build as a system",
    "Identifying each part before placement keeps the controller, sensor, power, mounting, and enclosure roles separate. It gives you a clear reference for checking board labels against the cited documentation before wires or fasteners conceal a mistake.",
    "You can name each part and describe its role in the weather-station assembly.",
    cite.esp32,
  ),
  {
    ...step(
      "10000000-0000-4000-8000-000000000002", 2, "Place the ESP32",
      "Seat the ESP32 so both header rows have independent breadboard rows.", "mechanical",
      "Keep every controller pin reachable",
      "The ESP32 header rows need separate breadboard rows so later connections stay independent and inspectable. Starting with this spacing makes it possible to trace a wire back to a named pin instead of guessing which contacts share a row.",
      "Both ESP32 header rows sit on separate breadboard rows with their pins accessible.",
      cite.esp32,
    ),
    matingSelections: [{ movingPartId: parts.esp32, movingFeatureId: "esp32-proto-1", targetPartId: parts.breadboard, targetFeatureId: "breadboard-anchor-1", fastener: "breadboard placement" }],
  },
  {
    ...step(
      "10000000-0000-4000-8000-000000000003", 3, "Place the BME280",
      "Place the sensor where its header can reach the ESP32 with short jumper wires.", "mechanical",
      "Make the signal path easy to inspect",
      "Place the sensor with enough room for direct, organized jumpers to the controller. A clear layout makes each future connection visible, lets you compare the sensor labels with the cited datasheet, and simplifies troubleshooting before power is connected.",
      "The BME280 header is reachable from the ESP32 with short, uncrossed jumper paths.",
      cite.bme280,
    ),
    matingSelections: [{ movingPartId: parts.bme280, movingFeatureId: "bme280-mount-1", targetPartId: parts.esp32, targetFeatureId: "esp32-proto-1", fastener: "M2.5x6" }],
  },
  step(
    "10000000-0000-4000-8000-000000000004", 4, "Connect ground",
    "Connect BME280 GND to an ESP32 GND pin.", "none",
    "Create a shared electrical reference",
    "Ground gives the controller and sensor the same reference for the signals they exchange. Making this connection explicit first makes the rest of the wiring diagram easier to read because every power and I2C signal is understood relative to the same reference.",
    "A single jumper visibly connects the BME280 GND label to an ESP32 GND pin.",
    cite.bme280,
  ),
  step(
    "10000000-0000-4000-8000-000000000005", 5, "Connect sensor power",
    "Connect BME280 VIN to the ESP32 3V3 supply.", "none",
    "Use the documented supply rail",
    "The reference build powers the sensor from the ESP32's regulated 3.3 V rail. Reading the cited pin and sensor documentation together helps you follow the named power path instead of inferring a connection from wire color or physical position.",
    "A single jumper visibly connects BME280 VIN to the ESP32 3V3 pin.",
    cite.bme280,
  ),
  step(
    "10000000-0000-4000-8000-000000000006", 6, "Wire I2C data",
    "Connect BME280 SDA to the ESP32 I2C data pin.", "none",
    "Follow the I2C data path",
    "SDA carries the information exchanged between the controller and sensor on the I2C bus. Keeping this jumper separate and labeled in the diagram makes it easier to verify the data path before software is asked to read the sensor.",
    "A single jumper visibly connects BME280 SDA to the ESP32 SDA or GPIO21 pin shown in the cited guide.",
    cite.bme280,
  ),
  step(
    "10000000-0000-4000-8000-000000000007", 7, "Wire I2C clock",
    "Connect BME280 SCL to the ESP32 I2C clock pin.", "none",
    "Follow the I2C timing path",
    "SCL coordinates when information moves on the I2C bus. Reading the clock and data connections as a pair helps you see that the sensor needs both named signal paths, in addition to power and ground, before it can communicate.",
    "A single jumper visibly connects BME280 SCL to the ESP32 SCL or GPIO22 pin shown in the cited guide.",
    cite.bme280,
  ),
  {
    ...step(
      "10000000-0000-4000-8000-000000000008", 8, "Plan the L-bracket",
      "Request the bounded L-bracket template for the sensor support.", "mechanical",
      "Use a validated mechanical interface",
      "The bracket is planned from a bounded template so its mounting relationship remains within the dimensions the fixture can validate. This separates the mechanical design decision from arbitrary spatial coordinates and keeps the support easy to inspect before fabrication.",
      "The bracket plan names the enclosure mounting point and the approved fastener relationship.",
      cite.enclosure,
    ),
    matingSelections: [{ movingPartId: parts.bracket, movingFeatureId: "bracket-mount-1", targetPartId: parts.enclosure, targetFeatureId: "enclosure-mount-1", fastener: "M3x8" }],
  },
  step(
    "10000000-0000-4000-8000-000000000009", 9, "Inspect wiring",
    "Check power, ground, SDA, and SCL before applying power.", "soldering",
    "Verify the circuit before energy is present",
    "Inspection turns the named netlist into a deliberate check: compare each jumper's two endpoints with the diagram, then look for unintended contacts. This is the moment to find a swapped or loose connection while the circuit is still unpowered.",
    "You have traced 3V3, GND, SDA, and SCL from the BME280 labels to their ESP32 endpoints.",
    cite.solder,
  ),
  {
    ...step(
      "10000000-0000-4000-8000-000000000010", 10, "Attach power",
      "Connect the regulated power pack after inspection is complete.", "none",
      "Make power the final connection",
      "Connecting the regulated power pack only after the wiring inspection creates a clear boundary between assembly and energizing the circuit. If the model and diagram match first, the first powered check is easier to reason about and diagnose.",
      "The regulated power path is connected only after the four sensor wires have been inspected.",
      cite.esp32,
    ),
    matingSelections: [{ movingPartId: parts.battery, movingFeatureId: "battery-pack-mount-1", targetPartId: parts.enclosure, targetFeatureId: "enclosure-mount-1", fastener: "M3x8" }],
  },
  step(
    "10000000-0000-4000-8000-000000000011", 11, "Read sensor values",
    "Run the sensor check and confirm temperature, humidity, and pressure values.", "none",
    "Connect wiring to observable behavior",
    "The BME280 combines temperature, humidity, and pressure sensing in one device. Reading values after the physical checks links the named I2C connections to an observable result and gives you a baseline before the electronics are placed in the enclosure.",
    "The sensor check returns temperature, humidity, and pressure readings that can be reviewed.",
    cite.bme280,
  ),
  {
    ...step(
      "10000000-0000-4000-8000-000000000012", 12, "Secure the enclosure",
      "Place the verified assembly in the enclosure while leaving the sensor exposed to air.", "mechanical",
      "Protect the electronics without blocking the measurement",
      "The enclosure protects the verified electronics, while the sensor still needs contact with the surrounding air to measure the environment. Treating protection and exposure as separate requirements explains why final placement follows the sensor check, not the other way around.",
      "The verified assembly is secured and the BME280 remains positioned to sample ambient air.",
      cite.enclosure,
    ),
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
