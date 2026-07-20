import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { AssemblyTransform } from "../../../../packages/schemas/src/index.js";

export type MechViewPart = {
  id: string;
  name: string;
  purpose: string;
  displaySize: [number, number, number];
  cadAssetUrl: string;
  transform: AssemblyTransform;
  color?: string;
};

export type MechViewProps = {
  parts: MechViewPart[];
  highlightIds: string[];
  explodeFactor: number;
  cameraTarget: [number, number, number];
  onSelect: (partId: string) => void;
};

function FixturePart({ part, highlighted, explodeFactor, layoutIndex, onSelect }: { part: MechViewPart; highlighted: boolean; explodeFactor: number; layoutIndex: number; onSelect: (partId: string) => void }) {
  const [x, y, z] = part.transform.positionMm;
  const [qx, qy, qz, qw] = part.transform.quaternion;
  const column = layoutIndex % 3;
  const row = Math.floor(layoutIndex / 3);
  const presentationX = (column - 1) * 1.45;
  const presentationY = (1 - row) * 1.05;
  const separation = 1 + explodeFactor * 0.6;
  return (
    <mesh position={[x / 25 + presentationX * separation, y / 25 + presentationY * separation, z / 25 + (layoutIndex % 2) * 0.12]} quaternion={[qx, qy, qz, qw]} castShadow onClick={() => onSelect(part.id)}>
      <boxGeometry args={part.displaySize} />
      <meshStandardMaterial color={highlighted ? "#f59e0b" : part.color ?? "#38bdf8"} emissive={highlighted ? "#7c2d12" : "#000000"} />
    </mesh>
  );
}

/** Standalone fixture viewer; solver-owned transforms remain intact while a deterministic presentation grid keeps every part visible. */
export function MechView({ parts, highlightIds, explodeFactor, cameraTarget, onSelect }: MechViewProps) {
  const target = cameraTarget.map((coordinate) => coordinate / 25) as [number, number, number];
  return (
    <Canvas camera={{ position: [4, 3, 5], fov: 45 }} shadows>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
      {parts.map((part, index) => <FixturePart key={part.id} part={part} highlighted={highlightIds.includes(part.id)} explodeFactor={explodeFactor} layoutIndex={index} onSelect={onSelect} />)}
      <OrbitControls enablePan enableRotate enableZoom target={target} />
    </Canvas>
  );
}
