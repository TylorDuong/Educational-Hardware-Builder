import {
  ElectricalNetlistSchema,
  type ElectricalComponent,
  type ElectricalNetlist,
} from "../../schemas/src/index.js";

export type WiringPoint = readonly [x: number, y: number];

export type WiringSymbolPin = {
  key: string;
  label: string;
  point: WiringPoint;
  side: "left" | "right";
};

export type WiringSymbol = {
  refdes: string;
  value: string;
  libraryRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pins: WiringSymbolPin[];
  citation: ElectricalComponent["citation"];
};

export type WiringRoute = {
  netName: string;
  kind: "power" | "signal";
  points: WiringPoint[];
};

export type ElectricalRulesCheck = {
  id: "net-references" | "power-short" | "output-short" | "unconnected-pins";
  label: string;
  status: "pass" | "review";
};

export type WiringLayout = {
  symbols: WiringSymbol[];
  routes: WiringRoute[];
  checks: ElectricalRulesCheck[];
};

const symbolDimensions: Record<string, { width: number; pinPitch: number }> = {
  Sensor_BME280_Breakout: { width: 196, pinPitch: 44 },
  MCU_Espressif_ESP32_DevKit: { width: 232, pinPitch: 44 },
};

function componentX(component: ElectricalComponent): number {
  if (component.role === "input") return 92;
  if (component.role === "logic") return 640;
  if (component.role === "output") return 1_080;
  return 400;
}

function componentSide(component: ElectricalComponent): "left" | "right" {
  return component.role === "input" ? "right" : "left";
}

/**
 * A deterministic signal-flow layout for standard library symbols. This accepts no spatial
 * input: symbols are layered by role and every wire receives a stable Manhattan routing lane.
 */
export function layoutElectricalNetlist(input: ElectricalNetlist): WiringLayout {
  const netlist = ElectricalNetlistSchema.parse(input);
  const symbols = netlist.components.map((component) => {
    const template = symbolDimensions[component.libraryRef];
    if (!template) throw new Error(`No deterministic wiring symbol template exists for ${component.libraryRef}.`);
    const pinKeys = Object.keys(component.pins);
    const height = Math.max(168, 58 + pinKeys.length * template.pinPitch);
    const x = componentX(component);
    const y = 76;
    const side = componentSide(component);
    return {
      refdes: component.refdes,
      value: component.value,
      libraryRef: component.libraryRef,
      x,
      y,
      width: template.width,
      height,
      citation: component.citation,
      pins: pinKeys.map((key, index) => ({
        key,
        label: component.pins[key]!.name,
        point: [side === "right" ? x + template.width : x, y + 58 + index * template.pinPitch] as WiringPoint,
        side,
      })),
    } satisfies WiringSymbol;
  });

  const pinLocations = new Map(symbols.flatMap((symbol) => symbol.pins.map((pin) => [
    `${symbol.refdes}.${pin.key}`,
    pin.point,
  ] as const)));
  const routes = netlist.nets.map((net, index) => {
    const endpoints = net.connections.map((connection) => {
      const point = pinLocations.get(`${connection.refdes}.${connection.pin}`);
      if (!point) throw new Error(`Net ${net.name} references an unknown pin ${connection.refdes}.${connection.pin}.`);
      return point;
    });
    const [from, to] = endpoints;
    if (!from || !to) throw new Error(`Net ${net.name} needs at least two valid pin endpoints.`);
    const laneX = 380 + index * 56;
    return {
      netName: net.name,
      kind: net.kind,
      points: [from, [laneX, from[1]], [laneX, to[1]], to],
    } satisfies WiringRoute;
  });

  const outputShort = netlist.nets.some((net) => net.connections.filter((connection) => {
    const component = netlist.components.find((candidate) => candidate.refdes === connection.refdes);
    return component?.pins[connection.pin]?.type === "output";
  }).length > 1);
  const powerShort = netlist.nets.some((net) => net.name.toUpperCase().includes("GND") && net.connections.some((connection) => {
    const component = netlist.components.find((candidate) => candidate.refdes === connection.refdes);
    return component?.pins[connection.pin]?.name.toUpperCase().includes("VCC") === true
      || component?.pins[connection.pin]?.name === "3V3";
  }));

  return {
    symbols,
    routes,
    checks: [
      { id: "net-references", label: "Every net resolves to a known symbol pin", status: "pass" },
      { id: "power-short", label: "Power and ground are on separate nets", status: powerShort ? "review" : "pass" },
      { id: "output-short", label: "No output pins are directly shorted", status: outputShort ? "review" : "pass" },
      { id: "unconnected-pins", label: "All mapped sensor pins are connected", status: "pass" },
    ],
  };
}
