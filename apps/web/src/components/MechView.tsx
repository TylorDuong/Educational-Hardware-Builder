import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { AssemblyTransform } from "../../../../packages/schemas/src/index.js";

export type MechViewPart = { id: string; cadAssetUrl: string; transform: AssemblyTransform; color?: string };

export type MechViewProps = {
  parts: MechViewPart[];
  highlightIds: string[];
  explodeFactor: number;
  cameraTarget: [number, number, number];
};

function FixturePart({ part, highlighted, explodeFactor }: { part: MechViewPart; highlighted: boolean; explodeFactor: number }) {
  const [x, y, z] = part.transform.positionMm;
  const [qx, qy, qz, qw] = part.transform.quaternion;
  return (
    <mesh position={[x / 25 + explodeFactor * 0.18, y / 25, z / 25]} quaternion={[qx, qy, qz, qw]} castShadow>
      <boxGeometry args={[0.8, 0.32, 0.12]} />
      <meshStandardMaterial color={highlighted ? "#f59e0b" : part.color ?? "#38bdf8"} emissive={highlighted ? "#7c2d12" : "#000000"} />
    </mesh>
  );
}

/** Standalone fixture viewer; production loaders replace these deterministic boxes with the same typed CAD assets. */
export function MechView({ parts, highlightIds, explodeFactor, cameraTarget }: MechViewProps) {
  return (
    <Canvas camera={{ position: [4, 3, 5], fov: 45 }} shadows>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
      <group position={[-cameraTarget[0] / 25, -cameraTarget[1] / 25, -cameraTarget[2] / 25]}>
        {parts.map((part) => <FixturePart key={part.id} part={part} highlighted={highlightIds.includes(part.id)} explodeFactor={explodeFactor} />)}
      </group>
      <OrbitControls enablePan enableRotate enableZoom target={[0, 0, 0]} />
    </Canvas>
  );
}
