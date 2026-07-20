import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

/** The view is scaled once as a scene; all part data stays in solver-owned millimetres. */
const SCENE_MM_SCALE = 1 / 25;

export type MillimetrePoint = [number, number, number];

export type MechViewPart = {
  id: string;
  name: string;
  purpose: string;
  /** Source-backed outer bounds, rendered as an honest proxy until real CAD meshes are available. */
  dimensionsMm: MillimetrePoint;
  /** Lower, left, back world corner produced by the deterministic layout solver. */
  positionMm: MillimetrePoint;
  cadAssetUrl?: string;
  color?: string;
  /** Containers remain visible as transparent proxy envelopes so their children can be inspected. */
  isContainer?: boolean;
};

export type MechViewRoute = {
  id: string;
  pointsMm: MillimetrePoint[];
  color?: string;
};

export type MechViewProps = {
  parts: MechViewPart[];
  routes?: MechViewRoute[];
  highlightIds: string[];
  /** The selected or hovered solver part becomes the stationary focus of the exploded view. */
  focusPartId?: string;
  explodeFactor: number;
  cameraTarget: MillimetrePoint;
  /** Remounts the view with its initial camera position and model-centred target. */
  resetViewKey?: number;
  onSelect: (partId: string) => void;
  onHover?: (partId: string | undefined) => void;
};

/** Solver coordinates are X/Y/Z (Z-up); Three.js uses X/Y/Z with Y-up. */
export function solverPointToThreePoint([x, y, z]: MillimetrePoint): MillimetrePoint {
  return [x, z, y];
}

/** Solver bounds are width/depth/height; Three box geometry expects width/height/depth. */
export function solverBoundsToThreeDimensions([width, depth, height]: MillimetrePoint): MillimetrePoint {
  return [width, height, depth];
}

export function partCenterMm(part: Pick<MechViewPart, "positionMm" | "dimensionsMm">): MillimetrePoint {
  return [
    part.positionMm[0] + part.dimensionsMm[0] / 2,
    part.positionMm[1] + part.dimensionsMm[1] / 2,
    part.positionMm[2] + part.dimensionsMm[2] / 2,
  ];
}

/** Keeps the focused part stationary while spreading every other part away from its centre. */
export function explodeFromFocus(center: MillimetrePoint, focusCenter: MillimetrePoint, factor: number): MillimetrePoint {
  return [
    center[0] + (center[0] - focusCenter[0]) * factor,
    center[1] + (center[1] - focusCenter[1]) * factor,
    center[2] + (center[2] - focusCenter[2]) * factor,
  ];
}

function sceneCentroid(parts: readonly MechViewPart[]): MillimetrePoint {
  if (parts.length === 0) return [0, 0, 0];
  const total = parts.reduce<MillimetrePoint>((sum, part) => {
    const center = partCenterMm(part);
    return [sum[0] + center[0], sum[1] + center[1], sum[2] + center[2]];
  }, [0, 0, 0]);
  return [total[0] / parts.length, total[1] / parts.length, total[2] / parts.length];
}

function FixturePart({
  part,
  highlighted,
  dimmed,
  explodeFactor,
  focusCenter,
  onSelect,
  onHover,
}: {
  part: MechViewPart;
  highlighted: boolean;
  dimmed: boolean;
  explodeFactor: number;
  focusCenter: MillimetrePoint;
  onSelect: (partId: string) => void;
  onHover?: (partId: string | undefined) => void;
}) {
  const center = partCenterMm(part);
  const transparentContainer = part.isContainer === true && !highlighted;
  const transparent = dimmed || transparentContainer;
  const explodedCenter = explodeFromFocus(center, focusCenter, explodeFactor);
  return (
    <mesh
      position={solverPointToThreePoint(explodedCenter)}
      castShadow
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover?.(part.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover?.(undefined);
      }}
    >
      <boxGeometry args={solverBoundsToThreeDimensions(part.dimensionsMm)} />
      <meshStandardMaterial
        color={highlighted ? "#e65f54" : part.color ?? "#0172e4"}
        emissive={highlighted ? "#54231f" : "#000000"}
        transparent={transparent}
        opacity={dimmed ? 0.16 : transparentContainer ? 0.14 : 1}
        depthWrite={!transparent}
        wireframe={transparentContainer}
      />
    </mesh>
  );
}

function SchematicRoute({ route }: { route: MechViewRoute }) {
  if (route.pointsMm.length < 2) return null;
  return <Line points={route.pointsMm.map(solverPointToThreePoint)} color={route.color ?? "#f59e0b"} lineWidth={1.5} />;
}

/** Renders deterministic world-space proxies; no part receives a presentation-only grid offset. */
export function MechView({
  parts,
  routes = [],
  highlightIds,
  focusPartId,
  explodeFactor,
  cameraTarget,
  resetViewKey = 0,
  onSelect,
  onHover,
}: MechViewProps) {
  const centroid = sceneCentroid(parts);
  const focusedPart = parts.find((part) => part.id === focusPartId);
  const focusCenter = focusedPart ? partCenterMm(focusedPart) : centroid;
  const highlightedPartIds = new Set(highlightIds);
  const target = solverPointToThreePoint(cameraTarget).map((coordinate) => coordinate * SCENE_MM_SCALE) as MillimetrePoint;
  return (
    <Canvas key={resetViewKey} camera={{ position: [4, 3, 5], fov: 45 }} shadows>
      <color attach="background" args={["#fffdf5"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <group scale={SCENE_MM_SCALE}>
        {parts.map((part) => (
          <FixturePart
            key={part.id}
            part={part}
            highlighted={highlightedPartIds.has(part.id)}
            dimmed={focusPartId !== undefined && part.id !== focusPartId}
            explodeFactor={explodeFactor}
            focusCenter={focusCenter}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
        {focusPartId === undefined ? routes.map((route) => <SchematicRoute key={route.id} route={route} />) : null}
      </group>
      <OrbitControls enablePan enableRotate enableZoom target={target} />
    </Canvas>
  );
}
