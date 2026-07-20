import { layoutElectricalNetlist, type WiringLayout } from "@educational-hardware-builder/solver";
import type { ElectricalNetlist } from "@educational-hardware-builder/schemas";
import { useMemo, useState } from "react";

const netColors: Record<string, string> = {
  "3V3": "#e65f54",
  GND: "#1b2838",
  I2C_SDA: "#0172e4",
  I2C_SCL: "#26775b",
};

function netColor(netName: string): string {
  return netColors[netName] ?? "#6d4cc7";
}

function WiringCanvas({ layout, selectedNet }: { layout: WiringLayout; selectedNet?: string }) {
  return (
    <svg
      className="wiring-canvas"
      viewBox="0 0 980 410"
      role="img"
      aria-label="Orthogonal wiring diagram for the weather station sensor harness"
    >
      <title>Weather station sensor harness</title>
      <desc>Four checked connections join the BME280 sensor breakout to the ESP32 DevKit.</desc>
      <g className="wiring-routes">
        {layout.routes.map((route) => {
          const active = !selectedNet || selectedNet === route.netName;
          return (
            <g key={route.netName} className={active ? "wiring-route active" : "wiring-route muted"}>
              <polyline
                points={route.points.map((point) => point.join(",")).join(" ")}
                stroke={netColor(route.netName)}
              />
              <text x={route.points[1]![0] + 9} y={route.points[1]![1] - 8} fill={netColor(route.netName)}>
                {route.netName.replace("I2C_", "")}
              </text>
            </g>
          );
        })}
      </g>
      {layout.symbols.map((symbol) => (
        <g key={symbol.refdes} className="wiring-symbol">
          <rect x={symbol.x} y={symbol.y} width={symbol.width} height={symbol.height} rx="7" />
          <text className="symbol-refdes" x={symbol.x + 18} y={symbol.y + 28}>{symbol.refdes}</text>
          <text className="symbol-value" x={symbol.x + 18} y={symbol.y + 52}>{symbol.value}</text>
          {symbol.pins.map((pin) => {
            const direction = pin.side === "left" ? -1 : 1;
            return (
              <g key={pin.key} className="wiring-pin">
                <line x1={pin.point[0]} y1={pin.point[1]} x2={pin.point[0] + direction * 22} y2={pin.point[1]} />
                <circle cx={pin.point[0]} cy={pin.point[1]} r="4" />
                <text
                  x={pin.point[0] + direction * 30}
                  y={pin.point[1] + 4}
                  textAnchor={pin.side === "left" ? "end" : "start"}
                >
                  {pin.label}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

export function WiringDiagram({
  netlist,
  initialNet,
}: {
  netlist: ElectricalNetlist;
  /** Lets a Workshop step open the diagram with its required connection already selected. */
  initialNet?: string;
}) {
  const layout = useMemo(() => layoutElectricalNetlist(netlist), [netlist]);
  const [selectedNet, setSelectedNet] = useState<string | undefined>(initialNet);
  const componentsByRefdes = useMemo(() => new Map(netlist.components.map((component) => [component.refdes, component])), [netlist]);

  return (
    <section className="wiring-diagram" aria-label="Wiring schematic">
      <div className="wiring-canvas-frame">
        <WiringCanvas layout={layout} selectedNet={selectedNet} />
      </div>
      <aside className="wiring-sidebar">
        <section>
          <p className="eyebrow">CONNECTIONS</p>
          <div className="net-picker" role="list" aria-label="Wiring nets">
            {netlist.nets.map((net) => (
              <button
                key={net.name}
                type="button"
                className={selectedNet === net.name ? "net-picker-button active" : "net-picker-button"}
                aria-pressed={selectedNet === net.name}
                onClick={() => setSelectedNet((current) => current === net.name ? undefined : net.name)}
              >
                <span className="net-swatch" style={{ backgroundColor: netColor(net.name) }} aria-hidden="true" />
                <strong>{net.name.replace("I2C_", "I²C ")}</strong>
                <small>{net.connections.map((connection) => {
                  const component = componentsByRefdes.get(connection.refdes);
                  const pin = component?.pins[connection.pin];
                  return `${connection.refdes}.${pin?.name ?? connection.pin}`;
                }).join(" → ")}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="wiring-checks" aria-label="Electrical checks">
          <p className="eyebrow">CHECKS</p>
          <ul>
            {layout.checks.map((check) => (
              <li key={check.id} className={check.status}>
                <span aria-hidden="true">{check.status === "pass" ? "✓" : "!"}</span>
                {check.label}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </section>
  );
}
