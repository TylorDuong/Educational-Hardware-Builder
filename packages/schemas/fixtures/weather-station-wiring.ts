import { ElectricalNetlistSchema, type ElectricalNetlist } from "../src/index.js";

/**
 * Cited, symbolic electrical intent for the weather-station fixture. It intentionally contains
 * no visual position or route data: the wiring solver owns those values.
 */
export const weatherStationWiringNetlist: ElectricalNetlist = ElectricalNetlistSchema.parse({
  projectName: "Weather station sensor harness",
  components: [
    {
      refdes: "U2",
      role: "input",
      value: "BME280 sensor breakout",
      libraryRef: "Sensor_BME280_Breakout",
      pins: {
        VCC: { name: "3V3", type: "power_in" },
        GND: { name: "GND", type: "power_in" },
        SDA: { name: "SDA", type: "bidirectional" },
        SCL: { name: "SCL", type: "bidirectional" },
      },
      citation: {
        sourceUrl: "https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf",
        locator: "I²C interface signals; confirm the breakout board's silk-screen labels before wiring",
        title: "Bosch Sensortec BME280 datasheet",
      },
    },
    {
      refdes: "U1",
      role: "logic",
      value: "ESP32-DevKitC V4",
      libraryRef: "MCU_Espressif_ESP32_DevKit",
      pins: {
        "3V3": { name: "3V3", type: "power_out" },
        GND: { name: "GND", type: "power_in" },
        GPIO21: { name: "GPIO21 / SDA", type: "bidirectional" },
        GPIO22: { name: "GPIO22 / SCL", type: "bidirectional" },
      },
      citation: {
        sourceUrl: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html",
        locator: "J2/J3 header blocks: 3V3, GND, IO21, and IO22",
        title: "Espressif ESP32-DevKitC V4 user guide",
      },
    },
  ],
  nets: [
    {
      name: "3V3",
      kind: "power",
      connections: [{ refdes: "U2", pin: "VCC" }, { refdes: "U1", pin: "3V3" }],
    },
    {
      name: "GND",
      kind: "power",
      connections: [{ refdes: "U2", pin: "GND" }, { refdes: "U1", pin: "GND" }],
    },
    {
      name: "I2C_SDA",
      kind: "signal",
      connections: [{ refdes: "U2", pin: "SDA" }, { refdes: "U1", pin: "GPIO21" }],
    },
    {
      name: "I2C_SCL",
      kind: "signal",
      connections: [{ refdes: "U2", pin: "SCL" }, { refdes: "U1", pin: "GPIO22" }],
    },
  ],
});
