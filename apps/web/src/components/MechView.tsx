import { useFrame, Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";

/** The view is scaled once as a scene; all part data stays in solver-owned millimetres. */
const SCENE_MM_SCALE = 1 / 25;
/** At 60 fps this reaches 99% of the requested disassembly distance in roughly half a second. */
export const DISASSEMBLY_TRANSITION_SECONDS = 0.5;
export const MAX_DISASSEMBLY_FACTOR = 0.8;
/** Only nearby parts separate during inspection; distant context stays in its assembled location. */
export const LOCAL_DISASSEMBLY_RADIUS_MM = 56;
/** Routes stay visible while inspection moves their endpoints. */
export const DISASSEMBLED_ROUTE_OPACITY = 0.58;
/** Non-focused parts remain visible as 20% transparent context while a part is selected. */
export const UNFOCUSED_PART_OPACITY = 0.8;
const HOVER_PROXIMITY_RADIUS_NDC = 0.5;
type RaycastableMesh = {
  constructor: {
    prototype: {
      raycast: (raycaster: unknown, intersections: unknown[]) => void;
    };
  };
};
const disabledRaycast = () => undefined;

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
  /** Route endpoints are retained so the visual wire can follow inspected parts. */
  fromPartId?: string;
  toPartId?: string;
};

export type MechViewProps = {
  parts: MechViewPart[];
  routes?: MechViewRoute[];
  highlightIds: string[];
  /** Only a clicked part is selected; hover remains a transient preview. */
  selectedPartId?: string;
  /** The closest selectable part near the pointer, used for hover-preview copy and route emphasis. */
  hoveredPartId?: string;
  /** Enables exponentially scaled proximity preview; selection still requires a click. */
  disassembleOnHover?: boolean;
  /** When false, enclosure meshes are removed from hit testing so their contents are easier to inspect. */
  selectEnclosures?: boolean;
  cameraTarget: MillimetrePoint;
  /** Remounts the view with its initial camera position and model-centred target. */
  resetViewKey?: number;
  /** Passing no part clears the current inspection and reassembles the view. */
  onSelect: (partId?: string) => void;
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

/** Containers remain spatial context. Selecting one still highlights it, but never separates the model. */
export function canDisassembleFromFocus(part: Pick<MechViewPart, "isContainer"> | undefined): boolean {
  return part?.isContainer !== true && part !== undefined;
}

/**
 * Tapers an exploded view inside a small world-space neighbourhood. This avoids
 * pulling unrelated parts across the whole build while preserving a smooth edge.
 */
export function localDisassemblyFactor(
  center: MillimetrePoint,
  focusCenter: MillimetrePoint,
  factor: number,
  radiusMm: number = LOCAL_DISASSEMBLY_RADIUS_MM,
): number {
  if (factor <= 0 || radiusMm <= 0) return 0;
  const distance = Math.hypot(
    center[0] - focusCenter[0],
    center[1] - focusCenter[1],
    center[2] - focusCenter[2],
  );
  if (distance >= radiusMm) return 0;
  const normalizedDistance = distance / radiusMm;
  return factor * (1 - normalizedDistance ** 2);
}

/** Blends the route's endpoint translations through its existing solver-owned path. */
export function reconnectRoutePoints(
  points: readonly MillimetrePoint[],
  fromOffset: MillimetrePoint,
  toOffset: MillimetrePoint,
): MillimetrePoint[] {
  const lastIndex = Math.max(points.length - 1, 1);
  return points.map((point, index) => {
    const progress = index / lastIndex;
    return [
      point[0] + fromOffset[0] * (1 - progress) + toOffset[0] * progress,
      point[1] + fromOffset[1] * (1 - progress) + toOffset[1] * progress,
      point[2] + fromOffset[2] * (1 - progress) + toOffset[2] * progress,
    ];
  });
}

export function isPartSelectable(part: Pick<MechViewPart, "isContainer">, selectEnclosures: boolean): boolean {
  return selectEnclosures || part.isContainer !== true;
}

/**
 * Keep a concrete raycast function in both toggle states. Replacing a disabled
 * raycast with `undefined` can leave an instance without its inherited Mesh
 * raycast method after the enclosure toggle changes.
 */
function enabledRaycast(this: RaycastableMesh, raycaster: unknown, intersections: unknown[]): void {
  this.constructor.prototype.raycast.call(this, raycaster, intersections);
}

export function raycastForSelection(selectable: boolean) {
  return selectable ? enabledRaycast : disabledRaycast;
}

export function exponentialDisassemblyFactor(pointerDistanceNdc: number): number {
  const proximity = Math.max(0, Math.min(1, 1 - pointerDistanceNdc / HOVER_PROXIMITY_RADIUS_NDC));
  return MAX_DISASSEMBLY_FACTOR * proximity ** 2;
}

/** Distance-independent easing keeps a large enclosure and a small board equally responsive. */
export function disassemblyTransitionRatio(deltaSeconds: number): number {
  if (deltaSeconds <= 0) return 0;
  return 1 - 0.01 ** (deltaSeconds / DISASSEMBLY_TRANSITION_SECONDS);
}

function sceneCentroid(parts: readonly MechViewPart[]): MillimetrePoint {
  if (parts.length === 0) return [0, 0, 0];
  const total = parts.reduce<MillimetrePoint>((sum, part) => {
    const center = partCenterMm(part);
    return [sum[0] + center[0], sum[1] + center[1], sum[2] + center[2]];
  }, [0, 0, 0]);
  return [total[0] / parts.length, total[1] / parts.length, total[2] / parts.length];
}

type CameraMatrices = {
  matrixWorldInverse: { elements: ArrayLike<number> };
  projectionMatrix: { elements: ArrayLike<number> };
};

/** Projects a solver-space point without taking a runtime dependency on Three.js math types. */
function projectSolverPointToNdc(point: MillimetrePoint, camera: CameraMatrices): { x: number; y: number; visible: boolean } {
  const [solverX, solverY, solverZ] = solverPointToThreePoint(point);
  const x = solverX * SCENE_MM_SCALE;
  const y = solverY * SCENE_MM_SCALE;
  const z = solverZ * SCENE_MM_SCALE;
  const view = camera.matrixWorldInverse.elements;
  const projection = camera.projectionMatrix.elements;
  const viewX = view[0]! * x + view[4]! * y + view[8]! * z + view[12]!;
  const viewY = view[1]! * x + view[5]! * y + view[9]! * z + view[13]!;
  const viewZ = view[2]! * x + view[6]! * y + view[10]! * z + view[14]!;
  const viewW = view[3]! * x + view[7]! * y + view[11]! * z + view[15]!;
  const clipX = projection[0]! * viewX + projection[4]! * viewY + projection[8]! * viewZ + projection[12]! * viewW;
  const clipY = projection[1]! * viewX + projection[5]! * viewY + projection[9]! * viewZ + projection[13]! * viewW;
  const clipW = projection[3]! * viewX + projection[7]! * viewY + projection[11]! * viewZ + projection[15]! * viewW;
  if (clipW <= 0) return { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, visible: false };
  return { x: clipX / clipW, y: clipY / clipW, visible: true };
}

type HoverPreview = { partId?: string; factor: number };
type VisualPartPositions = { current: Map<string, MillimetrePoint> };

function FixturePart({
  part,
  highlighted,
  dimmed,
  selectedFocusCenter,
  sceneCenter,
  partsById,
  hoverPreviewRef,
  visualPartPositionsRef,
  selectable,
  onSelect,
}: {
  part: MechViewPart;
  highlighted: boolean;
  dimmed: boolean;
  selectedFocusCenter?: MillimetrePoint;
  sceneCenter: MillimetrePoint;
  partsById: ReadonlyMap<string, MechViewPart>;
  hoverPreviewRef: { current: HoverPreview };
  visualPartPositionsRef: VisualPartPositions;
  selectable: boolean;
  onSelect: (partId: string) => void;
}) {
  const meshRef = useRef<{ position: { x: number; y: number; z: number } } | null>(null);
  const center = partCenterMm(part);
  const transparentContainer = part.isContainer === true && !highlighted;
  const containerSelectionReady = part.isContainer === true && selectable;
  const transparent = dimmed || transparentContainer;
  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const hoverPreview = hoverPreviewRef.current;
    const hoverPart = hoverPreview.partId ? partsById.get(hoverPreview.partId) : undefined;
    const hoverFocusCenter = hoverPart && canDisassembleFromFocus(hoverPart) ? partCenterMm(hoverPart) : undefined;
    const focusCenter = selectedFocusCenter ?? hoverFocusCenter;
    const explodeFactor = selectedFocusCenter
      ? MAX_DISASSEMBLY_FACTOR
      : hoverFocusCenter ? hoverPreview.factor : 0;
    const localFactor = focusCenter
      ? localDisassemblyFactor(center, focusCenter, explodeFactor)
      : 0;
    const targetPosition = solverPointToThreePoint(explodeFromFocus(center, focusCenter ?? sceneCenter, localFactor));
    const deltaX = targetPosition[0] - mesh.position.x;
    const deltaY = targetPosition[1] - mesh.position.y;
    const deltaZ = targetPosition[2] - mesh.position.z;
    const distance = Math.hypot(deltaX, deltaY, deltaZ);
    if (distance > 0.0001) {
      const ratio = disassemblyTransitionRatio(delta);
      mesh.position.x += deltaX * ratio;
      mesh.position.y += deltaY * ratio;
      mesh.position.z += deltaZ * ratio;
    }
    visualPartPositionsRef.current.set(part.id, [mesh.position.x, mesh.position.y, mesh.position.z]);
  });
  return (
    <mesh
      ref={meshRef}
      position={solverPointToThreePoint(center)}
      castShadow
      raycast={raycastForSelection(selectable)}
      onClick={selectable ? (event) => {
        event.stopPropagation();
        onSelect(part.id);
      } : undefined}
    >
      <boxGeometry args={solverBoundsToThreeDimensions(part.dimensionsMm)} />
      <meshStandardMaterial
        color={highlighted ? "#e65f54" : part.color ?? "#0172e4"}
        emissive={highlighted ? "#54231f" : "#000000"}
        transparent={transparent}
        opacity={dimmed ? UNFOCUSED_PART_OPACITY : transparentContainer ? containerSelectionReady ? 0.28 : 0.14 : 1}
        depthWrite={!transparent}
        wireframe={transparentContainer}
      />
    </mesh>
  );
}

type RenderedRouteLine = {
  geometry: { setPositions: (positions: number[]) => void };
  computeLineDistances: () => void;
};

function visualOffsetForPart(
  partId: string | undefined,
  partsById: ReadonlyMap<string, MechViewPart>,
  visualPartPositionsRef: VisualPartPositions,
): MillimetrePoint {
  const part = partId ? partsById.get(partId) : undefined;
  const visualPosition = partId ? visualPartPositionsRef.current.get(partId) : undefined;
  if (!part || !visualPosition) return [0, 0, 0];
  const initialPosition = solverPointToThreePoint(partCenterMm(part));
  return [
    visualPosition[0] - initialPosition[0],
    visualPosition[1] - initialPosition[1],
    visualPosition[2] - initialPosition[2],
  ];
}

function SchematicRoute({
  route,
  partsById,
  visualPartPositionsRef,
  disassembled,
}: {
  route: MechViewRoute;
  partsById: ReadonlyMap<string, MechViewPart>;
  visualPartPositionsRef: VisualPartPositions;
  disassembled: boolean;
}) {
  const lineRef = useRef<RenderedRouteLine | null>(null);
  const basePoints = useMemo(() => route.pointsMm.map(solverPointToThreePoint), [route.pointsMm]);
  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const points = reconnectRoutePoints(
      basePoints,
      visualOffsetForPart(route.fromPartId, partsById, visualPartPositionsRef),
      visualOffsetForPart(route.toPartId, partsById, visualPartPositionsRef),
    );
    line.geometry.setPositions(points.flat());
    line.computeLineDistances();
  });
  if (route.pointsMm.length < 2) return null;
  return (
    <Line
      ref={(line: unknown) => { lineRef.current = line as RenderedRouteLine | null; }}
      points={basePoints}
      color={route.color ?? "#f59e0b"}
      lineWidth={1.5}
      transparent
      opacity={disassembled ? DISASSEMBLED_ROUTE_OPACITY : 0.86}
      depthWrite={false}
    />
  );
}

function HoverPreviewTracker({
  parts,
  selectedPartId,
  disassembleOnHover,
  selectEnclosures,
  pointerInsideRef,
  hoverPreviewRef,
  lastPreviewPartIdRef,
  onHover,
}: {
  parts: readonly MechViewPart[];
  selectedPartId?: string;
  disassembleOnHover: boolean;
  selectEnclosures: boolean;
  pointerInsideRef: { current: boolean };
  hoverPreviewRef: { current: HoverPreview };
  lastPreviewPartIdRef: { current: string | undefined };
  onHover?: (partId: string | undefined) => void;
}) {
  useFrame((state) => {
    if (selectedPartId !== undefined || !disassembleOnHover || !pointerInsideRef.current) {
      hoverPreviewRef.current = { factor: 0 };
      if (lastPreviewPartIdRef.current !== undefined) {
        lastPreviewPartIdRef.current = undefined;
        onHover?.(undefined);
      }
      return;
    }

    let closestPartId: string | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const part of parts) {
      if (!isPartSelectable(part, selectEnclosures) || !canDisassembleFromFocus(part)) continue;
      const projected = projectSolverPointToNdc(partCenterMm(part), state.camera as CameraMatrices);
      if (!projected.visible) continue;
      const distance = Math.hypot(projected.x - state.pointer.x, projected.y - state.pointer.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPartId = part.id;
      }
    }

    const factor = exponentialDisassemblyFactor(closestDistance);
    const previewPartId = factor > 0 ? closestPartId : undefined;
    hoverPreviewRef.current = { partId: previewPartId, factor };
    if (previewPartId !== lastPreviewPartIdRef.current) {
      lastPreviewPartIdRef.current = previewPartId;
      onHover?.(previewPartId);
    }
  });
  return null;
}

/** Renders deterministic world-space proxies; no part receives a presentation-only grid offset. */
export function MechView({
  parts,
  routes = [],
  highlightIds,
  selectedPartId,
  hoveredPartId,
  disassembleOnHover = false,
  selectEnclosures = false,
  cameraTarget,
  resetViewKey = 0,
  onSelect,
  onHover,
}: MechViewProps) {
  const centroid = sceneCentroid(parts);
  const selectedPart = parts.find((part) => part.id === selectedPartId);
  const selectedFocusCenter = selectedPart && canDisassembleFromFocus(selectedPart) ? partCenterMm(selectedPart) : undefined;
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const hoverPreviewRef = useRef<HoverPreview>({ factor: 0 });
  const visualPartPositionsRef = useRef<Map<string, MillimetrePoint>>(new Map());
  const pointerInsideRef = useRef(false);
  const lastPreviewPartIdRef = useRef<string | undefined>(undefined);
  const highlightedPartIds = new Set(highlightIds);
  const target = solverPointToThreePoint(cameraTarget).map((coordinate) => coordinate * SCENE_MM_SCALE) as MillimetrePoint;

  function clearHoverPreview(): void {
    pointerInsideRef.current = false;
    hoverPreviewRef.current = { factor: 0 };
    if (lastPreviewPartIdRef.current !== undefined) {
      lastPreviewPartIdRef.current = undefined;
      onHover?.(undefined);
    }
  }

  return (
    <Canvas
      key={resetViewKey}
      camera={{ position: [4, 3, 5], fov: 45 }}
      shadows
      onPointerMove={() => { pointerInsideRef.current = true; }}
      onPointerLeave={clearHoverPreview}
      onPointerMissed={() => onSelect(undefined)}
    >
      <color attach="background" args={["#fffdf5"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
      <HoverPreviewTracker
        parts={parts}
        selectedPartId={selectedPartId}
        disassembleOnHover={disassembleOnHover}
        selectEnclosures={selectEnclosures}
        pointerInsideRef={pointerInsideRef}
        hoverPreviewRef={hoverPreviewRef}
        lastPreviewPartIdRef={lastPreviewPartIdRef}
        onHover={onHover}
      />
      <group scale={SCENE_MM_SCALE}>
        {parts.map((part) => (
          <FixturePart
            key={part.id}
            part={part}
            highlighted={highlightedPartIds.has(part.id)}
            dimmed={selectedPartId !== undefined && part.id !== selectedPartId}
            selectedFocusCenter={selectedFocusCenter}
            sceneCenter={centroid}
            partsById={partsById}
            hoverPreviewRef={hoverPreviewRef}
            visualPartPositionsRef={visualPartPositionsRef}
            selectable={isPartSelectable(part, selectEnclosures)}
            onSelect={onSelect}
          />
        ))}
        {routes.map((route) => (
          <SchematicRoute
            key={route.id}
            route={route}
            partsById={partsById}
            visualPartPositionsRef={visualPartPositionsRef}
            disassembled={selectedPartId !== undefined || hoveredPartId !== undefined}
          />
        ))}
      </group>
      <OrbitControls enablePan enableRotate enableZoom target={target} />
    </Canvas>
  );
}
