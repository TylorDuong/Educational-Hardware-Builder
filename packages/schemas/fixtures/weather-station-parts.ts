import type { CadAssetRecord } from "../src/index.js";

function fixtureDimensionEvidence(
  confidence: number,
  sourceUrl: string,
  locator: string,
  title: string,
) {
  return {
    confidence,
    citation: { sourceUrl, locator, title },
  };
}

/**
 * B2 hand-authored ground truth for the first five weather-station parts.
 * Positions are millimetres in each part's local, Z-up frame. A deterministic solver—not a
 * language model—will later turn symbolic feature selections into assembly transforms.
 */
export const weatherStationCadAssets: CadAssetRecord[] = [
  {
    id: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
    partId: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
    filePath: "packages/schemas/fixtures/esp32-devkit.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://www.espressif.com/",
    license: "Placeholder geometry; datasheet-derived mounting layout.",
    boundsMm: [55, 28, 13],
    dimensionEvidence: fixtureDimensionEvidence(
      0.98,
      "https://www.espressif.com/",
      "ESP32-DevKitC board envelope used by the weather-station fixture",
      "Espressif ESP32 development boards",
    ),
    matingFeatures: [
      { id: "esp32-proto-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 2.5, normal: [0, 0, 1] },
      { id: "esp32-proto-2", kind: "mounting_hole", positionMm: [25, 0, 0], diameterMm: 2.5, normal: [0, 0, 1] },
      { id: "esp32-i2c-header", kind: "connector", positionMm: [12.5, 24, 3], normal: [0, 1, 0] },
    ],
  },
  {
    id: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
    partId: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
    filePath: "packages/schemas/fixtures/bme280.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors/bme280/",
    license: "Placeholder geometry; datasheet-derived mounting layout.",
    boundsMm: [25, 15, 4],
    dimensionEvidence: fixtureDimensionEvidence(
      0.96,
      "https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors/bme280/",
      "BME280 breakout-board envelope used by the weather-station fixture",
      "Bosch Sensortec BME280 environmental sensor",
    ),
    matingFeatures: [
      { id: "bme280-mount-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 2.5, normal: [0, 0, 1] },
      { id: "bme280-mount-2", kind: "mounting_hole", positionMm: [25, 0, 0], diameterMm: 2.5, normal: [0, 0, 1] },
      { id: "bme280-i2c-header", kind: "connector", positionMm: [12.5, 12, 2], normal: [0, 1, 0] },
    ],
  },
  {
    id: "a9baf14d-fdd8-4374-a646-8cc2c9f7e93f",
    partId: "a9baf14d-fdd8-4374-a646-8cc2c9f7e93f",
    filePath: "packages/schemas/fixtures/enclosure.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://en.wikipedia.org/wiki/Parametric_design",
    license: "CC BY-SA 4.0 placeholder geometry.",
    boundsMm: [120, 80, 45],
    dimensionEvidence: fixtureDimensionEvidence(
      0.91,
      "https://en.wikipedia.org/wiki/Parametric_design",
      "Weather-station enclosure parametric fixture proxy: 120 by 80 by 45 mm",
      "Parametric design reference for weather-station enclosure fixture",
    ),
    matingFeatures: [
      { id: "enclosure-mount-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "enclosure-lid-face", kind: "face", positionMm: [40, 30, 20], normal: [0, 0, 1] },
    ],
  },
  {
    id: "cd8a91d4-909e-4bba-9e07-047ab5b4bb7b",
    partId: "cd8a91d4-909e-4bba-9e07-047ab5b4bb7b",
    filePath: "packages/schemas/fixtures/l-bracket.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://en.wikipedia.org/wiki/Angle_bracket",
    license: "CC BY-SA 4.0 placeholder geometry.",
    boundsMm: [30, 20, 30],
    dimensionEvidence: fixtureDimensionEvidence(
      0.92,
      "https://en.wikipedia.org/wiki/Angle_bracket",
      "Weather-station L-bracket fixture proxy: 30 by 20 by 30 mm",
      "Angle bracket reference for weather-station fixture",
    ),
    matingFeatures: [
      { id: "bracket-mount-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "bracket-mount-2", kind: "mounting_hole", positionMm: [20, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "bracket-upright-face", kind: "face", positionMm: [10, 10, 15], normal: [0, 1, 0] },
    ],
  },
  {
    id: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
    partId: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
    filePath: "packages/schemas/fixtures/mini-breadboard.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://learn.adafruit.com/breadboards-for-beginners",
    license: "Hand-authored fixture metadata; documentation-derived mounting layout.",
    boundsMm: [85, 55, 9],
    dimensionEvidence: fixtureDimensionEvidence(
      0.96,
      "https://learn.adafruit.com/breadboards-for-beginners",
      "Mini breadboard envelope used by the weather-station fixture",
      "Adafruit breadboards for beginners",
    ),
    matingFeatures: [
      { id: "breadboard-anchor-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "breadboard-anchor-2", kind: "mounting_hole", positionMm: [42, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "breadboard-top-face", kind: "face", positionMm: [21, 26, 8], normal: [0, 0, 1] },
    ],
  },
  {
    id: "63a0ac08-8a40-49b0-b152-f55ef7329374",
    partId: "63a0ac08-8a40-49b0-b152-f55ef7329374",
    filePath: "packages/schemas/fixtures/usb-c-cable.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://www.usb.org/document-library/usb-type-cr-cable-and-connector-specification",
    license: "Hand-authored fixture metadata; connector geometry is documentation-derived.",
    boundsMm: [12, 12, 100],
    dimensionEvidence: fixtureDimensionEvidence(
      0.9,
      "https://www.usb.org/document-library/usb-type-cr-cable-and-connector-specification",
      "USB-C cable proxy with 100 mm endpoint separation for the weather-station fixture",
      "USB Type-C cable and connector specification",
    ),
    matingFeatures: [
      { id: "usb-c-host", kind: "connector", positionMm: [0, 0, 0], normal: [0, 0, 1] },
      { id: "usb-c-device", kind: "connector", positionMm: [0, 0, 100], normal: [0, 0, -1] },
    ],
  },
  {
    id: "4e4fd2a7-b9a4-490c-9dfe-d4f9683ac1e2",
    partId: "4e4fd2a7-b9a4-490c-9dfe-d4f9683ac1e2",
    filePath: "packages/schemas/fixtures/jumper-wire.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://learn.sparkfun.com/tutorials/working-with-wire/all",
    license: "Hand-authored fixture metadata; generic 2.54 mm jumper geometry.",
    boundsMm: [3, 3, 150],
    dimensionEvidence: fixtureDimensionEvidence(
      0.9,
      "https://learn.sparkfun.com/tutorials/working-with-wire/all",
      "2.54 mm jumper-wire proxy with 150 mm endpoint separation for the weather-station fixture",
      "SparkFun working with wire tutorial",
    ),
    matingFeatures: [
      { id: "jumper-end-a", kind: "connector", positionMm: [0, 0, 0], normal: [0, 0, 1] },
      { id: "jumper-end-b", kind: "connector", positionMm: [0, 0, 150], normal: [0, 0, -1] },
    ],
  },
  {
    id: "c6870a5c-25a3-45a9-a7ef-3f45e69d2fb3",
    partId: "c6870a5c-25a3-45a9-a7ef-3f45e69d2fb3",
    filePath: "packages/schemas/fixtures/m3-fastener.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://www.iso.org/standard/67826.html",
    license: "Hand-authored fixture metadata; ISO M3 fastener dimensions.",
    boundsMm: [6, 6, 16],
    dimensionEvidence: fixtureDimensionEvidence(
      0.97,
      "https://www.iso.org/standard/67826.html",
      "M3 fastener fixture proxy with 6 mm head envelope and 16 mm overall length",
      "ISO metric screw thread reference",
    ),
    matingFeatures: [
      { id: "m3-axis", kind: "axis", positionMm: [0, 0, 0], normal: [0, 0, 1] },
      { id: "m3-head-face", kind: "face", positionMm: [0, 0, 3], normal: [0, 0, 1] },
    ],
  },
  {
    id: "dcd6795b-d669-4bd7-944f-35a2708cf7b2",
    partId: "dcd6795b-d669-4bd7-944f-35a2708cf7b2",
    filePath: "packages/schemas/fixtures/aa-battery-pack.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://data.energizer.com/pdfs/e91.pdf",
    license: "Hand-authored fixture metadata; battery holder dimensions are datasheet-derived.",
    boundsMm: [58, 32, 16],
    dimensionEvidence: fixtureDimensionEvidence(
      0.94,
      "https://data.energizer.com/pdfs/e91.pdf",
      "Two-AA battery-holder envelope derived from the E91 cell envelope for the weather-station fixture",
      "Energizer E91 AA battery datasheet",
    ),
    matingFeatures: [
      { id: "battery-pack-mount-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "battery-pack-mount-2", kind: "mounting_hole", positionMm: [45, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
    ],
  },
  {
    id: "b2e6a1bb-4e50-4f1e-b31a-807232832f03",
    partId: "b2e6a1bb-4e50-4f1e-b31a-807232832f03",
    filePath: "packages/schemas/fixtures/weatherproof-grommet.stl",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    sourceUrl: "https://www.mcmaster.com/products/grommets/",
    license: "Hand-authored fixture metadata; generic grommet mounting dimensions.",
    boundsMm: [12, 12, 6],
    dimensionEvidence: fixtureDimensionEvidence(
      0.92,
      "https://www.mcmaster.com/products/grommets/",
      "Weatherproof grommet fixture proxy: 12 mm outer diameter by 6 mm height",
      "McMaster-Carr grommets catalog",
    ),
    matingFeatures: [
      { id: "grommet-axis", kind: "axis", positionMm: [0, 0, 0], normal: [0, 0, 1] },
      { id: "grommet-flange", kind: "face", positionMm: [0, 0, 2], normal: [0, 0, 1] },
    ],
  },
];
