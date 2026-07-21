import {
  solveSchematicLayout,
} from "@educational-hardware-builder/solver";
import { MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE } from "@educational-hardware-builder/schemas";
import type {
  SchematicConstraintGraph,
  SchematicLayoutRequest,
  SchematicLayoutResult,
  SchematicLayoutReadyResult,
} from "@educational-hardware-builder/schemas";

import { weatherStationCadAssets } from "../../../packages/schemas/fixtures/weather-station-parts.js";
import type { MechViewPart, MechViewRoute } from "./components/MechView.js";

const fixturePartIds = {
  esp32: "7e893f29-068e-43e2-9c3c-b9ba2d9ed6db",
  bme280: "5cfc4a97-32ef-45c3-9162-ec2a9094fd85",
  enclosure: "a9baf14d-fdd8-4374-a646-8cc2c9f7e93f",
  bracket: "cd8a91d4-909e-4bba-9e07-047ab5b4bb7b",
  breadboard: "f2b8d2a1-5725-4dae-a2ce-0874aa5c8fd3",
  usbCable: "63a0ac08-8a40-49b0-b152-f55ef7329374",
  jumperWire: "4e4fd2a7-b9a4-490c-9dfe-d4f9683ac1e2",
  fastener: "c6870a5c-25a3-45a9-a7ef-3f45e69d2fb3",
  battery: "dcd6795b-d669-4bd7-944f-35a2708cf7b2",
  grommet: "b2e6a1bb-4e50-4f1e-b31a-807232832f03",
} as const;

const fixturePartPresentation = new Map<string, Pick<MechViewPart, "name" | "purpose" | "color">>([
  [fixturePartIds.esp32, { name: "ESP32 DevKit", purpose: "Runs the weather-station program and reads the sensor over I2C.", color: "#38bdf8" }],
  [fixturePartIds.bme280, { name: "BME280 sensor", purpose: "Measures temperature, humidity, and pressure for the weather station.", color: "#22c55e" }],
  [fixturePartIds.enclosure, { name: "Weatherproof enclosure", purpose: "Provides the fixture's validated container boundary.", color: "#64748b" }],
  [fixturePartIds.bracket, { name: "L-bracket", purpose: "Provides the validated mechanical support for the sensor mount.", color: "#f97316" }],
  [fixturePartIds.breadboard, { name: "Mini breadboard", purpose: "Provides temporary, solder-free connections during prototyping.", color: "#0ea5e9" }],
  [fixturePartIds.fastener, { name: "M3 fastener", purpose: "Secures the enclosure and bracket at approved mounting points.", color: "#94a3b8" }],
  [fixturePartIds.battery, { name: "AA battery pack", purpose: "Provides the build's portable power source after inspection.", color: "#ef4444" }],
  [fixturePartIds.grommet, { name: "Weatherproof grommet", purpose: "Protects the cable where it enters the enclosure.", color: "#a855f7" }],
]);

/** A source-backed symbolic fixture graph. Positions are deliberately absent. */
export const weatherStationSchematicGraph: SchematicConstraintGraph = {
  gridUnitMm: 1,
  nodes: [
    {
      partId: fixturePartIds.enclosure,
      role: "container",
      anchors: [
        { name: "inside-bottom", face: "inside_bottom" },
        { name: "inside-top", face: "inside_top" },
        { name: "top", face: "top" },
        { name: "right", face: "right" },
      ],
    },
    {
      partId: fixturePartIds.breadboard,
      role: "base",
      parentPartId: fixturePartIds.enclosure,
      parentAnchor: "inside-bottom",
      anchors: [{ name: "top", face: "top" }],
    },
    {
      partId: fixturePartIds.esp32,
      role: "component",
      parentPartId: fixturePartIds.breadboard,
      parentAnchor: "top",
      anchors: [
        { name: "i2c", face: "top" },
        { name: "power", face: "top" },
      ],
    },
    {
      partId: fixturePartIds.bme280,
      role: "component",
      parentPartId: fixturePartIds.breadboard,
      parentAnchor: "top",
      anchors: [{ name: "i2c", face: "top" }],
    },
    {
      partId: fixturePartIds.battery,
      role: "component",
      parentPartId: fixturePartIds.enclosure,
      parentAnchor: "inside-top",
      anchors: [{ name: "power", face: "top" }],
    },
    {
      partId: fixturePartIds.bracket,
      role: "component",
      parentPartId: fixturePartIds.enclosure,
      parentAnchor: "right",
      anchors: [{ name: "top", face: "top" }],
    },
    {
      partId: fixturePartIds.fastener,
      role: "component",
      parentPartId: fixturePartIds.enclosure,
      parentAnchor: "top",
      anchors: [{ name: "head", face: "top" }],
    },
    {
      partId: fixturePartIds.grommet,
      role: "component",
      parentPartId: fixturePartIds.enclosure,
      parentAnchor: "right",
      anchors: [{ name: "cable", face: "top" }],
    },
    { partId: fixturePartIds.usbCable, role: "flexible", anchors: [] },
    { partId: fixturePartIds.jumperWire, role: "flexible", anchors: [] },
  ],
  connections: [
    {
      id: "jumper-i2c",
      flexiblePartId: fixturePartIds.jumperWire,
      fromPartId: fixturePartIds.bme280,
      fromAnchor: "i2c",
      toPartId: fixturePartIds.esp32,
      toAnchor: "i2c",
    },
    {
      id: "usb-power",
      flexiblePartId: fixturePartIds.usbCable,
      fromPartId: fixturePartIds.battery,
      fromAnchor: "power",
      toPartId: fixturePartIds.esp32,
      toAnchor: "power",
    },
  ],
  assemblySequence: [
    { id: "place-enclosure", order: 1, kind: "place_part", partId: fixturePartIds.enclosure },
    { id: "place-breadboard", order: 2, kind: "place_part", partId: fixturePartIds.breadboard },
    { id: "place-esp32", order: 3, kind: "place_part", partId: fixturePartIds.esp32 },
    { id: "place-bme280", order: 4, kind: "place_part", partId: fixturePartIds.bme280 },
    { id: "place-battery", order: 5, kind: "place_part", partId: fixturePartIds.battery },
    { id: "place-bracket", order: 6, kind: "place_part", partId: fixturePartIds.bracket },
    { id: "place-fastener", order: 7, kind: "place_part", partId: fixturePartIds.fastener },
    { id: "place-grommet", order: 8, kind: "place_part", partId: fixturePartIds.grommet },
    { id: "connect-jumper", order: 9, kind: "connect_flexible", connectionId: "jumper-i2c" },
    { id: "connect-usb", order: 10, kind: "connect_flexible", connectionId: "usb-power" },
  ],
};

export const weatherStationSchematicRequest: SchematicLayoutRequest = {
  graph: weatherStationSchematicGraph,
  cadAssets: weatherStationCadAssets,
  requiredDimensionConfidence: MINIMUM_SCHEMATIC_DIMENSION_CONFIDENCE,
};

export type ReadySchematicScene = {
  outcome: "ready";
  layout: SchematicLayoutReadyResult;
  parts: MechViewPart[];
  routes: MechViewRoute[];
  message: string;
};

export type UnavailableSchematicScene = {
  outcome: "quarantined" | "rejected";
  layout: Exclude<SchematicLayoutResult, SchematicLayoutReadyResult>;
  parts: [];
  routes: [];
  message: string;
};

export type SchematicScene = ReadySchematicScene | UnavailableSchematicScene;

function unavailableMessage(layout: Exclude<SchematicLayoutResult, SchematicLayoutReadyResult>): string {
  if (layout.outcome === "quarantined") {
    const count = layout.quarantinedParts.length;
    return `This schematic is waiting for verified dimensions for ${count} part${count === 1 ? "" : "s"}.`;
  }
  return `This schematic could not be validated: ${layout.rejection.message}`;
}

/** Turns solver output into browser data. The adapter cannot invent a drawable part for a non-ready layout. */
export function createSchematicScene(request: SchematicLayoutRequest = weatherStationSchematicRequest): SchematicScene {
  const layout = solveSchematicLayout(request);
  if (layout.outcome !== "ready") {
    return { outcome: layout.outcome, layout, parts: [], routes: [], message: unavailableMessage(layout) };
  }

  const assetByPartId = new Map(request.cadAssets.map((asset) => [asset.partId, asset]));
  const nodeByPartId = new Map(request.graph.nodes.map((node) => [node.partId, node]));
  const connectionById = new Map(request.graph.connections.map((connection) => [connection.id, connection]));
  const parts = layout.placements.map((placement) => {
    const presentation = fixturePartPresentation.get(placement.partId) ?? {
      name: "Verified schematic component",
      purpose: "A source-backed component proxy positioned by the deterministic schematic solver.",
      color: "#64748b",
    };
    const asset = assetByPartId.get(placement.partId);
    if (!asset) {
      throw new Error(`Ready schematic placement ${placement.partId} has no approved fixture presentation.`);
    }
    return {
      id: placement.partId,
      ...presentation,
      dimensionsMm: placement.boundsMm,
      positionMm: placement.gridPosition,
      cadAssetUrl: asset.filePath,
      isContainer: nodeByPartId.get(placement.partId)?.role === "container",
    } satisfies MechViewPart;
  });
  const routes = layout.routes.map((route, index) => {
    const connection = connectionById.get(route.connectionId);
    if (!connection) {
      throw new Error(`Ready schematic route ${route.connectionId} has no source connection.`);
    }
    return {
      id: route.connectionId,
      pointsMm: route.points,
      fromPartId: connection.fromPartId,
      toPartId: connection.toPartId,
      color: index % 2 === 0 ? "#f59e0b" : "#f43f5e",
    } satisfies MechViewRoute;
  });

  return {
    outcome: "ready",
    layout,
    parts,
    routes,
    message: `Showing ${parts.length} source-backed bounding-box proxies and ${routes.length} checked flexible route${routes.length === 1 ? "" : "s"}.`,
  };
}

export function assertReadySchematicScene(scene: SchematicScene): asserts scene is ReadySchematicScene {
  if (scene.outcome !== "ready") throw new Error(scene.message);
}
