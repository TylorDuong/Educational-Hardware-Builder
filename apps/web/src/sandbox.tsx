import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { weatherStationCadAssets } from "../../../packages/schemas/fixtures/weather-station-parts.js";
import { MechView, type MechViewPart } from "./components/MechView.js";

import "./sandbox.css";

const fixtureParts: MechViewPart[] = weatherStationCadAssets.map((asset, index) => ({
  id: asset.id,
  cadAssetUrl: asset.filePath,
  color: index % 2 ? "#22c55e" : "#38bdf8",
  transform: {
    partId: asset.partId,
    stepId: "cc67871f-8a8b-4662-a547-a1d0652cf79f",
    positionMm: [(index % 5) * 28, Math.floor(index / 5) * 32, index === 1 ? 8 : 0],
    quaternion: [0, 0, 0, 1],
    parentFrame: "weather-station-root",
    coordinateConvention: "z-up-parent-relative",
  },
}));

function Sandbox() {
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = fixtureParts[activeIndex]!;
  const cameraTarget = useMemo(() => active.transform.positionMm, [active]);
  return <main><header><h1>MechView sandbox</h1><p>10-part weather-station fixture assembly. Orbit, pan, zoom, step focus, highlight, and explode controls are local-only.</p></header><section className="viewer"><MechView parts={fixtureParts} highlightIds={[active.id]} explodeFactor={explodeFactor} cameraTarget={cameraTarget} /></section><section className="controls"><label>Explode <input aria-label="Explode assembly" type="range" min="0" max="1" step="0.05" value={explodeFactor} onChange={(event) => setExplodeFactor(Number(event.target.value))} /></label><label>Step <select aria-label="Active assembly step" value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>{fixtureParts.map((part, index) => <option key={part.id} value={index}>{index + 1}. {part.cadAssetUrl.split("/").at(-1)}</option>)}</select></label><output>Highlight: {active.cadAssetUrl}</output></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Sandbox /></StrictMode>);
