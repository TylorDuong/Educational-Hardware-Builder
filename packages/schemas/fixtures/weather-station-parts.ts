import type { CadAssetRecord } from "../src/index.js";

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
    matingFeatures: [
      { id: "breadboard-anchor-1", kind: "mounting_hole", positionMm: [0, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "breadboard-anchor-2", kind: "mounting_hole", positionMm: [42, 0, 0], diameterMm: 3, normal: [0, 0, 1] },
      { id: "breadboard-top-face", kind: "face", positionMm: [21, 26, 8], normal: [0, 0, 1] },
    ],
  },
];
